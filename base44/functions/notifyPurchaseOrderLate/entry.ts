import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().split('T')[0];

    const pos = await base44.asServiceRole.entities.PurchaseOrder.list();
    const latePOs = pos.filter(po =>
      ['sent', 'confirmed'].includes(po.status) &&
      po.expected_delivery_date &&
      po.expected_delivery_date < today
    );

    let notified = 0;
    const users = await base44.asServiceRole.entities.User.list();
    const buyers = users.filter(u => u.role === 'inkopare' || u.role === 'ivan');

    for (const po of latePOs) {
      for (const buyer of buyers) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: buyer.email,
          title: '🚨 Försenad inköpsorder',
          message: `PO ${po.po_number || po.id} (${po.supplier_name}) förväntades ${po.expected_delivery_date} men är fortfarande i status "${po.status}".`,
          type: 'error',
          priority: 'high',
          link_page: 'PurchaseOrders',
          link_to: po.id,
          is_read: false
        }).catch(() => {});
        notified++;
      }
    }

    return Response.json({ latePOs: latePOs.length, notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});