import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: 'E-post och lösenord krävs' }, { status: 400 });
    }

    const supplierUsers = await base44.asServiceRole.entities.SupplierUser.filter({ email });

    if (supplierUsers.length === 0) {
      return Response.json({ error: 'Felaktig e-post eller lösenord' }, { status: 401 });
    }

    const supplierUser = supplierUsers[0];

    if (!supplierUser.is_active) {
      return Response.json({ error: 'Kontot är inaktiverat. Kontakta IMvision.' }, { status: 403 });
    }

    if (supplierUser.password_hash !== password) {
      return Response.json({ error: 'Felaktig e-post eller lösenord' }, { status: 401 });
    }

    await base44.asServiceRole.entities.SupplierUser.update(supplierUser.id, {
      last_login: new Date().toISOString()
    });

    return Response.json({
      supplier_id: supplierUser.supplier_id,
      email: supplierUser.email,
      full_name: supplierUser.full_name,
    });

  } catch (error) {
    console.error('supplierLogin error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});