import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, is_active, role } = await req.json();

    if (!userId) {
      return Response.json({ error: 'Missing userId' }, { status: 400 });
    }

    const updateData = {};
    if (typeof is_active === 'boolean') {
      updateData.is_active = is_active;
    }
    if (role && (role === 'admin' || role === 'user')) {
      updateData.role = role;
    }

    const updatedUser = await base44.asServiceRole.entities.User.update(userId, updateData);

    return Response.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user status:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});