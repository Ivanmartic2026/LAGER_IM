import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workOrderId } = await req.json();

    if (!workOrderId) {
      return Response.json({ error: 'workOrderId saknas' }, { status: 400 });
    }

    // Use service role to fetch data without requiring auth in print views
    const [workOrders, tasks] = await Promise.all([
      base44.asServiceRole.entities.WorkOrder.filter({ id: workOrderId }),
      base44.asServiceRole.entities.Task.filter({ work_order_id: workOrderId }).catch(() => []),
    ]);

    const workOrder = workOrders[0];
    if (!workOrder) {
      return Response.json({ error: 'Arbetsorder hittades inte' }, { status: 404 });
    }

    const [orders, orderItems] = await Promise.all([
      workOrder.order_id
        ? base44.asServiceRole.entities.Order.filter({ id: workOrder.order_id })
        : Promise.resolve([]),
      workOrder.order_id
        ? base44.asServiceRole.entities.OrderItem.filter({ order_id: workOrder.order_id })
        : Promise.resolve([]),
    ]);

    return Response.json({
      workOrder,
      order: orders[0] || null,
      orderItems: orderItems || [],
      tasks: tasks || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});