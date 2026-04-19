import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { trigger_event, context = {} } = await req.json();
    if (!trigger_event) return Response.json({ error: 'trigger_event krävs' }, { status: 400 });

    const templates = await base44.asServiceRole.entities.TaskTemplate.filter({
      trigger_event,
      is_active: true
    });

    if (!templates.length) {
      return Response.json({ created: 0, message: 'Inga aktiva mallar för detta event' });
    }

    const dueDate = (offsetDays) => {
      if (!offsetDays) return null;
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    const fillTemplate = (tmpl, ctx) => {
      if (!tmpl) return tmpl;
      return tmpl.replace(/\{(\w+)\}/g, (_, key) => ctx[key] || '');
    };

    const resolveAssignee = async (template, context) => {
      if (template.auto_assign_rule === 'specific_user') {
        return template.specific_user_email || null;
      }
      if (template.auto_assign_rule === 'assigned_to_field' && template.assigned_to_field_name) {
        return context[template.assigned_to_field_name] || null;
      }
      if (template.auto_assign_rule === 'round_robin') {
        // Find users with matching role
        const users = await base44.asServiceRole.entities.User.list();
        const matching = users.filter(u => u.role === template.default_role && u.is_active !== false);
        if (matching.length) {
          return matching[Math.floor(Math.random() * matching.length)].email;
        }
      }
      return null;
    };

    let created = 0;
    const createdTasks = [];

    for (const tmpl of templates) {
      const assignee = await resolveAssignee(tmpl, context);
      const taskData = {
        name: fillTemplate(tmpl.title_template, context) || tmpl.name,
        description: fillTemplate(tmpl.description_template, context) || '',
        priority: tmpl.priority || 'normal',
        status: 'to_do',
        phase: tmpl.phase,
        role: tmpl.default_role,
        due_date: dueDate(tmpl.due_days_offset),
        assigned_to: assignee,
        order_id: context.order_id || null,
        work_order_id: context.work_order_id || null,
        notes: `Auto-genererad från mall: ${tmpl.name} (event: ${trigger_event})`
      };

      const task = await base44.asServiceRole.entities.Task.create(taskData);
      createdTasks.push(task);
      created++;
    }

    return Response.json({ created, tasks: createdTasks });
  } catch (error) {
    console.error('generateTasksFromTemplate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});