import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, full_name } = await req.json();

    if (!userId || !full_name) {
      return Response.json({ error: 'Missing userId or full_name' }, { status: 400 });
    }

    // Update the user's full_name
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    await base44.asServiceRole.entities.User.update(userId, { full_name });

    return Response.json({ success: true, message: 'User name updated successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});