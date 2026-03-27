import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';
const CLIENT_ID = 'C84gmzGW0STm';
const CLIENT_SECRET = 'jCAiY13645iCfRljftcvAES3BZNL1W5Z';

async function getFortnoxToken() {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'articles suppliers articles:read articles:write suppliers:read suppliers:write'
  });

  const response = await fetch(FORTNOX_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token request failed: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function syncArticleToFortnox(accessToken, article) {
  const articleData = {
    ArticleNumber: article.sku || `ART-${article.id}`,
    Description: article.name,
    PurchasePrice: article.unit_cost || 0,
    Type: article.storage_type === 'company_owned' ? 'STOCK' : 'SERVICE',
    Manufacturer: article.manufacturer || '',
    ManufacturerArticleNumber: article.supplier_product_code || '',
    Height: article.dimensions_height_mm || 0,
    Depth: article.dimensions_depth_mm || 0,
    Note: article.transit_notes || ''
  };

  if (article.min_stock_level) {
    articleData.StockWarning = article.min_stock_level;
  }

  const response = await fetch(`${FORTNOX_API_BASE}/articles/${articleData.ArticleNumber}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ Article: articleData })
  });

  return response.ok;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only sync if article is marked as fortnox_synced and critical fields changed
    if (!data || !data.fortnox_synced) {
      return Response.json({ skipped: true });
    }

    const trackedFields = ['stock_qty', 'unit_cost', 'min_stock_level', 'name', 'supplier_name', 'storage_type'];
    const changedFields = event?.changed_fields || [];
    const hasTrackedChange = trackedFields.some(field => changedFields.includes(field));

    if (!hasTrackedChange) {
      return Response.json({ skipped: true });
    }

    // Get Fortnox token and sync
    const accessToken = await getFortnoxToken();
    const success = await syncArticleToFortnox(accessToken, data);

    if (success) {
      console.log(`Auto-synced article ${data.id} to Fortnox`);
    } else {
      console.error(`Failed to auto-sync article ${data.id} to Fortnox`);
    }

    return Response.json({ success });
  } catch (error) {
    console.error('Auto-sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});