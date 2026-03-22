import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { full_name, email, password, role } = await req.json();

    if (!full_name || !email || !password || !role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create user using Base44's auth system
    const result = await base44.asServiceRole.auth.createUser({
      email,
      password,
      userData: {
        full_name,
        role
      }
    });

    return Response.json({ success: true, user: result });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});