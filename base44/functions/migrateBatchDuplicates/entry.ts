import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    let groupsMerged = 0;
    let batchesRemoved = 0;
    const articlesUpdated = [];

    // Get all batches
    const allBatches = await base44.asServiceRole.entities.Batch.list('-updated_date', 1000);

    // Group by normalized batch_number
    const groups = {};
    for (const batch of allBatches) {
      const key = (batch.batch_number || '').toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(batch);
    }

    // Process duplicates
    for (const [batchNum, batchGroup] of Object.entries(groups)) {
      if (batchGroup.length <= 1) continue;

      // Multiple batches with same batch_number but different article_id
      const distinct = new Set(batchGroup.map(b => b.article_id));
      if (distinct.size <= 1) continue; // Same article, not a cross-article duplicate

      // Calculate coupling_count for each batch
      const batchCoupling = {};
      for (const batch of batchGroup) {
        let count = 0;

        // Count PurchaseOrderItem refs
        const poItems = await base44.asServiceRole.entities.PurchaseOrderItem.filter({}, '-updated_date', 1000);
        for (const pi of poItems) {
          if (pi.article_id === batch.article_id && normalizeBatchNumber(pi.article_batch_number || pi.batch_number) === batchNum) {
            count++;
          }
        }

        // Count ReceivingRecord refs
        const receiving = await base44.asServiceRole.entities.ReceivingRecord.filter({}, '-updated_date', 1000);
        for (const r of receiving) {
          if ((r.batch_ids || []).includes(batch.id)) {
            count++;
          }
        }

        // Count RepairLog refs
        const repairs = await base44.asServiceRole.entities.RepairLog.filter({}, '-updated_date', 1000);
        for (const rp of repairs) {
          if (rp.batch_id === batch.id) {
            count++;
          }
        }

        // Count LabelScan refs
        const scans = await base44.asServiceRole.entities.LabelScan.filter({
          batch_id: batch.id
        }, '-updated_date', 1000);
        count += scans.length;

        batchCoupling[batch.id] = count;
      }

      // Select winner (highest coupling_count, oldest if tie)
      let winner = batchGroup[0];
      for (const batch of batchGroup) {
        if ((batchCoupling[batch.id] || 0) > (batchCoupling[winner.id] || 0)) {
          winner = batch;
        } else if ((batchCoupling[batch.id] || 0) === (batchCoupling[winner.id] || 0)) {
          if (new Date(batch.created_date) < new Date(winner.created_date)) {
            winner = batch;
          }
        }
      }

      // Merge losers into winner
      const losers = batchGroup.filter(b => b.id !== winner.id);
      const mergedIds = winner.merged_from_batch_ids || [];

      for (const loser of losers) {
        // Move LabelScans
        const loserScans = await base44.asServiceRole.entities.LabelScan.filter({
          batch_id: loser.id
        }, '-updated_date', 1000);
        for (const scan of loserScans) {
          await base44.asServiceRole.entities.LabelScan.update(scan.id, {
            batch_id: winner.id
          });
        }

        // Move BatchAnalysis
        const loserAnalysis = await base44.asServiceRole.entities.BatchAnalysis.filter({
          batch_id: loser.id
        }, '-updated_date', 1000);
        for (const analysis of loserAnalysis) {
          await base44.asServiceRole.entities.BatchAnalysis.update(analysis.id, {
            batch_id: winner.id
          });
        }

        // Update PurchaseOrderItem supplier_batch_numbers
        const poItems = await base44.asServiceRole.entities.PurchaseOrderItem.filter({}, '-updated_date', 1000);
        for (const pi of poItems) {
          if (pi.article_id === loser.article_id && (pi.supplier_batch_numbers || []).some(s => s.batch_id === loser.id)) {
            const updated = (pi.supplier_batch_numbers || []).map(s =>
              s.batch_id === loser.id ? { ...s, batch_id: winner.id } : s
            );
            await base44.asServiceRole.entities.PurchaseOrderItem.update(pi.id, {
              supplier_batch_numbers: updated
            });
          }
        }

        // Update Article.primary_batch_id
        const loserArticles = await base44.asServiceRole.entities.Article.filter({
          primary_batch_id: loser.id
        }, '-updated_date', 100);
        for (const article of loserArticles) {
          await base44.asServiceRole.entities.Article.update(article.id, {
            primary_batch_id: winner.id
          });
          articlesUpdated.push(article.id);
        }

        // Add to merged_from_batch_ids
        if (!mergedIds.includes(loser.id)) {
          mergedIds.push(loser.id);
        }

        // Update loser coupling_count on winner
        const loserCoupling = batchCoupling[loser.id] || 0;
        const winnerCoupling = batchCoupling[winner.id] || 0;

        // Delete loser batch
        await base44.asServiceRole.entities.Batch.delete(loser.id);
        batchesRemoved++;
      }

      // Update winner with merged_from list and recalculate coupling_count
      const winnerCoupling = (batchCoupling[winner.id] || 0) + losers.reduce((s, l) => s + (batchCoupling[l.id] || 0), 0);
      await base44.asServiceRole.entities.Batch.update(winner.id, {
        merged_from_batch_ids: mergedIds,
        coupling_count: winnerCoupling
      });

      groupsMerged++;
    }

    return Response.json({
      success: true,
      groups_merged: groupsMerged,
      batches_removed: batchesRemoved,
      articles_updated: Array.from(new Set(articlesUpdated))
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function normalizeBatchNumber(raw) {
  return (raw || '').toUpperCase().replace(/\s+/g, '').trim();
}