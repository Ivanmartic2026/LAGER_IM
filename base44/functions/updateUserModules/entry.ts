import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, allowed_modules } = await req.json();

    if (!userId || !Array.isArray(allowed_modules)) {
      return Response.json({ error: 'Missing userId or allowed_modules' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(userId, { allowed_modules });

    return Response.json({ success: true, message: 'Modules updated successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});