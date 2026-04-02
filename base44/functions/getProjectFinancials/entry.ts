import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

async function getAccessToken(base44) {
  const configs = await base44.asServiceRole.entities.FortnoxConfig.list();
  if (!configs || configs.length === 0) {
    throw new Error('Fortnox not configured');
  }

  const config = configs[0];
  const now = Date.now();

  if (config.token_expires_at && config.token_expires_at > now + 60000) {
    return config.access_token;
  }

  const tokenResponse = await fetch('https://oauth.fortnox.se/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refresh_token,
      client_id: Deno.env.get('FORTNOX_CLIENT_ID'),
      client_secret: Deno.env.get('FORTNOX_CLIENT_SECRET')
    })
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to refresh Fortnox token');
  }

  const tokenData = await tokenResponse.json();
  await base44.asServiceRole.entities.FortnoxConfig.update(config.id, {
    access_token: tokenData.access_token,
    token_expires_at: now + tokenData.expires_in * 1000
  });

  return tokenData.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await getAccessToken(base44);

    // Fetch all orders with fortnox_project_number
    const orders = await base44.asServiceRole.entities.Order.list();
    const projectMap = {};

    // Group orders by project
    for (const order of orders) {
      if (order.fortnox_project_number) {
        if (!projectMap[order.fortnox_project_number]) {
          projectMap[order.fortnox_project_number] = {
            projectNumber: order.fortnox_project_number,
            projectName: order.fortnox_project_name || 'Okänd projekt',
            customerInvoices: [],
            supplierInvoices: [],
            revenue: 0,
            costs: 0
          };
        }
      }
    }

    const projects = Object.values(projectMap);

    // Fetch invoices and supplier invoices for each project
    for (const project of projects) {
      // Fetch customer invoices
      const invoicesResponse = await fetch(
        `${FORTNOX_API_BASE}/invoices?project=${project.projectNumber}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        if (invoicesData.Invoices) {
          for (const inv of invoicesData.Invoices) {
            project.customerInvoices.push({
              invoiceNumber: inv.DocumentNumber,
              date: inv.InvoiceDate,
              amount: inv.Total || 0
            });
            project.revenue += inv.Total || 0;
          }
        }
      }

      // Fetch supplier invoices
      const supplierResponse = await fetch(
        `${FORTNOX_API_BASE}/supplierinvoices?project=${project.projectNumber}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (supplierResponse.ok) {
        const supplierData = await supplierResponse.json();
        if (supplierData.SupplierInvoices) {
          for (const inv of supplierData.SupplierInvoices) {
            project.supplierInvoices.push({
              invoiceNumber: inv.InvoiceNumber,
              date: inv.InvoiceDate,
              amount: inv.Total || 0
            });
            project.costs += inv.Total || 0;
          }
        }
      }

      project.result = project.revenue - project.costs;
    }

    return Response.json({
      projects: projects.sort((a, b) => a.projectNumber.localeCompare(b.projectNumber))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});