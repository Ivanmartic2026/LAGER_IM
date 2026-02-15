import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { full_name, email, password, role } = await req.json();

    if (!full_name || !email || !password || !role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create user using service role
    const newUser = await base44.asServiceRole.entities.User.create({
      full_name,
      email,
      role,
      password_hash: await hashPassword(password)
    });

    return Response.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Simple password hashing (for demo - use proper bcrypt in production)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}