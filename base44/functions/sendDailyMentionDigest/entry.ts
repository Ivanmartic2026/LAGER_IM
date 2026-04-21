import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Daily mention digest — sends email to users with unread @mentions who have no active push subscription
// Schedule: Daily at 08:00 UTC via Base44 automation (automation_type="scheduled")
// Can also be triggered manually via POST (admin only)

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (service role) and manual admin trigger
    let isScheduled = false;
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_e) {
      // If auth fails, assume it's a scheduled call (no user context)
      isScheduled = true;
    }

    const startTime = Date.now();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch all unread chat_mention notifications from last 24h
    const allNotifications = await base44.asServiceRole.entities.Notification.filter(
      { type: 'chat_mention', is_read: false },
      '-created_date',
      500
    );

    const recent = allNotifications.filter(n => n.created_date >= since24h);

    if (recent.length === 0) {
      await base44.asServiceRole.entities.SyncLog.create({
        sync_type: 'daily_mention_digest',
        status: 'success',
        direction: 'internal',
        records_processed: 0,
        records_skipped: 0,
        duration_ms: Date.now() - startTime,
        details: { message: 'Inga olästa omnämnanden de senaste 24h' },
        triggered_by: isScheduled ? 'system' : 'manual'
      });
      return Response.json({ success: true, emails_sent: 0, skipped: 0 });
    }

    // 2. Group by user_email
    const byUser = {};
    for (const n of recent) {
      if (!byUser[n.user_email]) byUser[n.user_email] = [];
      byUser[n.user_email].push(n);
    }

    // 3. Fetch all active push subscriptions to know who has push enabled
    const allSubs = await base44.asServiceRole.entities.PushSubscription.list('-created_date', 1000).catch(() => []);
    const usersWithActivePush = new Set(allSubs.map(s => s.user_email));

    let emailsSent = 0;
    let skipped = 0;

    for (const [email, notifications] of Object.entries(byUser)) {
      // Skip users with active push subscription — they already got push notified
      if (usersWithActivePush.has(email)) {
        skipped++;
        continue;
      }

      const count = notifications.length;

      // Build email body
      const itemsHtml = notifications.slice(0, 10).map(n => {
        const preview = (n.message || '').substring(0, 60);
        const link = n.link_to ? `https://lager.imvision.se/WorkOrders/${n.link_to}` : 'https://lager.imvision.se/WorkOrders';
        return `
          <tr>
            <td style="padding:12px 0; border-bottom:1px solid #222;">
              <p style="margin:0 0 4px; color:#fff; font-size:14px;">${n.title || 'Nytt omnämnande'}</p>
              <p style="margin:0 0 6px; color:#aaa; font-size:13px;">${preview}${preview.length >= 60 ? '...' : ''}</p>
              <a href="${link}" style="color:#6300FF; font-size:12px; text-decoration:none;">Öppna i Lager AI →</a>
            </td>
          </tr>
        `;
      }).join('');

      const moreLine = count > 10 ? `<p style="color:#aaa; font-size:13px; margin-top:12px;">...och ${count - 10} till.</p>` : '';

      const body = `
        <div style="background:#000; color:#fff; font-family:Roboto,sans-serif; max-width:600px; margin:0 auto; padding:32px 24px;">
          <h1 style="font-family:'Ropa Sans',sans-serif; font-size:24px; text-transform:uppercase; letter-spacing:0.05em; color:#fff; margin:0 0 8px;">Lager AI</h1>
          <p style="color:#aaa; font-size:14px; margin:0 0 24px;">IMvision</p>

          <h2 style="font-size:20px; font-weight:600; margin:0 0 8px;">Du har ${count} olästa omnämnanden</h2>
          <p style="color:#aaa; font-size:14px; margin:0 0 24px;">Dessa kom de senaste 24 timmarna och har inte lästs ännu.</p>

          <table style="width:100%; border-collapse:collapse;">
            ${itemsHtml}
          </table>
          ${moreLine}

          <div style="margin-top:32px;">
            <a href="https://lager.imvision.se/WorkOrders" style="background:#6300FF; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600; display:inline-block;">
              Öppna i Lager AI
            </a>
          </div>

          <p style="color:#555; font-size:12px; margin-top:32px;">
            Du får det här mailet för att du inte har push-notiser aktiverade. 
            <a href="https://lager.imvision.se/PWASetup" style="color:#6300FF;">Aktivera push-notiser</a> för att sluta få dagliga mailsammanfattningar.
          </p>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `Du har ${count} oläst${count === 1 ? '' : 'a'} omnämnanden i Lager AI`,
        body
      });

      emailsSent++;
    }

    const duration = Date.now() - startTime;

    await base44.asServiceRole.entities.SyncLog.create({
      sync_type: 'daily_mention_digest',
      status: 'success',
      direction: 'internal',
      records_processed: recent.length,
      records_created: emailsSent,
      records_skipped: skipped,
      duration_ms: duration,
      details: {
        users_notified: emailsSent,
        users_skipped_has_push: skipped,
        notifications_processed: recent.length
      },
      triggered_by: isScheduled ? 'system' : 'manual'
    });

    return Response.json({
      success: true,
      emails_sent: emailsSent,
      skipped_push_users: skipped,
      notifications_processed: recent.length,
      duration_ms: duration
    });

  } catch (error) {
    console.error('sendDailyMentionDigest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});