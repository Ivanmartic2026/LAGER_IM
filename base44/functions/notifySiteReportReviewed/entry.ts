import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!data || !data.id || !old_data) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Only notify when status changes to reviewed/completed
    const statusChanged = old_data.status !== data.status;
    const isReviewed = data.status === 'completed' || data.status === 'in_review';
    
    if (!statusChanged || !isReviewed) {
      return Response.json({ success: true, notification_sent: false });
    }

    // Notify the technician who created the report
    if (!data.technician_email) {
      return Response.json({ 
        success: false, 
        error: 'No technician email found' 
      });
    }

    const title = data.status === 'completed' 
      ? 'Site-rapport godkänd' 
      : 'Site-rapport granskas';
    
    const message = data.status === 'completed'
      ? `Din site-rapport för ${data.site_name} har granskats och godkänts.`
      : `Din site-rapport för ${data.site_name} granskas av ${data.reviewed_by || 'lagerchefen'}.`;

    await base44.asServiceRole.entities.Notification.create({
      user_email: data.technician_email,
      title,
      message,
      type: 'system',
      priority: 'normal',
      link_to: data.id,
      link_page: 'SiteReports',
      metadata: {
        site_report_id: data.id,
        site_name: data.site_name,
        reviewed_by: data.reviewed_by,
        status: data.status
      }
    });

    return Response.json({
      success: true,
      notification_sent: true
    });

  } catch (error) {
    console.error('Error in notifySiteReportReviewed:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});