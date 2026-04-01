import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Fields to track and their human-readable labels
const TRACKED_FIELDS = {
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
    const body = await req.json();

    const { event, data, old_data } = body;

    if (!data || !data.id) return Response.json({ ok: true });

    // Only log updates (field changes)
    if (event?.type === 'update' && old_data) {
      const logs = [];

      for (const [field, label] of Object.entries(TRACKED_FIELDS)) {
        const oldVal = old_data[field];
        const newVal = data[field];

        if (oldVal !== newVal && (oldVal !== undefined || newVal !== undefined)) {
          let displayOld = oldVal != null ? String(oldVal) : null;
          let displayNew = newVal != null ? String(newVal) : null;

          if (field === 'status') {
            displayOld = STATUS_LABELS[oldVal] || displayOld;
            displayNew = STATUS_LABELS[newVal] || displayNew;
          }

          let message = `${label} ändrades`;
          if (displayOld && displayNew) message = `${label}: "${displayOld}" → "${displayNew}"`;
          else if (displayNew) message = `${label} satt till "${displayNew}"`;
          else if (displayOld) message = `${label} togs bort (var "${displayOld}")`;

          logs.push({
            purchase_order_id: data.id,
            type: field === 'status' ? 'status_change' : 'field_change',
            message,
            field_name: label,
            old_value: displayOld,
            new_value: displayNew,
            actor_email: data.updated_by || 'system',
            actor_name: data.updated_by || 'System',
            is_decision: false,
          });
        }
      }

      for (const log of logs) {
        await base44.asServiceRole.entities.POActivity.create(log);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});