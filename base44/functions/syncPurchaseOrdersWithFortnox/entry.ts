import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';
const FORTNOX_API = 'https://api.fortnox.se/3';

async function getAccessToken(base44) {
  const configs = await base44.asServiceRole.entities.FortnoxConfig.list();
  const config = configs[0];
  if (!config) throw new Error('Ingen FortnoxConfig hittad');

  const now = Date.now();
  if (config.access_token && config.token_expires_at && (config.token_expires_at - 300000) > now) {
    return config.access_token;
  }
  if (!config.refresh_token) throw new Error('Ingen refresh token');

  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const res = await fetch('https://apps.fortnox.se/oauth-v1/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(config.refresh_token)}`
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Token refresh failed: ${text}`);
  const data = JSON.parse(text);
  const expiresAt = now + ((data.expires_in || 3600) * 1000);
  await base44.asServiceRole.entities.FortnoxConfig.update(config.id, {
    access_token: data.access_token,
    token_expires_at: expiresAt,
    refresh_token: data.refresh_token || config.refresh_token
  });
  return data.access_token;
}

async function fetchAllFortnoxPurchaseOrders(accessToken) {
  const orders = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${FORTNOX_API}/supplierorderrows?limit=100&page=${page}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });
    if (!res.ok) break;
    const data = await res.json();
    // Fortnox supplier orders endpoint
    const batch = data.SupplierOrders || data.SupplierOrderRows || [];
    if (batch.length === 0) break;
    orders.push(...batch);
    const meta = data.MetaInformation;
    if (!meta || page >= Math.ceil((meta['@TotalResources'] || 0) / 100)) break;
    page++;
  }
  return orders;
}

async function fetchFortnoxSupplierOrders(accessToken) {
  // Use the supplier invoices endpoint to find purchase orders
  const orders = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${FORTNOX_API}/supplierinvoices?limit=100&page=${page}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`Fortnox supplierinvoices page ${page}: ${res.status} ${text}`);
      break;
    }
    const data = await res.json();
    const batch = data.SupplierInvoices || [];
    orders.push(...batch);
    const meta = data.MetaInformation;
    if (!meta || page >= Math.ceil((meta['@TotalResources'] || 0) / 100)) break;
    page++;
  }
  return orders;
}

async function ensureSupplierInFortnox(accessToken, base44, supplierId) {
  if (!supplierId) return null;
  const supplier = await base44.asServiceRole.entities.Supplier.get(supplierId).catch(() => null);
  if (!supplier) return null;
  if (supplier.fortnox_supplier_number) return supplier.fortnox_supplier_number;

  const searchRes = await fetch(`${FORTNOX_API}/suppliers?limit=500`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
  });
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    const allSuppliers = searchData.Suppliers || [];
    const match = allSuppliers.find(s => s.Name?.toLowerCase().trim() === supplier.name?.toLowerCase().trim());
    if (match) {
      await base44.asServiceRole.entities.Supplier.update(supplierId, { fortnox_supplier_number: match.SupplierNumber });
      return match.SupplierNumber;
    }
  }

  const createRes = await fetch(`${FORTNOX_API}/suppliers`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ Supplier: { Name: supplier.name?.trim() || '', Address1: (supplier.address || '').trim(), Email: (supplier.email || '').trim() } })
  });
  if (createRes.ok) {
    const createData = await createRes.json();
    const fortnoxNumber = createData?.Supplier?.SupplierNumber;
    if (fortnoxNumber) {
      await base44.asServiceRole.entities.Supplier.update(supplierId, { fortnox_supplier_number: fortnoxNumber });
      return fortnoxNumber;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { dry_run, po_id, import_from_fortnox, fortnox_invoice_number } = body;

    const accessToken = await getAccessToken(base44);

    // DRY RUN: return Fortnox supplier invoices list for the panel
    if (dry_run) {
      const fortnoxList = await fetchFortnoxSupplierOrders(accessToken);
      return Response.json({ success: true, fortnox_list: fortnoxList });
    }

    // PUSH: push a single local PO → Fortnox as supplier invoice
    if (po_id && !import_from_fortnox) {
      const po = await base44.asServiceRole.entities.PurchaseOrder.get(po_id);
      if (!po) return Response.json({ error: 'PO not found' }, { status: 404 });

      const supplierNumber = await ensureSupplierInFortnox(accessToken, base44, po.supplier_id);

      const invoiceData = {
        SupplierNumber: supplierNumber || '',
        InvoiceDate: po.order_date || new Date().toISOString().split('T')[0],
        DueDate: po.expected_delivery_date || new Date().toISOString().split('T')[0],
        Currency: po.invoice_currency || 'SEK',
        Comments: po.notes || '',
        Total: po.total_cost || po.invoice_amount || 0,
        YourReference: po.po_number || ''
      };

      const res = await fetch(`${FORTNOX_API}/supplierinvoices`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ SupplierInvoice: invoiceData })
      });

      if (res.ok) {
        const data = await res.json();
        const fnNumber = data?.SupplierInvoice?.GivenNumber || data?.SupplierInvoice?.DocumentNumber;
        if (fnNumber) {
          await base44.asServiceRole.entities.PurchaseOrder.update(po_id, {
            fortnox_incoming_goods_id: String(fnNumber)
          });
        }
        return Response.json({ success: true, fortnox_number: fnNumber });
      } else {
        const errText = await res.text();
        return Response.json({ success: false, error: `Fortnox ${res.status}: ${errText}` }, { status: 400 });
      }
    }

    // IMPORT: create a local PO from a Fortnox supplier invoice
    if (import_from_fortnox && fortnox_invoice_number) {
      const res = await fetch(`${FORTNOX_API}/supplierinvoices/${fortnox_invoice_number}`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });

      if (!res.ok) {
        const errText = await res.text();
        return Response.json({ success: false, error: `Fortnox ${res.status}: ${errText}` }, { status: 400 });
      }

      const data = await res.json();
      const inv = data?.SupplierInvoice;
      if (!inv) return Response.json({ success: false, error: 'Ingen fakturadata från Fortnox' }, { status: 400 });

      // Try to find matching supplier in Lager AI
      let supplierId = null;
      let supplierName = inv.SupplierName || '';
      if (inv.SupplierNumber) {
        const suppliers = await base44.asServiceRole.entities.Supplier.filter({ fortnox_supplier_number: inv.SupplierNumber });
        if (suppliers.length > 0) {
          supplierId = suppliers[0].id;
          supplierName = suppliers[0].name;
        }
      }

      const newPO = await base44.asServiceRole.entities.PurchaseOrder.create({
        po_number: inv.YourReference || `FN-${inv.GivenNumber}`,
        supplier_id: supplierId,
        supplier_name: supplierName,
        invoice_number: inv.ExternalInvoiceNumber || String(inv.GivenNumber),
        invoice_amount: inv.Total || 0,
        invoice_currency: inv.Currency || 'SEK',
        order_date: inv.InvoiceDate,
        status: 'confirmed',
        notes: inv.Comments || '',
        fortnox_incoming_goods_id: String(inv.GivenNumber),
        fortnox_project_number: inv.Project || ''
      });

      return Response.json({ success: true, po_id: newPO.id });
    }

    return Response.json({ error: 'Ogiltigt anrop — ange dry_run, po_id eller import_from_fortnox' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});