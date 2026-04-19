import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const batches = await base44.asServiceRole.entities.Batch.filter({ status: 'pending_verification' });
    const oldBatches = batches.filter(b => b.created_date < cutoff);

    if (!oldBatches.length) return Response.json({ pendingOld: 0, notified: 0 });

    const users = await base44.asServiceRole.entities.User.list();
    const lager = users.filter(u => u.role === 'lager' || u.role === 'ivan');
    let notified = 0;

    for (const u of lager) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: u.email,
        title: '🔍 Batcher väntar på verifiering',
        message: `${oldBatches.length} batcher har stått i "pending_verification" i mer än 24 timmar och behöver granskas.`,
        type: 'warning',
        priority: 'normal',
        link_page: 'BatchReview',
        link_to: null,
        is_read: false
      }).catch(() => {});
      notified++;
    }

    return Response.json({ pendingOld: oldBatches.length, notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});