import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

async function getFortnoxToken(base44) {
  const configs = await base44.asServiceRole.entities.FortnoxConfig.list();
  if (!configs || configs.length === 0) throw new Error('Fortnox inte ansluten');
  
  const config = configs[0];
  const now = Date.now();
  
  if (config.access_token && config.token_expires_at && (config.token_expires_at - 300000) > now) {
    return config.access_token;
  }
  
  if (!config.refresh_token) throw new Error('Ingen refresh token');
  
  const credentials = btoa(CLIENT_ID + ':' + CLIENT_SECRET);
  const response = await fetch('https://apps.fortnox.se/oauth-v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + credentials },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(config.refresh_token)
  });
  
  const text = await response.text();
  if (!response.ok) throw new Error('Token refresh failed: ' + text);
  
  const data = JSON.parse(text);
  const expiresAt = now + ((data.expires_in || 3600) * 1000);
  
  await base44.asServiceRole.entities.FortnoxConfig.update(config.id, {
    access_token: data.access_token,
    token_expires_at: expiresAt,
    refresh_token: data.refresh_token || config.refresh_token
  });
  
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await getFortnoxToken(base44);

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