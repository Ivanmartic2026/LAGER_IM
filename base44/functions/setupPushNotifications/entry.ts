import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription, action } = await req.json();

    if (action === 'subscribe') {
      if (!subscription || !subscription.endpoint) {
        console.error('[setupPushNotifications] Missing endpoint', { subscription });
        return Response.json({ error: 'Missing endpoint in subscription' }, { status: 400 });
      }

      if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
        console.error('[setupPushNotifications] Missing keys', { keys: subscription.keys });
        return Response.json({ error: 'Missing encryption keys in subscription' }, { status: 400 });
      }

      const endpoint = subscription.endpoint;
      const keys = {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      };

      const existing = await base44.asServiceRole.entities.PushSubscription.filter({
        user_email: user.email,
        endpoint
      }).catch(() => []);

      if (existing.length > 0) {
        await base44.asServiceRole.entities.PushSubscription.update(existing[0].id, {
          keys,
          is_active: true,
          user_agent: req.headers.get('user-agent') || ''
        });
        console.log('[setupPushNotifications] Updated subscription for', user.email);
      } else {
        await base44.asServiceRole.entities.PushSubscription.create({
          user_email: user.email,
          endpoint: endpoint,
          keys,
          is_active: true,
          user_agent: req.headers.get('user-agent') || ''
        });
        console.log('[setupPushNotifications] Created new subscription for', user.email);
      }

      return Response.json({ success: true });
    }

    if (action === 'unsubscribe') {
      const existing = await base44.asServiceRole.entities.PushSubscription.filter({
        user_email: user.email,
        endpoint: subscription.endpoint
      }).catch(() => []);
      if (existing.length > 0) {
        await base44.asServiceRole.entities.PushSubscription.update(existing[0].id, { is_active: false });
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Push setup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});