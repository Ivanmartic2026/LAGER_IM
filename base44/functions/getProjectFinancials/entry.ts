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

async function fetchAllPaginated(accessToken, endpoint) {
  const results = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await fetch(
      `${FORTNOX_API_BASE}${endpoint}?limit=500&page=${page}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch ${endpoint} page ${page}`);
      break;
    }

    const data = await response.json();
    
    // Extract items based on endpoint type
    let items = [];
    if (endpoint === '/invoices' && data.Invoices) items = data.Invoices;
    else if (endpoint === '/supplierinvoices' && data.SupplierInvoices) items = data.SupplierInvoices;
    else if (endpoint === '/projects' && data.Projects) items = data.Projects;

    results.push(...items);

    if (data.MetaInformation) {
      totalPages = data.MetaInformation.TotalPages || 1;
    }

    page++;
  }

  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await getFortnoxToken(base44);
    
    // Fetch first 3 invoices to inspect structure
    const invoiceRes = await fetch(FORTNOX_API_BASE + '/invoices?limit=3', {
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Accept': 'application/json' }
    });
    const invoiceData = await invoiceRes.json();
    
    // Also test project filter on project "1"
    const projectInvoiceRes = await fetch(FORTNOX_API_BASE + '/invoices?project=1&limit=3', {
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Accept': 'application/json' }
    });
    const projectInvoiceData = await projectInvoiceRes.json();
    
    // Also fetch supplier invoices sample
    const supRes = await fetch(FORTNOX_API_BASE + '/supplierinvoices?limit=3', {
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Accept': 'application/json' }
    });
    const supData = await supRes.json();
    
    return Response.json({
      debug: true,
      sampleInvoice: invoiceData.Invoices ? invoiceData.Invoices[0] : null,
      totalInvoices: invoiceData.MetaInformation,
      invoicesForProject1: projectInvoiceData.Invoices || [],
      sampleSupplierInvoice: supData.SupplierInvoices ? supData.SupplierInvoices[0] : null,
    });
  } catch (error) {
    console.error('getProjectFinancials debug error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});