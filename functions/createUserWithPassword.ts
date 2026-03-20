import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can create users
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { full_name, email, password, role, allowed_modules } = await req.json();

    if (!full_name || !email || !password || !role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create user via backend
    const newUser = await base44.asServiceRole.functions.invoke('createAdminUser', {
      full_name,
      email,
      password,
      role
    });

    // Update allowed_modules if provided
    if (allowed_modules && allowed_modules.length > 0 && newUser?.id) {
      await base44.asServiceRole.entities.User.update(newUser.id, { allowed_modules });
    }

    // Log registration
    await base44.asServiceRole.entities.UserRegistration.create({
      email,
      full_name,
      registration_date: new Date().toISOString(),
      registration_method: 'admin_created',
      status: 'completed'
    });

    return Response.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});