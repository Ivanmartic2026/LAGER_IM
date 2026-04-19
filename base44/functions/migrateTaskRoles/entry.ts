import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all tasks with old role value
    const tasks = await base44.asServiceRole.entities.Task.filter({ role: 'pl_konstruktor' });
    let updated = 0;

    for (const task of tasks) {
      await base44.asServiceRole.entities.Task.update(task.id, { role: 'konstruktor' });
      updated++;
    }

    return Response.json({
      success: true,
      migrated_tasks: updated,
      message: `Mapped ${updated} tasks from pl_konstruktor → konstruktor`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});