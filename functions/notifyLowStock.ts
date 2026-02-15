import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!data || !data.id) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Check if stock just went below minimum level
    const hasMinLevel = data.min_stock_level && data.min_stock_level > 0;
    const currentStock = data.stock_qty || 0;
    const previousStock = old_data?.stock_qty || 0;
    
    // Only notify if stock went below minimum (and wasn't already below)
    const nowBelowMin = hasMinLevel && currentStock < data.min_stock_level;
    const wasBelowMin = hasMinLevel && old_data && previousStock < data.min_stock_level;
    
    if (!nowBelowMin || wasBelowMin) {
      return Response.json({ success: true, notification_sent: false });
    }

    // Get all admin users
    const users = await base44.asServiceRole.entities.User.list();
    const admins = users.filter(u => u.role === 'admin');

    const priority = currentStock === 0 ? 'critical' : 'high';
    const title = currentStock === 0 ? 'Artikel slut i lager' : 'Lågt lagersaldo';
    const message = currentStock === 0
      ? `${data.name} är slut i lager. Minimum: ${data.min_stock_level} st.`
      : `${data.name} har lågt lagersaldo (${currentStock} st). Minimum: ${data.min_stock_level} st.`;

    // Create notifications
    const notifications = await Promise.all(
      admins.map(admin =>
        base44.asServiceRole.entities.Notification.create({
          user_email: admin.email,
          title,
          message,
          type: 'low_stock',
          priority,
          link_to: data.id,
          link_page: 'Inventory',
          metadata: {
            article_id: data.id,
            article_name: data.name,
            current_stock: currentStock,
            min_stock: data.min_stock_level
          }
        })
      )
    );

    return Response.json({
      success: true,
      notifications_sent: notifications.length
    });

  } catch (error) {
    console.error('Error in notifyLowStock:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});