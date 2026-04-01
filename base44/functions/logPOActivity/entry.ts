import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Field label mapping for human-readable names
const FIELD_LABELS = {
  status: "Status",
  supplier_name: "Leverantör",
  expected_delivery_date: "Förväntat leveransdatum",
  confirmed_delivery_date: "Bekräftat leveransdatum",
  payment_terms: "Betalningsvillkor",
  delivery_terms: "Leveransvillkor",
  mode_of_transport: "Transportsätt",
  tracking_number: "Spårningsnummer",
  shipping_company: "Speditör",
  notes: "Anteckningar",
  supplier_comments: "Leverantörskommentar",
  invoice_number: "Fakturanummer",
  invoice_amount: "Fakturabelopp",
  total_cost: "Total kostnad",
  cost_center: "Kostnadsställe",
  fortnox_project_number: "Projektnummer",
  documentation_status: "Dokumentationsstatus",
  purchase_type: "Inköpstyp",
  warehouse_name: "Lager",
};

const STATUS_LABELS = {
  draft: "Utkast",
  sent: "Skickad",
  confirmed: "Bekräftad",
  waiting_for_supplier_documentation: "Väntar dokumentation",
  in_production: "I produktion",
  shipped: "Skickad",
  ready_for_reception: "Redo för mottagning",
  received: "Mottagen",
  cancelled: "Avbokad",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { purchase_order_id, type, message, field_name, old_value, new_value, is_decision, decision_reason, file_url, file_name, metadata } = body;

    if (!purchase_order_id || !type || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Format values for status fields
    let displayOldValue = old_value;
    let displayNewValue = new_value;
    if (field_name === 'status') {
      displayOldValue = STATUS_LABELS[old_value] || old_value;
      displayNewValue = STATUS_LABELS[new_value] || new_value;
    }

    const activity = await base44.entities.POActivity.create({
      purchase_order_id,
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