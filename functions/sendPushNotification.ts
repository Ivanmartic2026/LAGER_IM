import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userEmail, title, body, data } = await req.json();

    if (!title || !body) {
      return Response.json({ error: 'Title and body required' }, { status: 400 });
    }

    // Get subscriptions for user (or all if no userEmail specified)
    const filter = userEmail ? { user_email: userEmail, is_active: true } : { is_active: true };
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter(filter);

    if (subscriptions.length === 0) {
      return Response.json({ 
        success: true,
        message: 'No active subscriptions found',
        sent: 0
      });
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return Response.json({ 
        error: 'VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in environment variables.'
      }, { status: 500 });
    }

    // Import web-push library
    const webPush = await import('npm:web-push@3.6.7');
    
    webPush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      data: data || {}
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys
          },
          payload
        );
        sent++;
      } catch (error) {
        console.error('Failed to send to:', sub.endpoint, error);
        failed++;
        
        // If subscription is invalid, mark as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          await base44.asServiceRole.entities.PushSubscription.update(sub.id, {
            is_active: false
          });
        }
      }
    }

    return Response.json({ 
      success: true,
      sent,
      failed,
      total: subscriptions.length
    });

  } catch (error) {
    console.error('Send push error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});