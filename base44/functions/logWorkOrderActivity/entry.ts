import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const FIELD_LABELS = {
  status: "Status",
  current_stage: "Fas",
  priority: "Prioritet",
  production_status: "Produktionsstatus",
  assigned_to_picking: "Tilldelad plockning",
  assigned_to_production: "Tilldelad produktion",
  deviations: "Avvikelser",
  picking_notes: "Plockanteckningar",
  production_notes: "Produktionsanteckningar",
  all_materials_ready: "Alla material klara",
  needs_procurement: "Kräver inköp",
  drawing_url: "Ritning",
  bill_of_materials_url: "Stycklista",
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
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { work_order_id, type, message, field_name, old_value, new_value, is_decision, decision_reason, file_url, file_name, metadata } = body;

    if (!work_order_id || !type || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let displayOldValue = old_value;
    let displayNewValue = new_value;
    if (field_name === 'status' || field_name === 'current_stage') {
      displayOldValue = STATUS_LABELS[old_value] || old_value;
      displayNewValue = STATUS_LABELS[new_value] || new_value;
    }

    const activity = await base44.entities.WorkOrderActivity.create({
      work_order_id,
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