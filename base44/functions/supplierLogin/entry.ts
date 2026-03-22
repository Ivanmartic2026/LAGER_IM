import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ 
        success: false, 
        error: 'E-post och lösenord krävs' 
      }, { status: 400 });
    }

    // Find supplier user by email
    const supplierUsers = await base44.asServiceRole.entities.SupplierUser.filter({ 
      email: email.toLowerCase() 
    });

    if (supplierUsers.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Felaktiga inloggningsuppgifter' 
      }, { status: 401 });
    }

    const supplierUser = supplierUsers[0];

    if (!supplierUser.is_active) {
      return Response.json({ 
        success: false, 
        error: 'Kontot är inaktiverat' 
      }, { status: 401 });
    }

    // Simple password check (in production, use proper hashing like bcrypt)
    if (supplierUser.password_hash !== password) {
      return Response.json({ 
        success: false, 
        error: 'Felaktiga inloggningsuppgifter' 
      }, { status: 401 });
    }

    // Update last login
    await base44.asServiceRole.entities.SupplierUser.update(supplierUser.id, {
      last_login: new Date().toISOString()
    });

    // Return session info
    return Response.json({
      success: true,
      session: {
        supplier_id: supplierUser.supplier_id,
        email: supplierUser.email,
        full_name: supplierUser.full_name,
        user_id: supplierUser.id
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});