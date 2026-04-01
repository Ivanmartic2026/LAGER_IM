import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const FIELD_LABELS = {
  status: "Status",
  financial_status: "Ekonomisk status",
  priority: "Prioritet",
  delivery_date: "Leveransdatum",
  delivery_method: "Leveranssätt",
  shipping_company: "Speditör",
  tracking_number: "Spårningsnummer",
  notes: "Anteckningar",
  ordering_notes: "Beställningsanteckningar",
  needs_ordering: "Kräver beställning",
  ordering_completed: "Beställning klar",
  fortnox_invoiced: "Fakturerad i Fortnox",
  fortnox_invoice_number: "Fakturanummer",
  fortnox_project_number: "Projektnummer",
  picked_by: "Plockad av",
  is_incomplete: "Ofullständig",
};

const STATUS_LABELS = {
  draft: "Utkast",
  ready_to_pick: "Redo att plocka",
  picking: "Plockas",
  picked: "Plockad",
  in_production: "I produktion",
  production_completed: "Produktion klar",
  delivered: "Levererad",
  cancelled: "Avbokad",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { order_id, type, message, field_name, old_value, new_value, is_decision, decision_reason, file_url, file_name, metadata } = body;

    if (!order_id || !type || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let displayOldValue = old_value;
    let displayNewValue = new_value;
    if (field_name === 'status') {
      displayOldValue = STATUS_LABELS[old_value] || old_value;
      displayNewValue = STATUS_LABELS[new_value] || new_value;
    }

    const activity = await base44.entities.ProductionActivity.create({
      order_id,
      type,
      message,
      field_name: field_name || null,
      old_value: displayOldValue || null,
      new_value: displayNewValue || null,
      actor_email: user.email,
      actor_name: user.full_name || user.email,
      is_decision: is_decision || false,
      decision_reason: decision_reason || null,
      file_url: file_url || null,
      file_name: file_name || null,
      metadata: metadata || null,
    });

    return Response.json({ activity });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});