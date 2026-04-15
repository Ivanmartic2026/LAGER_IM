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

async function fetchAllFortnoxSuppliers(accessToken) {
  const suppliers = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${FORTNOX_API}/suppliers?limit=100&page=${page}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fortnox suppliers fetch failed (page ${page}): ${text}`);
    }
    const data = await res.json();
    const batch = data.Suppliers || [];
    suppliers.push(...batch);
    const meta = data.MetaInformation;
    if (!meta || page >= Math.ceil((meta['@TotalResources'] || 0) / 100)) break;
    page++;
  }
  return suppliers;
}

async function createSupplierInFortnox(accessToken, supplier) {
  const res = await fetch(`${FORTNOX_API}/suppliers`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      Supplier: {
        Name: supplier.name?.trim() || '',
        Address1: (supplier.address || '').trim(),
        Email: (supplier.email || '').trim()
      }
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create supplier in Fortnox: ${text}`);
  }
  const data = await res.json();
  return data.Supplier;
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
    const supplierIds = body.supplier_ids ? new Set(body.supplier_ids) : null; // null = sync all
    const dryRun = body.dry_run === true;

    const accessToken = await getAccessToken(base44);

    // Fetch all suppliers from Fortnox
    const fortnoxSuppliers = await fetchAllFortnoxSuppliers(accessToken);

    // dry_run: just return the Fortnox list for the import tab
    if (dryRun) {
      return Response.json({ success: true, fortnox_list: fortnoxSuppliers });
    }

    // Build name -> SupplierNumber map (case-insensitive)
    const nameMap = {};
    for (const s of fortnoxSuppliers) {
      if (s.Name) nameMap[s.Name.toLowerCase().trim()] = s.SupplierNumber;
    }

    // Load all internal suppliers (or just the selected ones)
    const allSuppliers = await base44.asServiceRole.entities.Supplier.list();
    const internalSuppliers = supplierIds ? allSuppliers.filter(s => supplierIds.has(s.id)) : allSuppliers;

    let matched = 0, pushed = 0, skipped = 0;
    const missing = [];

    for (const supplier of internalSuppliers) {
      if (!supplier.name) { skipped++; continue; }
      const key = supplier.name.toLowerCase().trim();
      const fortnoxNumber = nameMap[key];

      if (fortnoxNumber) {
        if (supplier.fortnox_supplier_number !== fortnoxNumber) {
          await base44.asServiceRole.entities.Supplier.update(supplier.id, {
            fortnox_supplier_number: fortnoxNumber
          });
          matched++;
        } else {
          skipped++;
        }
      } else {
        missing.push({ id: supplier.id, name: supplier.name });
      }
    }

    // Push missing suppliers to Fortnox if requested
    if (pushMissing && missing.length > 0) {
      for (const s of missing) {
        const fullSupplier = internalSuppliers.find(x => x.id === s.id);
        const created = await createSupplierInFortnox(accessToken, fullSupplier);
        await base44.asServiceRole.entities.Supplier.update(s.id, {
          fortnox_supplier_number: created.SupplierNumber
        });
        pushed++;
      }
    }

    // Write SyncLog
    await base44.asServiceRole.entities.SyncLog.create({
      sync_type: 'suppliers_with_fortnox',
      status: 'success',
      records_processed: internalSuppliers.length,
      records_updated: matched,
      records_created: pushed,
      records_skipped: skipped,
      triggered_by: user.email,
      details: {
        fortnox_supplier_count: fortnoxSuppliers.length,
        missing_in_fortnox: missing.length,
        push_missing_to_fortnox: pushMissing
      }
    });

    return Response.json({
      success: true,
      fortnox_suppliers: fortnoxSuppliers.length,
      suppliers_matched: matched,
      suppliers_pushed_to_fortnox: pushed,
      skipped,
      missing_count: missing.length,
      missing_names: missing.map(s => s.name)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});