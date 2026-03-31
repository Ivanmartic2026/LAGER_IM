import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Called from automation (entity event) or directly
    const orderId = payload?.order_id || payload?.data?.id || payload?.event?.entity_id;
    if (!orderId) {
      return Response.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Fetch the order
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if a WorkOrder already exists for this order
    const existing = await base44.asServiceRole.entities.WorkOrder.filter({ order_id: orderId });
    if (existing && existing.length > 0) {
      console.log(`WorkOrder already exists for order ${orderId}`);
      return Response.json({ success: true, workOrder: existing[0], created: false });
    }

    // Map order priority
    const priorityMap = { low: 'low', normal: 'normal', high: 'high', urgent: 'urgent' };
    const priority = priorityMap[order.priority] || 'normal';

    // Create the WorkOrder
    const workOrder = await base44.asServiceRole.entities.WorkOrder.create({
      order_id: orderId,
      order_number: order.order_number || '',
      customer_name: order.customer_name || '',
      delivery_date: order.delivery_date || null,
      current_stage: 'picking',
      status: 'pending',
      priority,
      picking_notes: order.notes || ''
    });

    console.log(`WorkOrder created: ${workOrder.id} for order ${orderId}`);
    return Response.json({ success: true, workOrder, created: true });

  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});