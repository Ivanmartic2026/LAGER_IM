import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

// Get OAuth token from FortnoxConfig with automatic refresh
async function getFortnoxToken(base44) {
  const configs = await base44.asServiceRole.entities.FortnoxConfig.list();
  if (!configs || configs.length === 0) throw new Error('Fortnox inte ansluten');

  const config = configs[0];
  const now = Date.now();

  // Return existing token if valid (with 5 min buffer)
  if (config.access_token && config.token_expires_at && (config.token_expires_at - 300000) > now) {
    return config.access_token;
  }

  // Refresh token
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

// Sync Articles
async function syncArticles(accessToken, articles) {
  let succeeded = 0;
  let failed = 0;

  for (const article of articles) {
    try {
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

      // Try to create or update article
      const response = await fetch(`${FORTNOX_API_BASE}/articles/${articleData.ArticleNumber}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ Article: articleData })
      });

      if (response.ok) {
        succeeded++;
      } else if (response.status === 404) {
        // Try to create if not found
        const createResponse = await fetch(`${FORTNOX_API_BASE}/articles`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ Article: articleData })
        });

        if (createResponse.ok) {
          succeeded++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Error syncing article ${article.id}:`, error);
      failed++;
    }
  }

  return { succeeded, failed };
}

// Sync Suppliers
async function syncSuppliers(accessToken, suppliers) {
  let succeeded = 0;
  let failed = 0;

  for (const supplier of suppliers) {
    try {
      const supplierData = {
        Name: supplier.name,
        Address: supplier.address || '',
        ContactPerson: supplier.contact_person || '',
        Email: supplier.email || '',
        Phone: supplier.phone || '',
        Website: supplier.website || ''
      };

      const response = await fetch(`${FORTNOX_API_BASE}/suppliers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ Supplier: supplierData })
      });

      if (response.ok) {
        succeeded++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Error syncing supplier ${supplier.id}:`, error);
      failed++;
    }
  }

  return { succeeded, failed };
}

// Sync Purchase Orders
async function syncPurchaseOrders(accessToken, orders) {
  let succeeded = 0;
  let failed = 0;

  for (const order of orders) {
    try {
      const orderData = {
        OrderNumber: order.po_number || '',
        SupplierNumber: order.supplier_id || '',
        SupplierName: order.supplier_name || '',
        OrderDate: order.order_date || new Date().toISOString().split('T')[0],
        Comments: order.notes || '',
        TermsOfPayment: order.payment_terms?.replace(/_/g, ' ') || '30 days net'
      };

      const response = await fetch(`${FORTNOX_API_BASE}/purchase-orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ PurchaseOrder: orderData })
      });

      if (response.ok) {
        succeeded++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Error syncing purchase order ${order.id}:`, error);
      failed++;
    }
  }

  return { succeeded, failed };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { syncType } = await req.json();

    if (!syncType) {
      return Response.json({ error: 'Missing required parameter: syncType' }, { status: 400 });
    }

    // Get Fortnox token (automatic refresh from FortnoxConfig)
    const accessToken = await getFortnoxToken(base44);

    let result;

    if (syncType === 'articles') {
      const articles = await base44.asServiceRole.entities.Article.list();
      result = await syncArticles(accessToken, articles);
    } else if (syncType === 'suppliers') {
      const suppliers = await base44.asServiceRole.entities.Supplier.list();
      const activeSuppliers = suppliers.filter(s => s.is_active !== false);
      result = await syncSuppliers(accessToken, activeSuppliers);
    } else if (syncType === 'purchaseOrders') {
      const orders = await base44.asServiceRole.entities.PurchaseOrder.list();
      result = await syncPurchaseOrders(accessToken, orders);
    } else {
      return Response.json({ error: 'Invalid sync type' }, { status: 400 });
    }

    return Response.json({
      success: true,
      type: syncType,
      succeeded: result.succeeded,
      failed: result.failed
    });
  } catch (error) {
    console.error('Fortnox sync error:', error);
    return Response.json({
      success: false,
      error: error.message,
      type: '',
      succeeded: 0,
      failed: 0
    }, { status: 500 });
  }
});