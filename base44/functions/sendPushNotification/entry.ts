import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_email, title, message, link_page, link_to, type, priority } = await req.json();

    // Only allow users to send to themselves, or admins to send to anyone
    if (user_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Hämta VAPID-nycklar
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return Response.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }

    webpush.setVapidDetails(
      'mailto:support@imvision.se',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Hämta alla aktiva push-subscriptions för användaren
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      user_email,
      is_active: true
    });

    const payload = JSON.stringify({
      title,
      message,
      link_page,
      link_to,
      type,
      priority
    });

    let sentCount = 0;
    let failedCount = 0;

    // Skicka till varje subscription
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.key_p256dh,
            auth: sub.key_auth
          }
        };

        await webpush.sendNotification(pushSubscription, payload);
        sentCount++;
      } catch (error) {
        console.error(`Push failed for ${sub.endpoint}:`, error.message);

        // Om endpoint returnerar 410/404, markera som inaktiv
        if (error.statusCode === 410 || error.statusCode === 404) {
          await base44.asServiceRole.entities.PushSubscription.update(sub.id, {
            is_active: false
          });
        }

        failedCount++;
      }
    }

    // Skapa Notification-post i databasen
    try {
      await base44.asServiceRole.entities.Notification.create({
        user_email,
        title,
        body: message,
        type,
        priority: priority || 'normal',
        is_read: false,
        link_page,
        link_to
      });
    } catch (e) {
      console.error('Failed to create notification record:', e.message);
    }

    return Response.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: subscriptions.length
    });
  } catch (error) {
    console.error('sendPushNotification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});