import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { queue_entry_id, winner_id, notes } = await req.json();

    // Ladda queue-entry
    const queueEntry = await base44.asServiceRole.entities.MergeApprovalQueue.get(queue_entry_id);
    if (queueEntry.status !== 'pending_review') {
      return Response.json({ error: 'Queue entry not in pending_review status' }, { status: 400 });
    }

    if (!queueEntry.candidate_ids.includes(winner_id)) {
      return Response.json({ error: 'Winner ID not in candidate list' }, { status: 400 });
    }

    const loserIds = queueEntry.candidate_ids.filter(id => id !== winner_id);

    // Skapa rollback_snapshot FÖRE merge
    const snapshot = {
      winner_id,
      loser_ids: loserIds,
      timestamp: new Date().toISOString(),
      entity: queueEntry.candidate_entity,
      queue_type: queueEntry.queue_type,
      candidates: {},
      references: {}
    };

    // Spara alla kandidat-poster
    for (const id of queueEntry.candidate_ids) {
      const post = await base44.asServiceRole.entities[queueEntry.candidate_entity].get(id);
      snapshot.candidates[id] = post;
    }

    let referencesUpdated = 0;

    if (queueEntry.candidate_entity === 'Article') {
      const winner = snapshot.candidates[winner_id];

      // Uppdatera PurchaseOrderItem
      const poItems = await base44.asServiceRole.entities.PurchaseOrderItem.filter({
        article_id: { '$in': loserIds }
      });
      for (const item of poItems) {
        snapshot.references[item.id] = { ...item, type: 'PurchaseOrderItem' };
        await base44.asServiceRole.entities.PurchaseOrderItem.update(item.id, {
          article_id: winner_id,
          article_name: winner.name,
          article_sku: winner.sku
        });
        referencesUpdated++;
      }

      // Uppdatera ReceivingRecord
      const receiving = await base44.asServiceRole.entities.ReceivingRecord.filter({
        article_id: { '$in': loserIds }
      });
      for (const rec of receiving) {
        snapshot.references[rec.id] = { ...rec, type: 'ReceivingRecord' };
        await base44.asServiceRole.entities.ReceivingRecord.update(rec.id, {
          article_id: winner_id,
          article_name: winner.name
        });
        referencesUpdated++;
      }

      // Uppdatera RepairLog
      const repairs = await base44.asServiceRole.entities.RepairLog.filter({
        article_id: { '$in': loserIds }
      });
      for (const rep of repairs) {
        snapshot.references[rep.id] = { ...rep, type: 'RepairLog' };
        await base44.asServiceRole.entities.RepairLog.update(rep.id, {
          article_id: winner_id,
          article_name: winner.name
        });
        referencesUpdated++;
      }

      // Uppdatera OrderItem
      const orderItems = await base44.asServiceRole.entities.OrderItem.filter({
        article_id: { '$in': loserIds }
      });
      for (const oi of orderItems) {
        snapshot.references[oi.id] = { ...oi, type: 'OrderItem' };
        await base44.asServiceRole.entities.OrderItem.update(oi.id, {
          article_id: winner_id
        });
        referencesUpdated++;
      }

      // Uppdatera InternalWithdrawal
      const withdrawals = await base44.asServiceRole.entities.InternalWithdrawal.filter({
        article_id: { '$in': loserIds }
      });
      for (const wdl of withdrawals) {
        snapshot.references[wdl.id] = { ...wdl, type: 'InternalWithdrawal' };
        await base44.asServiceRole.entities.InternalWithdrawal.update(wdl.id, {
          article_id: winner_id
        });
        referencesUpdated++;
      }

      // Uppdatera SiteReportImage
      const siteImages = await base44.asServiceRole.entities.SiteReportImage.filter({
        matched_article_id: { '$in': loserIds }
      });
      for (const si of siteImages) {
        snapshot.references[si.id] = { ...si, type: 'SiteReportImage' };
        await base44.asServiceRole.entities.SiteReportImage.update(si.id, {
          matched_article_id: winner_id
        });
        referencesUpdated++;
      }

      // Uppdatera Batch
      const articleBatches = await base44.asServiceRole.entities.Batch.filter({
        article_id: { '$in': loserIds }
      });
      for (const b of articleBatches) {
        snapshot.references[b.id] = { ...b, type: 'Batch' };
        await base44.asServiceRole.entities.Batch.update(b.id, {
          article_id: winner_id,
          article_sku: winner.sku,
          article_name: winner.name
        });
        referencesUpdated++;
      }

      // Slå ihop stock_qty
      const updatedWinner = {
        stock_qty: (winner.stock_qty || 0) + loserIds.reduce((sum, id) => {
          const loser = snapshot.candidates[id];
          return sum + (loser.stock_qty || 0);
        }, 0),
        shelf_address: [
          ...(winner.shelf_address || []),
          ...loserIds.flatMap(id => snapshot.candidates[id].shelf_address || [])
        ].filter((v, i, a) => a.indexOf(v) === i) // Union
      };

      await base44.asServiceRole.entities.Article.update(winner_id, updatedWinner);

      // Radera förluar-artiklar
      for (const loserId of loserIds) {
        await base44.asServiceRole.entities.Article.delete(loserId);
      }

    } else if (queueEntry.candidate_entity === 'Batch') {
      // Samma mönster för Batch
      const winner = snapshot.candidates[winner_id];

      const labelScans = await base44.asServiceRole.entities.LabelScan.filter({
        batch_id: { '$in': loserIds }
      });
      for (const ls of labelScans) {
        snapshot.references[ls.id] = { ...ls, type: 'LabelScan' };
        await base44.asServiceRole.entities.LabelScan.update(ls.id, {
          batch_id: winner_id
        });
        referencesUpdated++;
      }

      const batchAnalyses = await base44.asServiceRole.entities.BatchAnalysis.filter({
        batch_id: { '$in': loserIds }
      });
      for (const ba of batchAnalyses) {
        snapshot.references[ba.id] = { ...ba, type: 'BatchAnalysis' };
        await base44.asServiceRole.entities.BatchAnalysis.update(ba.id, {
          batch_id: winner_id
        });
        referencesUpdated++;
      }

      // Radera förluar-batcher
      for (const loserId of loserIds) {
        await base44.asServiceRole.entities.Batch.delete(loserId);
      }
    }

    // Uppdatera queue-entry
    await base44.asServiceRole.entities.MergeApprovalQueue.update(queue_entry_id, {
      status: 'approved_merge',
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
      merge_executed: true,
      merge_executed_at: new Date().toISOString(),
      rollback_snapshot: snapshot
    });

    return Response.json({
      merge_completed: true,
      references_updated: referencesUpdated,
      rollback_available: true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});