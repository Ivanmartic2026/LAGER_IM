/**
 * sendPushToUser — internal service-role push sender.
 * Called from other backend functions (no user auth required).
 * Respects NotificationSettings opt-in/opt-out per user and type.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { user_email, title, message, link_page, link_to, type, priority } = await req.json();

    if (!user_email || !title) {
      return Response.json({ error: 'user_email and title are required' }, { status: 400 });
    }

    // Check NotificationSettings opt-in/opt-out
    try {
      const settings = await base44.asServiceRole.entities.NotificationSettings.filter({ user_email }, '-created_date', 1);
      if (settings.length > 0) {
        const s = settings[0];
        // If user has explicitly opted out of this type, skip push (but still create in-app notification)
        const typeKey = `push_${type || 'general'}`;
        if (s[typeKey] === false) {
          // Still create in-app notification record
          await base44.asServiceRole.entities.Notification.create({
            user_email, title, message, type: type || 'general',
            priority: priority || 'normal', is_read: false, link_page, link_to
          }).catch(() => {});
          return Response.json({ success: true, skipped: 'user_opt_out', sent: 0 });
        }
      }
    } catch (_e) {}

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('[sendPushToUser] VAPID keys not configured — creating in-app notification only');
      await base44.asServiceRole.entities.Notification.create({
        user_email, title, message, type: type || 'general',
        priority: priority || 'normal', is_read: false, link_page, link_to
      }).catch(() => {});
      return Response.json({ success: true, skipped: 'no_vapid', sent: 0 });
    }

    webpush.setVapidDetails('mailto:support@imvision.se', vapidPublicKey, vapidPrivateKey);

    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      user_email,
      is_active: true
    });

    const payload = JSON.stringify({
      title,
      message,
      link_page,
      link_to,
      type: type || 'general',
      priority: priority || 'normal'
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const sub of subscriptions) {
      try {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys?.p256dh || sub.key_p256dh || '',
            auth: sub.keys?.auth || sub.key_auth || ''
          }
        };
        console.log('[sendPushToUser] Sending to endpoint:', sub.endpoint?.substring(0, 60));
        await webpush.sendNotification(pushSub, payload);
        sentCount++;
      } catch (error) {
        console.error(`Push failed for endpoint:`, error.message);
        if (error.statusCode === 410 || error.statusCode === 404) {
          await base44.asServiceRole.entities.PushSubscription.update(sub.id, { is_active: false }).catch(() => {});
        }
        failedCount++;
      }
    }

    // Always create in-app notification record
    await base44.asServiceRole.entities.Notification.create({
      user_email, title, message, type: type || 'general',
      priority: priority || 'normal', is_read: false, link_page, link_to
    }).catch(() => {});

    return Response.json({ success: true, sent: sentCount, failed: failedCount, total: subscriptions.length });
  } catch (error) {
    console.error('sendPushToUser error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});