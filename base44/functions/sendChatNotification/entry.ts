import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message_id, work_order_id, order_number, work_order_name, author_name, body, mentions } = await req.json();

    if (!work_order_id || !message_id) {
      return Response.json({ error: 'work_order_id and message_id required' }, { status: 400 });
    }

    const shortBody = body ? body.slice(0, 60) + (body.length > 60 ? '…' : '') : '';
    const notifTitle = `Lager AI — Order #${order_number || ''} "${work_order_name || ''}"`;
    const deepLink = `/WorkOrders/${work_order_id}?tab=chat`;

    const now = new Date();
    const hourUTC = now.getUTCHours();

    // Helper: check quiet hours (UTC-based, default 22-06)
    const isQuietHours = (settings) => {
      if (!settings?.quiet_hours_enabled) return false;
      const start = parseInt((settings.quiet_hours_start || '22:00').split(':')[0]);
      const end = parseInt((settings.quiet_hours_end || '06:00').split(':')[0]);
      if (start > end) {
        // Wraps midnight
        return hourUTC >= start || hourUTC < end;
      }
      return hourUTC >= start && hourUTC < end;
    };

    const notified = new Set();

    // 1. Notify @mentions
    for (const mentionEmail of (mentions || [])) {
      if (mentionEmail === user.email) continue;
      if (notified.has(mentionEmail)) continue;
      notified.add(mentionEmail);

      // Create in-app notification
      await base44.asServiceRole.entities.Notification.create({
        user_email: mentionEmail,
        title: notifTitle,
        message: `${author_name}: ${shortBody}`,
        type: 'chat_mention',
        priority: 'high',
        is_read: false,
        link_to: work_order_id,
        link_page: `WorkOrders/${work_order_id}`,
        metadata: { work_order_id, message_id, tab: 'chat' }
      });

      // Get user's notification settings
      const settingsList = await base44.asServiceRole.entities.NotificationSettings.filter({ user_email: mentionEmail });
      const settings = settingsList[0];
      if (settings?.chat_mentions_push === false) continue;
      if (isQuietHours(settings)) continue;

      // Send push
      const subs = await base44.asServiceRole.entities.PushSubscription.filter({ user_email: mentionEmail, is_active: true });
      for (const sub of subs) {
        await base44.asServiceRole.functions.invoke('sendPushToUser', {
          subscription: { endpoint: sub.endpoint, keys: sub.keys },
          title: notifTitle,
          body: `@omnämnande: ${author_name}: ${shortBody}`,
          url: deepLink,
          tag: `chat_${work_order_id}`
        }).catch(() => {});
      }
    }

    return Response.json({ success: true, notified: notified.size });
  } catch (error) {
    console.error('sendChatNotification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});