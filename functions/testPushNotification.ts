import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a test notification
    const notification = await base44.entities.Notification.create({
      user_email: user.email,
      title: '🧪 Test Notification',
      message: `This is a test notification from ${new Date().toLocaleTimeString()}`,
      type: 'system',
      priority: 'high',
      is_read: false,
      link_page: 'Admin',
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });

    console.log('[testPushNotification] Created test notification:', notification.id);

    return Response.json({
      success: true,
      message: 'Test notification created',
      notification_id: notification.id,
      details: {
        title: notification.title,
        message: notification.message,
        user_email: notification.user_email
      }
    });
  } catch (error) {
    console.error('[testPushNotification] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});