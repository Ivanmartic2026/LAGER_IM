import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { queue_entry_id } = await req.json();

    const queueEntry = await base44.asServiceRole.entities.MergeApprovalQueue.get(queue_entry_id);
    if (!queueEntry.merge_executed) {
      return Response.json({ error: 'Merge not executed for this queue entry' }, { status: 400 });
    }

    const snapshot = queueEntry.rollback_snapshot;
    if (!snapshot) {
      return Response.json({ error: 'No rollback snapshot available' }, { status: 400 });
    }

    let recordsRestored = 0;

    // Återskapa alla kandidat-poster
    for (const [id, post] of Object.entries(snapshot.candidates)) {
      const postWithoutId = { ...post };
      delete postWithoutId.id;
      delete postWithoutId.created_date;
      delete postWithoutId.updated_date;
      delete postWithoutId.created_by;

      // Försök uppdatera först
      try {
        await base44.asServiceRole.entities[snapshot.entity].update(id, postWithoutId);
      } catch (e) {
        // Om post inte finns, skapa den
        try {
          await base44.asServiceRole.entities[snapshot.entity].create(postWithoutId);
        } catch (e2) {
          console.error(`Failed to restore ${snapshot.entity} ${id}:`, e2.message);
        }
      }
      recordsRestored++;
    }

    // Återställ alla références
    for (const [refId, refData] of Object.entries(snapshot.references)) {
      const { type, ...dataWithoutId } = refData;
      delete dataWithoutId.id;
      delete dataWithoutId.created_date;
      delete dataWithoutId.updated_date;
      delete dataWithoutId.created_by;

      try {
        await base44.asServiceRole.entities[type].update(refId, dataWithoutId);
        recordsRestored++;
      } catch (e) {
        console.error(`Failed to restore reference ${type} ${refId}:`, e.message);
      }
    }

    // Uppdatera queue-entry
    await base44.asServiceRole.entities.MergeApprovalQueue.update(queue_entry_id, {
      status: 'pending_review',
      merge_executed: false,
      merge_executed_at: null
    });

    return Response.json({
      rollback_completed: true,
      records_restored: recordsRestored
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});