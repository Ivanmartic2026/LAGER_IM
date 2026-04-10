import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ASSIGNMENT_FIELDS = [
  'assigned_to_konstruktion',
  'assigned_to_produktion',
  'assigned_to_lager',
  'assigned_to_montering',
  'assigned_to_leverans',
];

const STAGE_NAMES = {
  assigned_to_konstruktion: 'konstruktion',
  assigned_to_produktion: 'produktion',
  assigned_to_lager: 'lager',
  assigned_to_montering: 'montering',
  assigned_to_leverans: 'leverans',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const data = payload.data;
    const oldData = payload.old_data;
    const changedFields = payload.changed_fields || [];

    if (!data) {
      return Response.json({ success: true, message: 'No data in payload' });
    }

    const woName = data.name || data.order_number || data.id?.slice(0, 8) || 'Arbetsorder';
    const notifications = [];

    for (const field of ASSIGNMENT_FIELDS) {
      if (!changedFields.includes(field)) continue;

      const newEmail = data[field];
      const oldEmail = oldData?.[field];

      // Only notify if newly assigned (not unassigned)
      if (!newEmail || newEmail === oldEmail) continue;

      const stage = STAGE_NAMES[field];

      notifications.push(
        base44.asServiceRole.entities.Notification.create({
          user_email: newEmail,
          title: 'Ny tilldelning',
          message: `Du har blivit tilldelad "${woName}" - fas: ${stage}`,
          type: 'assignment',
          priority: 'normal',
          is_read: false,
          link_to: data.id,
          link_page: 'WorkOrders',
        })
      );
    }

    if (notifications.length === 0) {
      return Response.json({ success: true, message: 'No assignment changes' });
    }

    await Promise.all(notifications);
    console.log(`Sent ${notifications.length} assignment notification(s) for WO ${data.id}`);

    return Response.json({ success: true, sent: notifications.length });
  } catch (error) {
    console.error('notifyWOAssignment error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});