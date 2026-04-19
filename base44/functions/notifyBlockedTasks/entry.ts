import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const tasks = await base44.asServiceRole.entities.Task.filter({ status: 'in_progress' });
    const stuckTasks = tasks.filter(t => {
      const updated = new Date(t.updated_date || t.created_date);
      return updated < threeDaysAgo;
    });

    let notified = 0;
    for (const task of stuckTasks) {
      if (task.assigned_to) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: task.assigned_to,
          title: '⚠️ Uppgift blockerad',
          message: `Uppgiften "${task.name}" har inte uppdaterats på över 3 dagar.`,
          type: 'warning',
          priority: 'high',
          link_page: 'Tasks',
          link_to: task.id,
          is_read: false
        }).catch(() => {});
        notified++;
      }

      // Also notify konstruktor/ivan
      const admins = await base44.asServiceRole.entities.User.list();
      const constructors = admins.filter(u => u.role === 'konstruktor' || u.role === 'ivan');
      for (const c of constructors) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: c.email,
          title: '⚠️ Blockerad uppgift kräver uppmärksamhet',
          message: `Uppgiften "${task.name}" (tilldelad ${task.assigned_to}) har inte uppdaterats på 3+ dagar.`,
          type: 'warning',
          priority: 'high',
          link_page: 'Tasks',
          link_to: task.id,
          is_read: false
        }).catch(() => {});
      }
    }

    return Response.json({ stuckTasks: stuckTasks.length, notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});