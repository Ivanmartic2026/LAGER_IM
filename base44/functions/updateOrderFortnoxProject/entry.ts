import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customer_name, fortnox_project_number, fortnox_project_name } = await req.json();

    // Find order by customer_name
    const orders = await base44.entities.Order.filter({ customer_name });
    
    if (!orders || orders.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Update with fortnox_project_number and project_name
    const updateData = { fortnox_project_number };
    if (fortnox_project_name) {
      updateData.fortnox_project_name = fortnox_project_name;
    }
    await base44.entities.Order.update(order.id, updateData);

    return Response.json({ 
      success: true, 
      orderId: order.id,
      message: `Order updated with Fortnox project number ${fortnox_project_number}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});