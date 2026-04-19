import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { batch_id } = await req.json();
    if (!batch_id) return Response.json({ error: 'batch_id krävs' }, { status: 400 });

    const batch = await base44.asServiceRole.entities.Batch.get(batch_id);
    if (!batch) return Response.json({ error: 'Batch hittades inte' }, { status: 404 });

    const users = await base44.asServiceRole.entities.User.list();
    const targets = users.filter(u => u.role === 'lager' || u.role === 'ivan');
    let notified = 0;

    for (const u of targets) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: u.email,
        title: '🚨 Batch placerad i karantän',
        message: `Batch ${batch.batch_number} (${batch.article_name || batch.article_sku || ''}) har placerats i karantän och kräver omedelbar åtgärd.`,
        type: 'error',
        priority: 'critical',
        link_page: 'BatchReview',
        link_to: batch_id,
        is_read: false
      }).catch(() => {});
      notified++;
    }

    return Response.json({ notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});