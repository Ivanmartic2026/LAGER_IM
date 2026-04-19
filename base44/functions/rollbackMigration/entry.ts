import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { migration_run_id } = await req.json();

    const migrationRun = await base44.asServiceRole.entities.MigrationRun.get(migration_run_id);
    if (!migrationRun.rollback_available) {
      return Response.json({ error: 'Rollback not available for this migration' }, { status: 400 });
    }

    if (migrationRun.rolled_back) {
      return Response.json({ error: 'Migration already rolled back' }, { status: 400 });
    }

    const snapshot = migrationRun.rollback_snapshot;
    if (!snapshot) {
      return Response.json({ error: 'No rollback snapshot available' }, { status: 400 });
    }

    let recordsRestored = 0;
    let recordsDeleted = 0;

    // Återskapa modified-poster från snapshot
    for (const [id, post] of Object.entries(snapshot.modified_records || {})) {
      const { entity, data } = post;
      const dataWithoutId = { ...data };
      delete dataWithoutId.id;
      delete dataWithoutId.created_date;
      delete dataWithoutId.updated_date;
      delete dataWithoutId.created_by;

      try {
        await base44.asServiceRole.entities[entity].update(id, dataWithoutId);
        recordsRestored++;
      } catch (e) {
        console.error(`Failed to restore ${entity} ${id}:`, e.message);
      }
    }

    // Radera newly-created poster
    for (const createdRecord of snapshot.created_records || []) {
      const { entity, id } = createdRecord;
      try {
        await base44.asServiceRole.entities[entity].delete(id);
        recordsDeleted++;
      } catch (e) {
        console.error(`Failed to delete ${entity} ${id}:`, e.message);
      }
    }

    // Uppdatera MigrationRun
    await base44.asServiceRole.entities.MigrationRun.update(migration_run_id, {
      rolled_back: true,
      rolled_back_at: new Date().toISOString()
    });

    return Response.json({
      rollback_completed: true,
      records_restored: recordsRestored,
      records_deleted: recordsDeleted
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});