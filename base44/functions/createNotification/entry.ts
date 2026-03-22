import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse incoming data
    const { 
      user_email, 
      title, 
      message, 
      type, 
      priority = 'normal',
      link_to,
      link_page,
      metadata 
    } = await req.json();

    // Validate required fields
    if (!user_email || !title || !message || !type) {
      return Response.json(
        { error: 'Missing required fields: user_email, title, message, type' },
        { status: 400 }
      );
    }

    // Create notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email,
      title,
      message,
      type,
      priority,
      is_read: false,
      link_to,
      link_page,
      metadata
    });

    // Try to send push notification if available
    try {
      await base44.asServiceRole.functions.invoke('sendPushNotification', {
        user_email,
        title,
        message,
        notification_id: notification.id
      });
    } catch (pushError) {
      console.log('Push notification failed:', pushError);
      // Continue even if push fails
    }

    return Response.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});