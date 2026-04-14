import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get FortnoxConfig to retrieve OAuth tokens
    const configs = await base44.asServiceRole.entities.FortnoxConfig.list();
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

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + refreshData.expires_in);
      await base44.asServiceRole.entities.FortnoxConfig.update(config.id, {
        access_token: accessToken,
        refresh_token: refreshData.refresh_token || config.refresh_token,
        expires_at: expiresAt.toISOString(),
      });
    }

    // Fetch ALL customers from Fortnox using page-based pagination (500 per page)
    const PAGE_SIZE = 500;
    let allCustomers = [];
    let page = 1;
    let totalResources = null;

    while (true) {
      const apiRes = await fetch(
        `https://api.fortnox.se/3/customers?limit=${PAGE_SIZE}&page=${page}`,
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
      const customers = data.Customers || [];
      allCustomers = allCustomers.concat(customers);

      // Get total on first page
      if (totalResources === null) {
        totalResources = data.MetaInformation?.['@TotalResources'] || customers.length;
        console.log(`Total resources in Fortnox: ${totalResources}`);
      }

      console.log(`Fetched page ${page}: ${customers.length} customers (total so far: ${allCustomers.length})`);

      // Stop if we've fetched all
      if (allCustomers.length >= totalResources || customers.length < PAGE_SIZE) {
        break;
      }

      page++;
    }

    console.log(`Total customers fetched: ${allCustomers.length}`);

    // Load existing customers for upsert (index by customer_number)
    const existing = await base44.asServiceRole.entities.FortnoxCustomer.list();
    const existingMap = {};
    for (const c of existing) {
      existingMap[c.customer_number] = c;
    }

    let created = 0;
    let updated = 0;

    for (const fc of allCustomers) {
      const customerNumber = String(fc.CustomerNumber || '');
      if (!customerNumber) continue;

      const payload = {
        customer_number: customerNumber,
        name: fc.Name || '',
        organisation_number: fc.OrganisationNumber || '',
        city: fc.City || '',
        email: fc.Email || '',
        phone: fc.Phone || '',
        address1: fc.Address1 || '',
        zip_code: fc.ZipCode || '',
        active: fc.Active !== false,
      };

      if (existingMap[customerNumber]) {
        // Update existing
        await base44.asServiceRole.entities.FortnoxCustomer.update(existingMap[customerNumber].id, payload);
        updated++;
      } else {
        // Create new
        await base44.asServiceRole.entities.FortnoxCustomer.create(payload);
        created++;
      }
    }

    const total = created + updated;

    // Log to SyncLog
    await base44.asServiceRole.entities.SyncLog.create({
      sync_type: 'customers_from_fortnox',
      status: 'success',
      records_processed: allCustomers.length,
      records_created: created,
      records_updated: updated,
      records_skipped: 0,
      triggered_by: user.email,
      details: { total_in_fortnox: totalResources, pages_fetched: page },
    });

    return Response.json({
      success: true,
      synced_count: total,
      created,
      updated,
      total_in_fortnox: totalResources,
      message: `${total} kunder synkade (${created} nya, ${updated} uppdaterade)`,
    });
  } catch (error) {
    console.error('syncFortnoxCustomers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});