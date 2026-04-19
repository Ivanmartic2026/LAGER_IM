import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { site_report_id, site_name, technician_name, project_lead_email } = await req.json();

    if (!project_lead_email) {
      return Response.json({ error: 'project_lead_email required' }, { status: 400 });
    }

    // Skicka push-notis
    try {
      await base44.functions.invoke('sendPushNotification', {
        user_email: project_lead_email,
        title: 'Site-rapport inlämnad',
        message: `${technician_name} har skickat in rapport från ${site_name}`,
        type: 'site_report',
        priority: 'normal',
        link_page: '/SiteReports',
        link_to: site_report_id
      });
    } catch (e) {
      console.error('Push notification failed:', e.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});