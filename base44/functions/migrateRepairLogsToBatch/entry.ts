import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    let updatedCount = 0;
    let createdBatchCount = 0;

    const repairLogs = await base44.asServiceRole.entities.RepairLog.list('-updated_date', 500);

    for (const log of repairLogs) {
      if (log.batch_id) continue; // Already has batch_id

      const batchNum = log.article_batch_number || log.batch_number;
      if (!batchNum) continue;

      // Find batch
      const existingBatches = await base44.asServiceRole.entities.Batch.filter({
        article_id: log.article_id,
        batch_number: normalizeBatchNumber(batchNum)
      }, '-updated_date', 1);

      let batch = existingBatches.length > 0 ? existingBatches[0] : null;

      if (!batch) {
        // Create new batch
        batch = await base44.asServiceRole.entities.Batch.create({
          article_id: log.article_id,
          batch_number: normalizeBatchNumber(batchNum),
          raw_batch_number: batchNum,
          status: 'pending_verification',
          source_context: 'migrated_from_repairlog'
        });
        createdBatchCount++;
      }

      // Update repairlog
      await base44.asServiceRole.entities.RepairLog.update(log.id, {
        batch_id: batch.id
      });

      updatedCount++;
    }

    return Response.json({
      success: true,
      updated_count: updatedCount,
      created_batch_count: createdBatchCount
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function normalizeBatchNumber(raw) {
  return (raw || '').toUpperCase().replace(/\s+/g, '').trim();
}