import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { po_id, po_number, supplier_name, approver_email, amount } = await req.json();

    if (!approver_email) {
      return Response.json({ error: 'approver_email required' }, { status: 400 });
    }

    // Skicka push-notis
    try {
      await base44.functions.invoke('sendPushNotification', {
        user_email: approver_email,
        title: 'PO behöver godkännande',
        message: `PO ${po_number} från ${supplier_name} (${amount} SEK) väntar på godkännande`,
        type: 'po_approval',
        priority: 'high',
        link_page: '/PurchaseOrders',
        link_to: po_id
      });
    } catch (e) {
      console.error('Push notification failed:', e.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});