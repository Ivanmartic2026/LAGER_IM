import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { work_order_id, new_status, new_phase, assigned_to_email, work_order_number } = await req.json();

    if (!assigned_to_email) {
      return Response.json({ error: 'assigned_to_email required' }, { status: 400 });
    }

    // Skicka push-notis
    try {
      await base44.functions.invoke('sendPushNotification', {
        user_email: assigned_to_email,
        title: `WorkOrder status uppdaterad`,
        message: `${work_order_number} är nu i fas: ${new_phase || new_status}`,
        type: 'workorder_status',
        priority: 'normal',
        link_page: '/WorkOrders',
        link_to: work_order_id
      });
    } catch (e) {
      console.error('Push notification failed:', e.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});