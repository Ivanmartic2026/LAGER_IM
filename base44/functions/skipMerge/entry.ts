import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { queue_entry_id, notes } = await req.json();

    const queueEntry = await base44.asServiceRole.entities.MergeApprovalQueue.get(queue_entry_id);

    await base44.asServiceRole.entities.MergeApprovalQueue.update(queue_entry_id, {
      status: 'skipped',
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
      review_notes: notes
    });

    return Response.json({
      skipped: true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});