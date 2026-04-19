import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const specificWoId = body.work_order_id || null;

    let workOrders;
    if (specificWoId) {
      const wo = await base44.asServiceRole.entities.WorkOrder.get(specificWoId);
      workOrders = wo ? [wo] : [];
    } else {
      workOrders = await base44.asServiceRole.entities.WorkOrder.filter({ all_materials_ready: false });
    }

    const shortageWOs = workOrders.filter(wo => {
      const missing = (wo.materials_needed || []).some(m => (m.missing || 0) > 0);
      return missing && !['klar', 'avbruten'].includes(wo.status);
    });

    let notified = 0;
    const users = await base44.asServiceRole.entities.User.list();
    const lager = users.filter(u => u.role === 'lager' || u.role === 'konstruktor');

    for (const wo of shortageWOs) {
      const missingItems = (wo.materials_needed || []).filter(m => (m.missing || 0) > 0);
      const msg = `WorkOrder "${wo.name || wo.order_number}" saknar: ${missingItems.map(m => `${m.article_name} (${m.missing} st)`).join(', ')}`;

      for (const u of lager) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: u.email,
          title: '📦 Materialbrist',
          message: msg,
          type: 'warning',
          priority: 'high',
          link_page: 'WorkOrders',
          link_to: wo.id,
          is_read: false
        }).catch(() => {});
        notified++;
      }
    }

    return Response.json({ shortageWOs: shortageWOs.length, notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});