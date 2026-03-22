import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription, action } = await req.json();

    if (action === 'subscribe') {
      // Save push subscription
      const existing = await base44.entities.PushSubscription.filter({
        user_email: user.email,
        endpoint: subscription.endpoint
      }).catch(() => []);

      if (existing.length > 0) {
        await base44.entities.PushSubscription.update(existing[0].id, {
          keys: subscription.keys,
          user_agent: navigator?.userAgent || 'unknown',
          is_active: true
        });
      } else {
        await base44.entities.PushSubscription.create({
          user_email: user.email,
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          user_agent: navigator?.userAgent || 'unknown',
          is_active: true
        });
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Push setup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});