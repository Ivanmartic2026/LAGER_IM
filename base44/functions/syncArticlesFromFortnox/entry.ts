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

async function fetchAllArticles(accessToken) {
  const articles = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${FORTNOX_API}/articles?limit=100&page=${page}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fortnox articles fetch failed (page ${page}): ${text}`);
    }
    const data = await res.json();
    const batch = data.Articles || [];
    articles.push(...batch);
    const meta = data.MetaInformation;
    if (!meta || page >= Math.ceil((meta['@TotalResources'] || 0) / 100)) break;
    page++;
  }
  return articles;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Load FortnoxConfig
    const configs = await base44.asServiceRole.entities.FortnoxConfig.list();
    const config = configs[0];
    if (!config) return Response.json({ error: 'Ingen FortnoxConfig hittad' }, { status: 400 });

    let accessToken = config.access_token;
    let updatedConfig = {};

    // Refresh token if needed
    if (config.refresh_token) {
      const tokenData = await refreshFortnoxToken(config.refresh_token);
      accessToken = tokenData.access_token;
      updatedConfig = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || config.refresh_token,
      };
      await base44.asServiceRole.entities.FortnoxConfig.update(config.id, updatedConfig);
    }

    // Fetch all articles from Fortnox
    const fortnoxArticles = await fetchAllArticles(accessToken);

    // Load existing articles indexed by SKU
    const existingArticles = await base44.asServiceRole.entities.Article.list();
    const skuMap = {};
    for (const a of existingArticles) {
      if (a.sku) skuMap[a.sku] = a;
    }

    let created = 0, updated = 0, skipped = 0;

    for (const fa of fortnoxArticles) {
      const sku = fa.ArticleNumber;
      if (!sku) { skipped++; continue; }

      const mapped = {
        sku,
        name: fa.Description || sku,
        unit_cost: fa.PurchasePrice != null ? parseFloat(fa.PurchasePrice) : undefined,
        manufacturer: fa.Manufacturer || undefined,
        status: fa.Active === false ? 'discontinued' : 'active',
        fortnox_synced: true,
        storage_type: 'company_owned',
      };
      // Remove undefined fields
      Object.keys(mapped).forEach(k => mapped[k] === undefined && delete mapped[k]);

      if (skuMap[sku]) {
        // Update only allowed fields
        const updatePayload = {
          name: mapped.name,
          unit_cost: mapped.unit_cost,
          status: mapped.status,
          fortnox_synced: true,
        };
        if (mapped.manufacturer) updatePayload.manufacturer = mapped.manufacturer;
        Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k]);
        await base44.asServiceRole.entities.Article.update(skuMap[sku].id, updatePayload);
        updated++;
      } else {
        await base44.asServiceRole.entities.Article.create(mapped);
        created++;
      }
    }

    // Write SyncLog
    await base44.asServiceRole.entities.SyncLog.create({
      sync_type: 'articles_from_fortnox',
      status: 'success',
      records_processed: fortnoxArticles.length,
      records_created: created,
      records_updated: updated,
      records_skipped: skipped,
      triggered_by: user.email,
      details: { fortnox_article_count: fortnoxArticles.length },
    });

    return Response.json({ success: true, processed: fortnoxArticles.length, created, updated, skipped });
  } catch (error) {
    // Try to log the error
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SyncLog.create({
        sync_type: 'articles_from_fortnox',
        status: 'error',
        error_message: error.message,
        triggered_by: 'system',
      });
    } catch (_) { /* ignore log errors */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});