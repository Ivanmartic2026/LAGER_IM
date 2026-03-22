import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data || !data.id) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Get all admin users to notify
    const users = await base44.asServiceRole.entities.User.list();
    const admins = users.filter(u => u.role === 'admin');

    // Create notification for each admin
    const notifications = await Promise.all(
      admins.map(admin =>
        base44.asServiceRole.entities.Notification.create({
          user_email: admin.email,
          title: 'Ny order skapad',
          message: `Order ${data.order_number || data.customer_name} har skapats och väntar på behandling.`,
          type: 'order_status',
          priority: data.priority === 'urgent' ? 'high' : 'normal',
          link_to: data.id,
          link_page: 'Orders',
          metadata: {
            order_id: data.id,
            customer_name: data.customer_name,
            status: data.status
          }
        })
      )
    );

    return Response.json({
      success: true,
      notifications_sent: notifications.length
    });

  } catch (error) {
    console.error('Error in notifyOrderCreated:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});