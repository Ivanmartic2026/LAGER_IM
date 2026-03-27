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

async function syncSuppliers(accessToken, base44) {
  let succeeded = 0;
  let failed = 0;

  const suppliers = await base44.asServiceRole.entities.Supplier.list();
  const activeSuppliers = suppliers.filter(s => s.is_active !== false);

  for (const supplier of activeSuppliers) {
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

async function syncPurchaseOrders(accessToken, base44) {
  let succeeded = 0;
  let failed = 0;

  const orders = await base44.asServiceRole.entities.PurchaseOrder.list();

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

    const { syncType, articles } = await req.json();

    if (!syncType) {
      return Response.json({ error: 'Missing syncType' }, { status: 400 });
    }

    const accessToken = await getFortnoxToken();
    let result;

    if (syncType === 'articles') {
      if (!articles || articles.length === 0) {
        return Response.json({ error: 'No articles provided' }, { status: 400 });
      }
      result = await syncArticles(accessToken, articles);
    } else if (syncType === 'suppliers') {
      result = await syncSuppliers(accessToken, base44);
    } else if (syncType === 'purchaseOrders') {
      result = await syncPurchaseOrders(accessToken, base44);
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
      succeeded: 0,
      failed: 0
    }, { status: 500 });
  }
});