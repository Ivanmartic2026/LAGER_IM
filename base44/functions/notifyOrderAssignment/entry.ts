import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { order_id, assigned_to_email, order_number, customer_name } = await req.json();

    if (!assigned_to_email) {
      return Response.json({ error: 'assigned_to_email required' }, { status: 400 });
    }

    // Skicka push-notis
    try {
      await base44.functions.invoke('sendPushNotification', {
        user_email: assigned_to_email,
        title: 'Ny order tilldelad',
        message: `Order ${order_number} från ${customer_name} är tilldelad till dig`,
        type: 'order_assignment',
        priority: 'high',
        link_page: '/Orders',
        link_to: order_id
      });
    } catch (e) {
      console.error('Push notification failed:', e.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});