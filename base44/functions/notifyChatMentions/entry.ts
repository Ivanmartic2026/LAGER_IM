import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { chatMessageId } = await req.json();

    if (!chatMessageId) {
      return Response.json({ error: 'Missing chatMessageId' }, { status: 400 });
    }

    // Fetch the chat message
    const chatMessage = await base44.asServiceRole.entities.ChatMessage.filter(
      { id: chatMessageId }
    ).then(msgs => msgs[0]);

    if (!chatMessage) {
      return Response.json({ error: 'ChatMessage not found' }, { status: 404 });
    }

    // Parse @mentions from content
    const mentionMatches = chatMessage.content?.match(/@(\S+)/g) || [];
    const mentionedEmails = mentionMatches.map(m => m.substring(1));

    // Collect recipient list
    const recipients = new Set();

    // Add @mentioned users
    for (const email of mentionedEmails) {
      recipients.add(email);
    }

    // Add DM partner if this is a DM (1-on-1 chat)
    if (chatMessage.is_direct_message && chatMessage.recipient_email) {
      recipients.add(chatMessage.recipient_email);
    }

    // Add thread subscribers
    if (chatMessage.thread_id) {
      const reads = await base44.asServiceRole.entities.ChatRead.filter(
        { thread_id: chatMessage.thread_id }
      ).catch(() => []);
      for (const read of reads) {
        if (read.user_email !== chatMessage.created_by) {
          recipients.add(read.user_email);
        }
      }
    }

    // Get NotificationSettings for each recipient + check quiet hours
    const now = new Date();
    const currentHour = now.getHours();

    const pushedRecipients = [];

    for (const recipientEmail of recipients) {
      // Check quiet hours
      const settings = await base44.asServiceRole.entities.NotificationSettings.filter(
        { user_email: recipientEmail }
      ).then(s => s[0]);

      if (settings?.quiet_hours_enabled) {
        const [startStr, endStr] = [
          settings.quiet_hours_start || '22:00',
          settings.quiet_hours_end || '06:00'
        ];
        const [startHour] = startStr.split(':').map(Number);
        const [endHour] = endStr.split(':').map(Number);

        // Handle wrap-around (e.g., 22:00-06:00)
        let isQuietHours = false;
        if (startHour > endHour) {
          isQuietHours = currentHour >= startHour || currentHour < endHour;
        } else {
          isQuietHours = currentHour >= startHour && currentHour < endHour;
        }

        if (isQuietHours) {
          console.log(`[notifyChatMentions] ${recipientEmail} in quiet hours, skipping push`);
          continue;
        }
      }

      // Check notification type preference
      const chatNotificationsEnabled = settings?.chat_mentions_push ?? true;
      if (!chatNotificationsEnabled) {
        console.log(`[notifyChatMentions] ${recipientEmail} has chat push disabled`);
        continue;
      }

      // Get all active push subscriptions for this user
      const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
        user_email: recipientEmail,
        is_active: true
      }).catch(() => []);

      if (subscriptions.length === 0) {
        console.log(`[notifyChatMentions] No active subscriptions for ${recipientEmail}`);
        continue;
      }

      // Prepare push payload
      const pushPayload = {
        title: `Omnämnande från ${chatMessage.created_by}`,
        body: chatMessage.content?.substring(0, 100) || 'Du har ett nytt meddelande',
        icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png',
        badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png',
        tag: `chat-${chatMessage.thread_id || 'dm'}`,
        workOrderId: chatMessage.context_work_order_id,
        chatThreadId: chatMessage.thread_id
      };

      // Send to each subscription
      for (const sub of subscriptions) {
        try {
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'TTL': '86400'
            },
            body: JSON.stringify(pushPayload)
          });

          if (response.status === 410 || response.status === 404) {
            // Subscription is invalid, mark as inactive
            await base44.asServiceRole.entities.PushSubscription.update(sub.id, {
              is_active: false
            });
            console.log(`[notifyChatMentions] Marked subscription ${sub.id} as inactive (${response.status})`);
          } else if (response.ok) {
            pushedRecipients.push(recipientEmail);
            console.log(`[notifyChatMentions] Push sent to ${recipientEmail}`);
          }
        } catch (err) {
          console.error(`[notifyChatMentions] Push to ${recipientEmail} failed:`, err.message);
        }
      }

      // Create in-app notification record
      await base44.asServiceRole.entities.Notification.create({
        user_email: recipientEmail,
        title: `Omnämnande från ${chatMessage.created_by}`,
        message: chatMessage.content?.substring(0, 100) || 'Du har ett nytt meddelande',
        type: 'chat_mention',
        priority: 'normal',
        is_read: false,
        link_page: 'WorkOrders',
        link_to: chatMessage.context_work_order_id,
        metadata: {
          chatThreadId: chatMessage.thread_id,
          from: chatMessage.created_by
        }
      }).catch(err => console.error('[notifyChatMentions] Failed to create in-app notification:', err.message));
    }

    return Response.json({
      success: true,
      pushedCount: pushedRecipients.length,
      recipients: pushedRecipients
    });
  } catch (error) {
    console.error('[notifyChatMentions] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});