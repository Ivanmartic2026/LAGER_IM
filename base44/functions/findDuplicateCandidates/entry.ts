import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Hämta alla artiklar och batcher
    const articles = await base44.asServiceRole.entities.Article.list();
    const batches = await base44.asServiceRole.entities.Batch.list();

    // Gruppera artiklar efter normaliserat batch_number
    const articlesByBatchNumber = {};
    for (const article of articles) {
      const bn = article.batch_number?.trim().toUpperCase() || '';
      if (bn) {
        if (!articlesByBatchNumber[bn]) articlesByBatchNumber[bn] = [];
        articlesByBatchNumber[bn].push(article);
      }
    }

    // Gruppera batcher efter (article_id + batch_number)
    const batchesByCombo = {};
    for (const batch of batches) {
      const key = `${batch.article_id || 'null'}___${batch.batch_number || ''}`;
      if (!batchesByCombo[key]) batchesByCombo[key] = [];
      batchesByCombo[key].push(batch);
    }

    // Skapa MergeApprovalQueue-poster för artikel-dubletter
    const candidateGroups = [];
    const queueEntries = [];

    // Articles
    for (const [batchNum, articleGroup] of Object.entries(articlesByBatchNumber)) {
      if (articleGroup.length > 1) {
        const group = {
          similarity_key: batchNum,
          candidate_ids: articleGroup.map(a => a.id),
          candidate_entity: 'Article',
          queue_type: 'article_duplicate',
          articles: articleGroup
        };
        candidateGroups.push(group);
      }
    }

    // Batches
    for (const [, batchGroup] of Object.entries(batchesByCombo)) {
      if (batchGroup.length > 1) {
        const group = {
          similarity_key: batchGroup[0].batch_number,
          candidate_ids: batchGroup.map(b => b.id),
          candidate_entity: 'Batch',
          queue_type: 'batch_duplicate',
          batches: batchGroup
        };
        candidateGroups.push(group);
      }
    }

    // För varje grupp: beräkna coupling counts och fields_diff
    for (const group of candidateGroups) {
      const coupling_counts = {};
      const coupling_breakdown = {};
      const fields_diff = {};

      for (const id of group.candidate_ids) {
        coupling_counts[id] = 0;
        coupling_breakdown[id] = {
          po_items: 0,
          receiving: 0,
          repairs: 0,
          orders: 0,
          withdrawals: 0,
          site_images: 0,
          label_scans: 0,
          batches: 0
        };
      }

      if (group.candidate_entity === 'Article') {
        // Räkna PurchaseOrderItem
        try {
          const poItems = await base44.asServiceRole.entities.PurchaseOrderItem.filter({
            article_id: { '$in': group.candidate_ids }
          });
          for (const item of poItems) {
            coupling_breakdown[item.article_id].po_items += 1;
            coupling_counts[item.article_id] += 1;
          }
        } catch (e) {}

        // Räkna ReceivingRecord
        try {
          const receiving = await base44.asServiceRole.entities.ReceivingRecord.filter({
            article_id: { '$in': group.candidate_ids }
          });
          for (const rec of receiving) {
            coupling_breakdown[rec.article_id].receiving += 1;
            coupling_counts[rec.article_id] += 1;
          }
        } catch (e) {}

        // Räkna RepairLog
        try {
          const repairs = await base44.asServiceRole.entities.RepairLog.filter({
            article_id: { '$in': group.candidate_ids }
          });
          for (const rep of repairs) {
            coupling_breakdown[rep.article_id].repairs += 1;
            coupling_counts[rep.article_id] += 1;
          }
        } catch (e) {}

        // Räkna OrderItem
        try {
          const orderItems = await base44.asServiceRole.entities.OrderItem.filter({
            article_id: { '$in': group.candidate_ids }
          });
          for (const oi of orderItems) {
            coupling_breakdown[oi.article_id].orders += 1;
            coupling_counts[oi.article_id] += 1;
          }
        } catch (e) {}

        // Räkna InternalWithdrawal
        try {
          const withdrawals = await base44.asServiceRole.entities.InternalWithdrawal.filter({
            article_id: { '$in': group.candidate_ids }
          });
          for (const wdl of withdrawals) {
            coupling_breakdown[wdl.article_id].withdrawals += 1;
            coupling_counts[wdl.article_id] += 1;
          }
        } catch (e) {}

        // Räkna SiteReportImage
        try {
          const siteImages = await base44.asServiceRole.entities.SiteReportImage.filter({
            matched_article_id: { '$in': group.candidate_ids }
          });
          for (const si of siteImages) {
            coupling_breakdown[si.matched_article_id].site_images += 1;
            coupling_counts[si.matched_article_id] += 1;
          }
        } catch (e) {}

        // Räkna Batch
        try {
          const articleBatches = await base44.asServiceRole.entities.Batch.filter({
            article_id: { '$in': group.candidate_ids }
          });
          for (const b of articleBatches) {
            coupling_breakdown[b.article_id].batches += 1;
            coupling_counts[b.article_id] += 1;
          }
        } catch (e) {}

        // Fields diff för Articles
        const articles = group.articles;
        const fieldsToCompare = ['name', 'supplier_id', 'stock_qty', 'unit_cost', 'shelf_address', 'series', 'pitch_value'];
        for (const field of fieldsToCompare) {
          const values = {};
          for (const a of articles) {
            values[a.id] = a[field];
          }
          if (Object.values(values).some(v => v !== values[Object.keys(values)[0]])) {
            fields_diff[field] = values;
          }
        }

      } else if (group.candidate_entity === 'Batch') {
        // Räkna LabelScan
        try {
          const labelScans = await base44.asServiceRole.entities.LabelScan.filter({
            batch_id: { '$in': group.candidate_ids }
          });
          for (const ls of labelScans) {
            coupling_breakdown[ls.batch_id].label_scans += 1;
            coupling_counts[ls.batch_id] += 1;
          }
        } catch (e) {}

        // Fields diff för Batches
        const batches = group.batches;
        const fieldsToCompare = ['article_id', 'quantity', 'supplier_name', 'manufacturing_date'];
        for (const field of fieldsToCompare) {
          const values = {};
          for (const b of batches) {
            values[b.id] = b[field];
          }
          if (Object.values(values).some(v => v !== values[Object.keys(values)[0]])) {
            fields_diff[field] = values;
          }
        }
      }

      // Hitta vinnare-förslag (högst coupling count)
      let winnerSuggested = group.candidate_ids[0];
      let maxCount = coupling_counts[winnerSuggested];
      for (const id of group.candidate_ids) {
        if (coupling_counts[id] > maxCount) {
          winnerSuggested = id;
          maxCount = coupling_counts[id];
        }
      }

      // Skapa MergeApprovalQueue-post
      const queueEntry = await base44.asServiceRole.entities.MergeApprovalQueue.create({
        queue_type: group.queue_type,
        candidate_ids: group.candidate_ids,
        candidate_entity: group.candidate_entity,
        similarity_key: group.similarity_key,
        winner_suggested_id: winnerSuggested,
        coupling_counts,
        coupling_breakdown,
        fields_diff,
        status: 'pending_review'
      });

      queueEntries.push(queueEntry);
    }

    return Response.json({
      candidate_groups_found: candidateGroups.length,
      queue_entries_created: queueEntries.length,
      details: queueEntries.slice(0, 5) // Visa första 5
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});