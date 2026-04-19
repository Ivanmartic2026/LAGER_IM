import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { repair_id, article_name, repair_status, technician_email } = await req.json();

    if (!technician_email) {
      return Response.json({ error: 'technician_email required' }, { status: 400 });
    }

    // Skicka push-notis
    try {
      await base44.functions.invoke('sendPushNotification', {
        user_email: technician_email,
        title: 'Reparation uppdaterad',
        message: `${article_name} — Status: ${repair_status}`,
        type: 'repair_update',
        priority: 'normal',
        link_page: '/Repairs',
        link_to: repair_id
      });
    } catch (e) {
      console.error('Push notification failed:', e.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});