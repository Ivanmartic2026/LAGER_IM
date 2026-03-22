import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!data || !data.id || !old_data) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Check if status changed
    const statusChanged = old_data.status !== data.status;
    if (!statusChanged) {
      // No notification needed for non-status changes
      return Response.json({ success: true, notification_sent: false });
    }

    // Get all admin users
    const users = await base44.asServiceRole.entities.User.list();
    const admins = users.filter(u => u.role === 'admin');

    // Create notification based on new status
    let title = 'Order uppdaterad';
    let message = '';
    let priority = 'normal';

    switch (data.status) {
      case 'ready_to_pick':
        title = 'Order klar för plockning';
        message = `Order ${data.order_number || data.customer_name} är redo att plockas.`;
        break;
      case 'picked':
        title = 'Order plockad';
        message = `Order ${data.order_number || data.customer_name} har plockats och är klar för produktion.`;
        break;
      case 'production_completed':
        title = 'Produktion klar';
        message = `Produktionen för ${data.order_number || data.customer_name} är klar.`;
        priority = 'high';
        break;
      case 'delivered':
        title = 'Order levererad';
        message = `Order ${data.order_number || data.customer_name} har levererats.`;
        break;
      default:
        message = `Order ${data.order_number || data.customer_name} status ändrad till ${data.status}.`;
    }

    // Create notifications
    const notifications = await Promise.all(
      admins.map(admin =>
        base44.asServiceRole.entities.Notification.create({
          user_email: admin.email,
          title,
          message,
          type: 'order_status',
          priority,
          link_to: data.id,
          link_page: 'Orders',
          metadata: {
            order_id: data.id,
            old_status: old_data.status,
            new_status: data.status,
            customer_name: data.customer_name
          }
        })
      )
    );

    return Response.json({
      success: true,
      notifications_sent: notifications.length
    });

  } catch (error) {
    console.error('Error in notifyOrderUpdated:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});