import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_email, title, message, type, priority, link_to, link_page, send_email } = await req.json();

    // Get user's notification settings
    const settingsList = await base44.asServiceRole.entities.NotificationSettings.filter({ user_email });
    const settings = settingsList[0] || { 
      in_app_enabled: true, 
      email_enabled: true,
      order_status_updates: true,
      low_stock_alerts: true,
      purchase_order_updates: true,
      repair_updates: true,
      critical_only: false
    };

    // Check if this type of notification is enabled
    const typeEnabled = {
      'order_status': settings.order_status_updates,
      'low_stock': settings.low_stock_alerts,
      'stock_alert': settings.low_stock_alerts,
      'repair_update': settings.repair_updates,
      'purchase_order': settings.purchase_order_updates,
      'system': true
    }[type];

    if (!typeEnabled && priority !== 'critical') {
      return Response.json({ success: true, skipped: true, reason: 'Notification type disabled' });
    }

    // Check critical only setting
    if (settings.critical_only && priority !== 'critical') {
      return Response.json({ success: true, skipped: true, reason: 'Only critical notifications enabled' });
    }

    // Create in-app notification if enabled
    if (settings.in_app_enabled) {
      await base44.asServiceRole.entities.Notification.create({
        user_email,
        title,
        message,
        type,
        priority: priority || 'normal',
        is_read: false,
        link_to,
        link_page
      });
    }

    // Send email if enabled and requested
    if (settings.email_enabled && send_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user_email,
        subject: `${priority === 'critical' ? '🔴 KRITISKT: ' : ''}${title}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">${title}</h2>
            <p style="font-size: 16px; line-height: 1.6;">${message}</p>
            ${link_to ? `<p><a href="${Deno.env.get('APP_URL') || 'https://app.base44.com'}/#/${link_page}?${link_page === 'Inventory' ? 'articleId' : link_page === 'Orders' ? 'orderId' : 'id'}=${link_to}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Visa detaljer</a></p>` : ''}
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">Detta är en automatisk notifiering från ditt lagersystem.</p>
          </div>
        `
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Send notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});