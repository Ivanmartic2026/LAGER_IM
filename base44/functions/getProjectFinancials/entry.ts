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
    const res = await fetch(`https://api.fortnox.se/3/projects?limit=500&filter=all&page=${page}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });
    if (!res.ok) break;
    const data = await res.json();
    if (data.Projects) projects.push(...data.Projects);
    if (data.MetaInformation && data.MetaInformation.TotalPages) {
      totalPages = data.MetaInformation.TotalPages;
    }
    page++;
  }

  return projects;
}

async function fetchProjectInvoices(accessToken, projectNumber) {
  const [invRes, supRes] = await Promise.all([
    fetch(`${FORTNOX_API_BASE}/invoices?project=${projectNumber}&limit=500`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }),
    fetch(`${FORTNOX_API_BASE}/supplierinvoices?project=${projectNumber}&limit=500`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
  ]);

  const invData = invRes.ok ? await invRes.json() : {};
  const supData = supRes.ok ? await supRes.json() : {};

  return {
    invoices: invData.Invoices || [],
    supplierInvoices: supData.SupplierInvoices || []
  };
}

async function processBatch(accessToken, projects) {
  return Promise.all(projects.map(async (project) => {
    const { invoices, supplierInvoices } = await fetchProjectInvoices(accessToken, project.ProjectNumber);

    let revenue = 0;
    const customerInvoices = invoices.map(inv => {
      const total = parseFloat(inv.Total) || 0;
      const balance = parseFloat(inv.Balance) || 0;
      revenue += total;
      return {
        invoiceNumber: inv.DocumentNumber || '',
        customerName: inv.CustomerName || '',
        invoiceDate: inv.InvoiceDate || '',
        dueDate: inv.DueDate || '',
        total,
        balance,
        isPaid: balance === 0,
        // legacy fields kept for backward compat
        DocumentNumber: inv.DocumentNumber,
        CustomerName: inv.CustomerName || 'Unknown',
        Total: total,
        InvoiceDate: inv.InvoiceDate
      };
    });

    let costs = 0;
    const supplierInvoiceDetails = supplierInvoices.map(inv => {
      const total = parseFloat(inv.Total) || 0;
      const balance = parseFloat(inv.Balance) || 0;
      costs += total;
      return {
        invoiceNumber: inv.GivenNumber || inv.DocumentNumber || '',
        supplierName: inv.SupplierName || '',
        invoiceDate: inv.InvoiceDate || '',
        dueDate: inv.DueDate || '',
        total,
        balance,
        isPaid: balance === 0,
        // legacy fields kept for backward compat
        GivenNumber: inv.GivenNumber,
        SupplierName: inv.SupplierName || 'Unknown',
        Total: total,
        InvoiceDate: inv.InvoiceDate
      };
    });

    const customerName = customerInvoices.length > 0 ? (customerInvoices[0].customerName || '') : '';

    return {
      projectNumber: project.ProjectNumber,
      projectName: project.Description || project.ProjectNumber,
      projectStatus: project.Status || 'unknown',
      startDate: project.StartDate || '',
      endDate: project.EndDate || '',
      customerName,
      revenue,
      costs,
      result: revenue - costs,
      customerInvoices,
      supplierInvoices: supplierInvoiceDetails
    };
  }));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await getFortnoxToken(base44);
    const allProjects = await fetchAllProjects(accessToken);

    const results = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < allProjects.length; i += BATCH_SIZE) {
      const batch = allProjects.slice(i, i + BATCH_SIZE);
      const batchResults = await processBatch(accessToken, batch);
      results.push(...batchResults);
    }

    results.sort((a, b) => a.projectNumber.localeCompare(b.projectNumber));

    return Response.json({ projects: results });
  } catch (error) {
    console.error('getProjectFinancials error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});