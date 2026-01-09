import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return Response.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Check if subscription already exists
    const existing = await base44.entities.PushSubscription.filter({
      user_email: user.email,
      endpoint: subscription.endpoint
    });

    if (existing.length > 0) {
      // Update existing
      await base44.entities.PushSubscription.update(existing[0].id, {
        keys: subscription.keys,
        user_agent: req.headers.get('user-agent') || '',
        is_active: true
      });
    } else {
      // Create new
      await base44.entities.PushSubscription.create({
        user_email: user.email,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user_agent: req.headers.get('user-agent') || '',
        is_active: true
      });
    }

    return Response.json({ 
      success: true,
      message: 'Push subscription saved'
    });

  } catch (error) {
    console.error('Subscribe error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});