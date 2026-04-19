import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can generate/view VAPID keys
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check if VAPID keys already exist
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (vapidPublicKey && vapidPrivateKey) {
      return Response.json({
        message: 'VAPID keys already configured',
        public_key: vapidPublicKey.slice(0, 20) + '...',
        action: 'Use existing keys'
      });
    }

    // Generate new VAPID keys
    const vapidKeys = webpush.generateVAPIDKeys();

    return Response.json({
      message: 'VAPID keys generated. Set these environment variables:',
      public_key: vapidKeys.publicKey,
      private_key: vapidKeys.privateKey,
      action: 'Set in dashboard → Environment Variables'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});