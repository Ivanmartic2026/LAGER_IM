import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const FORTNOX_API = 'https://api.fortnox.se/3';

async function refreshFortnoxToken(refreshToken) {
  const clientId = Deno.env.get('FORTNOX_CLIENT_ID');
  const clientSecret = Deno.env.get('FORTNOX_CLIENT_SECRET');
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch('https://apps.fortnox.se/oauth-v1/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${text}`);
  }
  return res.json();
}

async function fetchAllCustomers(accessToken) {
  const customers = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${FORTNOX_API}/customers?limit=100&page=${page}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fortnox customers fetch failed (page ${page}): ${text}`);
    }
    const data = await res.json();
    const batch = data.Customers || [];
    customers.push(...batch);
    const meta = data.MetaInformation;
    if (!meta || page >= Math.ceil((meta['@TotalResources'] || 0) / 100)) break;
    page++;
  }
  return customers;
}

async function createCustomerInFortnox(accessToken, customerName) {
  const res = await fetch(`${FORTNOX_API}/customers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ Customer: { Name: customerName } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create customer in Fortnox: ${text}`);
  }
  const data = await res.json();
  return data.Customer;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const pushMissing = body.push_missing_to_fortnox === true;

    // Load FortnoxConfig
    const configs = await base44.asServiceRole.entities.FortnoxConfig.list();
    const config = configs[0];
    if (!config) return Response.json({ error: 'Ingen FortnoxConfig hittad' }, { status: 400 });

    let accessToken = config.access_token;

    // Refresh token
    if (config.refresh_token) {
      const tokenData = await refreshFortnoxToken(config.refresh_token);
      accessToken = tokenData.access_token;
      await base44.asServiceRole.entities.FortnoxConfig.update(config.id, {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || config.refresh_token,
      });
    }

    // Fetch all customers from Fortnox
    const fortnoxCustomers = await fetchAllCustomers(accessToken);

    // Build name -> customer_number map (case-insensitive)
    const nameMap = {};
    for (const c of fortnoxCustomers) {
      if (c.Name) nameMap[c.Name.toLowerCase().trim()] = c.CustomerNumber;
    }

    // Load all orders
    const orders = await base44.asServiceRole.entities.Order.list();

    let matched = 0, pushed = 0, skipped = 0;
    const missing = [];

    for (const order of orders) {
      if (!order.customer_name) { skipped++; continue; }
      const key = order.customer_name.toLowerCase().trim();
      const customerNumber = nameMap[key];

      if (customerNumber) {
        if (order.fortnox_customer_number !== customerNumber) {
          await base44.asServiceRole.entities.Order.update(order.id, {
            fortnox_customer_number: customerNumber,
          });
          matched++;
        } else {
          skipped++;
        }
      } else {
        missing.push(order.customer_name);
      }
    }

    // Push missing customers to Fortnox if requested
    if (pushMissing && missing.length > 0) {
      const uniqueMissing = [...new Set(missing)];
      for (const name of uniqueMissing) {
        const created = await createCustomerInFortnox(accessToken, name);
        // Update all orders with this customer name
        for (const order of orders) {
          if (order.customer_name === name && !order.fortnox_customer_number) {
            await base44.asServiceRole.entities.Order.update(order.id, {
              fortnox_customer_number: created.CustomerNumber,
            });
          }
        }
        nameMap[name.toLowerCase().trim()] = created.CustomerNumber;
        pushed++;
      }
    }

    // Write SyncLog
    await base44.asServiceRole.entities.SyncLog.create({
      sync_type: 'customers_with_fortnox',
      status: 'success',
      records_processed: orders.length,
      records_updated: matched,
      records_created: pushed,
      records_skipped: skipped,
      triggered_by: user.email,
      details: {
        fortnox_customer_count: fortnoxCustomers.length,
        missing_customers: missing.length,
        push_missing_to_fortnox: pushMissing,
      },
    });

    return Response.json({
      success: true,
      fortnox_customers: fortnoxCustomers.length,
      orders_matched: matched,
      customers_pushed_to_fortnox: pushed,
      skipped,
      missing_count: missing.length,
    });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SyncLog.create({
        sync_type: 'customers_with_fortnox',
        status: 'error',
        error_message: error.message,
        triggered_by: 'system',
      });
    } catch (_) { /* ignore log errors */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});