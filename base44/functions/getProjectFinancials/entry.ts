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

async function fetchAllProjects(accessToken) {
  const projects = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await fetch(
      `${FORTNOX_API_BASE}/projects?limit=500&page=${page}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!response.ok) throw new Error(`Failed to fetch projects page ${page}`);

    const data = await response.json();
    if (data.Projects) {
      projects.push(...data.Projects);
    }

    if (data.MetaInformation) {
      totalPages = data.MetaInformation.TotalPages || 1;
    }

    page++;
  }

  return projects;
}

async function fetchProjectInvoices(accessToken, projectNumber) {
  const invoices = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await fetch(
      `${FORTNOX_API_BASE}/invoices?project=${projectNumber}&limit=500&page=${page}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!response.ok) return invoices;

    const data = await response.json();
    if (data.Invoices) {
      invoices.push(...data.Invoices);
    }

    if (data.MetaInformation) {
      totalPages = data.MetaInformation.TotalPages || 1;
    }

    page++;
  }

  return invoices;
}

async function fetchProjectSupplierInvoices(accessToken, projectNumber) {
  const invoices = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await fetch(
      `${FORTNOX_API_BASE}/supplierinvoices?project=${projectNumber}&limit=500&page=${page}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!response.ok) return invoices;

    const data = await response.json();
    if (data.SupplierInvoices) {
      invoices.push(...data.SupplierInvoices);
    }

    if (data.MetaInformation) {
      totalPages = data.MetaInformation.TotalPages || 1;
    }

    page++;
  }

  return invoices;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await getFortnoxToken(base44);

    // Fetch all Fortnox projects
    const fortnoxProjects = await fetchAllProjects(accessToken);

    const results = [];

    // Process each project
    for (const project of fortnoxProjects) {
      const projectNumber = project.ProjectNumber;
      const projectName = project.Description || project.ProjectNumber;
      const projectStatus = project.Status || 'unknown';

      // Fetch customer and supplier invoices
      const customerInvoices = await fetchProjectInvoices(accessToken, projectNumber);
      const supplierInvoices = await fetchProjectSupplierInvoices(accessToken, projectNumber);

      // Calculate totals
      let revenue = 0;
      const customerInvoiceDetails = [];
      for (const inv of customerInvoices) {
        revenue += inv.Total || 0;
        customerInvoiceDetails.push({
          DocumentNumber: inv.DocumentNumber,
          CustomerName: inv.CustomerName || 'Unknown',
          Total: inv.Total || 0,
          InvoiceDate: inv.InvoiceDate
        });
      }

      let costs = 0;
      const supplierInvoiceDetails = [];
      for (const inv of supplierInvoices) {
        costs += inv.Total || 0;
        supplierInvoiceDetails.push({
          GivenNumber: inv.GivenNumber,
          SupplierName: inv.SupplierName || 'Unknown',
          Total: inv.Total || 0,
          InvoiceDate: inv.InvoiceDate
        });
      }

      // Only include projects with revenue or costs
      if (revenue > 0 || costs > 0) {
        results.push({
          projectNumber,
          projectName,
          projectStatus,
          revenue,
          costs,
          result: revenue - costs,
          customerInvoices: customerInvoiceDetails,
          supplierInvoices: supplierInvoiceDetails
        });
      }
    }

    return Response.json({
      projects: results.sort((a, b) => a.projectNumber.localeCompare(b.projectNumber))
    });
  } catch (error) {
    console.error('getProjectFinancials error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});