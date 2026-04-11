import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get FortnoxConfig to retrieve OAuth tokens
    const configs = await base44.entities.FortnoxConfig.list();
    if (!configs.length) {
      return Response.json({ error: 'No Fortnox configuration found' }, { status: 400 });
    }

    const config = configs[0];
    let accessToken = config.access_token;

    // Check if token is expired and refresh if needed
    if (config.expires_at && new Date(config.expires_at) <= new Date()) {
      const refreshRes = await fetch('https://api.fortnox.se/oauth-v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: config.refresh_token,
          client_id: Deno.env.get('FORTNOX_CLIENT_ID') || '',
          client_secret: Deno.env.get('FORTNOX_CLIENT_SECRET') || '',
        }).toString(),
      });

      if (!refreshRes.ok) {
        return Response.json({ error: 'Token refresh failed' }, { status: 400 });
      }

      const refreshData = await refreshRes.json();
      accessToken = refreshData.access_token;

      // Update config with new token
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + refreshData.expires_in);
      await base44.entities.FortnoxConfig.update(config.id, {
        access_token: accessToken,
        refresh_token: refreshData.refresh_token || config.refresh_token,
        expires_at: expiresAt.toISOString(),
      });
    }

    // Fetch all customers from Fortnox API
    let allCustomers = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const apiRes = await fetch(
        `https://api.fortnox.se/3/customers?limit=100&offset=${(page - 1) * 100}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!apiRes.ok) {
        return Response.json({ error: `Fortnox API error: ${apiRes.status}` }, { status: 400 });
      }

      const data = await apiRes.json();
      allCustomers = allCustomers.concat(data.Customers || []);
      hasMore = (data.Customers || []).length === 100;
      page++;
    }

    // Clear existing customers
    const existing = await base44.asServiceRole.entities.FortnoxCustomer.list();
    for (const cust of existing) {
      await base44.asServiceRole.entities.FortnoxCustomer.delete(cust.id);
    }

    // Sync all customers
    const syncedCustomers = [];
    for (const fc of allCustomers) {
      try {
        const created = await base44.asServiceRole.entities.FortnoxCustomer.create({
          customer_number: String(fc.CustomerNumber || ''),
          name: fc.Name || '',
          organisation_number: fc.OrganisationNumber || '',
          city: fc.City || '',
          email: fc.Email || '',
          phone: fc.Phone || '',
          address1: fc.Address1 || '',
          zip_code: fc.ZipCode || '',
          active: fc.Active !== false,
        });
        syncedCustomers.push(created);
      } catch (e) {
        console.error(`Failed to sync customer ${fc.CustomerNumber}:`, e);
      }
    }

    return Response.json({
      success: true,
      synced_count: syncedCustomers.length,
      message: `${syncedCustomers.length} kunder synkade från Fortnox`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});