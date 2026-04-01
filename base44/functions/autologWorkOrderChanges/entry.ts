import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TRACKED_FIELDS = {
  status: "Status",
  current_stage: "Fas",
  priority: "Prioritet",
  production_status: "Produktionsstatus",
  assigned_to_picking_name: "Tilldelad plockning",
  assigned_to_production_name: "Tilldelad produktion",
  deviations: "Avvikelser",
  picking_notes: "Plockanteckningar",
  production_notes: "Produktionsanteckningar",
  all_materials_ready: "Alla material klara",
  needs_procurement: "Kräver inköp",
};

const STATUS_LABELS = {
  pending: "Väntande",
  in_progress: "Pågår",
  completed: "Klar",
  cancelled: "Avbokad",
  picking: "Plockning",
  production: "Produktion",
  delivery: "Leverans",
  started: "Startad",
  assembled: "Monterad",
  tested: "Testad",
  low: "Låg",
  normal: "Normal",
  high: "Hög",
  urgent: "Akut",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (!data || !data.id) return Response.json({ ok: true });

    if (event?.type === 'update' && old_data) {
      const logs = [];

      for (const [field, label] of Object.entries(TRACKED_FIELDS)) {
        const oldVal = old_data[field];
        const newVal = data[field];

        if (oldVal !== newVal && (oldVal !== undefined || newVal !== undefined)) {
          let displayOld = oldVal != null ? String(oldVal) : null;
          let displayNew = newVal != null ? String(newVal) : null;

          if (field === 'status' || field === 'current_stage' || field === 'priority' || field === 'production_status') {
            displayOld = STATUS_LABELS[oldVal] || displayOld;
            displayNew = STATUS_LABELS[newVal] || displayNew;
          }

          if (field === 'all_materials_ready' || field === 'needs_procurement') {
            displayOld = oldVal === true ? 'Ja' : 'Nej';
            displayNew = newVal === true ? 'Ja' : 'Nej';
          }

          let message = `${label} ändrades`;
          if (displayOld && displayNew) message = `${label}: "${displayOld}" → "${displayNew}"`;
          else if (displayNew) message = `${label} satt till "${displayNew}"`;
          else if (displayOld) message = `${label} togs bort`;

          const isStatusChange = field === 'status' || field === 'current_stage';

          logs.push({
            work_order_id: data.id,
            type: isStatusChange ? 'status_change' : 'field_change',
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
        await base44.asServiceRole.entities.WorkOrderActivity.create(log);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});