import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';

async function getAccessToken(base44) {
  const configs = await base44.asServiceRole.entities.FortnoxConfig.list();
  const config = configs[0];
  if (!config) throw new Error('Ingen FortnoxConfig hittad');
  const now = Date.now();
  if (config.access_token && config.token_expires_at && (config.token_expires_at - 300000) > now) {
    return config.access_token;
  }
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const matchMode = body.match_mode === true; // if true, match against Lager AI suppliers

    const accessToken = await getAccessToken(base44);

    // Fetch all Fortnox suppliers (paginated)
    const allFortnox = [];
    let page = 1;
    while (true) {
      const res = await fetch(`https://api.fortnox.se/3/suppliers?limit=100&page=${page}`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`Fortnox error: ${await res.text()}`);
      const data = await res.json();
      const batch = data.Suppliers || [];
      allFortnox.push(...batch);
      const meta = data.MetaInformation;
      if (!meta || page >= Math.ceil((meta['@TotalResources'] || 0) / 100)) break;
      page++;
    }

    // Build name->number map (case-insensitive)
    const nameMap = {};
    for (const s of allFortnox) {
      if (s.Name) nameMap[s.Name.toLowerCase().trim()] = { SupplierNumber: s.SupplierNumber, Name: s.Name, Active: s.Active };
    }

    if (!matchMode) {
      // Just return slim list sorted active-first
      const slim = allFortnox.map(s => ({
        SupplierNumber: s.SupplierNumber,
        Name: s.Name,
        Active: s.Active,
        Email: s.Email || '',
        City: s.City || ''
      })).sort((a, b) => {
        if (a.Active !== b.Active) return b.Active ? 1 : -1;
        return (a.Name || '').localeCompare(b.Name || '');
      });
      return Response.json({ total: allFortnox.length, suppliers: slim });
    }

    // MATCH MODE: match Lager AI suppliers against Fortnox by name
    const lagerSuppliers = await base44.asServiceRole.entities.Supplier.list();
    const matched = [];
    const unmatched = [];

    for (const s of lagerSuppliers) {
      const key = (s.name || '').toLowerCase().trim();
      const fortnoxMatch = nameMap[key];
      if (fortnoxMatch) {
        matched.push({
          id: s.id,
          name: s.name,
          old_fortnox_number: s.fortnox_supplier_number,
          new_fortnox_number: fortnoxMatch.SupplierNumber,
          fortnox_name: fortnoxMatch.Name,
          active: fortnoxMatch.Active
        });
        // Update the supplier record
        await base44.asServiceRole.entities.Supplier.update(s.id, {
          fortnox_supplier_number: fortnoxMatch.SupplierNumber
        });
      } else {
        unmatched.push({ id: s.id, name: s.name, current_number: s.fortnox_supplier_number });
      }
    }

    return Response.json({
      matched_count: matched.length,
      unmatched_count: unmatched.length,
      matched,
      unmatched
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});