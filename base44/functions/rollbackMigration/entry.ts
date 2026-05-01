import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { migration_run_id } = body;
    if (!migration_run_id) {
      return Response.json({ error: 'migration_run_id required' }, { status: 400 });
    }

    const runs = await base44.asServiceRole.entities.MigrationRun.filter({ id: migration_run_id });
    const run = runs[0];
    if (!run) return Response.json({ error: 'MigrationRun not found' }, { status: 404 });
    if (run.rolled_back) return Response.json({ error: 'Already rolled back' }, { status: 400 });
    if (!run.rollback_available) return Response.json({ error: 'Rollback not available' }, { status: 400 });

    const snapshot = run.rollback_snapshot || {};
    const output = run.output_summary || {};

    let restored = 0;
    let deleted = 0;

    // 1. Restore articles
    for (const [articleId, snap] of Object.entries(snapshot)) {
      await base44.asServiceRole.entities.Article.update(articleId, {
        batch_number: snap.batch_number || '',
        primary_batch_id: snap.primary_batch_id || null,
        legacy_batch_number: snap.legacy_batch_number || null
      }).catch(e => console.error('restore article', articleId, e.message));
      restored++;
    }

    // 2. Delete created Batch entities
    const createdBatchIds = output.created_batch_ids || [];
    for (const batchId of createdBatchIds) {
      await base44.asServiceRole.entities.Batch.delete(batchId).catch(() => {});
      deleted++;
    }

    // 3. Delete BatchEvents created during this run
    const createdEventIds = output.created_batch_event_ids || [];
    for (const evId of createdEventIds) {
      await base44.asServiceRole.entities.BatchEvent.delete(evId).catch(() => {});
    }

    // 4. Delete MergeApprovalQueue entries
    const createdQueueIds = output.created_queue_ids || [];
    for (const qId of createdQueueIds) {
      await base44.asServiceRole.entities.MergeApprovalQueue.delete(qId).catch(() => {});
    }

    // 5. Mark run as rolled back
    await base44.asServiceRole.entities.MigrationRun.update(migration_run_id, {
      rolled_back: true,
      rolled_back_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      records_restored: restored,
      records_deleted: deleted
    });

  } catch (error) {
    console.error('Rollback error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});