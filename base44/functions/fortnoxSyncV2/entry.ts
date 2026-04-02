import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

async function getFortnoxToken(base44) {
  const configs = await base44.entities.FortnoxConfig.list();
  if (!configs || configs.length === 0) throw new Error('Fortnox inte ansluten');
  
  const config = configs[0];
  const now = Date.now();
  
  // Token valid for another 5 min?
  if (config.access_token && config.token_expires_at && (config.token_expires_at - 300000) > now) {
    return config.access_token;
  }
  
  // Refresh needed
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
  
  await base44.entities.FortnoxConfig.update(config.id, {
    access_token: data.access_token,
    token_expires_at: expiresAt,
    refresh_token: data.refresh_token || config.refresh_token
  });
  
  return data.access_token;
}

async function syncArticles(accessToken, articles) {
  let succeeded = 0;
  let failed = 0;

  for (const article of articles) {
    try {
      const articleNumber = article.sku || article.ArticleNumber || `ART-${article.id}`;
      const description = article.name || article.Description;

      const createResponse = await fetch(`${FORTNOX_API_BASE}/articles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          Article: {
            ArticleNumber: articleNumber,
            Description: description,
            PurchasePrice: article.unit_cost || 0,
            SalesPrice: article.unit_cost || 0,
            Type: article.storage_type === 'company_owned' ? 'STOCK' : 'SERVICE',
            Manufacturer: article.manufacturer || '',
            ManufacturerArticleNumber: article.supplier_product_code || '',
            Height: article.dimensions_height_mm || 0,
            Depth: article.dimensions_depth_mm || 0,
            Note: article.transit_notes || '',
            StockWarning: article.min_stock_level || 0
          }
        })
      });

      if (createResponse.ok) {
        succeeded++;
      } else {
        const errorText = await createResponse.text();
        console.error(`Failed to create article ${articleNumber}: ${createResponse.status} - ${errorText}`);
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

async function syncPurchaseOrders(accessToken, base44, poId) {
    let succeeded = 0;
    let failed = 0;

    const orders = poId 
      ? [await base44.asServiceRole.entities.PurchaseOrder.get(poId)]
      : await base44.asServiceRole.entities.PurchaseOrder.list();

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

async function createFortnoxInboundDelivery(accessToken, base44, poId) {
  let succeeded = 0;
  let failed = 0;

  const po = await base44.asServiceRole.entities.PurchaseOrder.get(poId);
  if (!po || po.status !== 'received') {
    throw new Error(`PO ${poId} not received or not found`);
  }

  try {
    // Fetch all items for this PO
    const items = await base44.asServiceRole.entities.PurchaseOrderItem.filter({
      purchase_order_id: poId
    });

    if (!items || items.length === 0) {
      return { succeeded: 0, failed: 0 };
    }

    // Build invoice rows with article numbers and quantities
    const invoiceRows = [];
    for (const item of items) {
      if (item.quantity_received <= 0) continue;

      const article = item.article_id 
        ? await base44.asServiceRole.entities.Article.get(item.article_id)
        : null;

      const articleNumber = article?.fortnox_article_number || article?.sku || item.article_sku;
      if (!articleNumber) {
        console.warn(`No article number for item ${item.id}, skipping`);
        continue;
      }

      invoiceRows.push({
        ArticleNumber: articleNumber,
        Quantity: item.quantity_received,
        Price: item.unit_price || 0
      });
    }

    if (invoiceRows.length === 0) {
      return { succeeded: 0, failed: 0 };
    }

    // Create supplier invoice (inbound delivery) in Fortnox
    const invoiceData = {
      SupplierNumber: po.supplier_id || '',
      SupplierName: po.supplier_name || '',
      InvoiceNumber: po.invoice_number || `MANUAL-${po.po_number}`,
      InvoiceDate: new Date().toISOString().split('T')[0],
      DueDate: new Date().toISOString().split('T')[0],
      Comments: `Automated inbound delivery from PO ${po.po_number}`,
      InvoiceRows: invoiceRows
    };

    const response = await fetch(`${FORTNOX_API_BASE}/supplierinvoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ SupplierInvoice: invoiceData })
    });

    if (response.ok) {
      succeeded = 1;
    } else {
      const errorText = await response.text();
      console.error(`Fortnox inbound delivery creation failed: ${response.status} - ${errorText}`);
      failed = 1;
    }
  } catch (error) {
    console.error(`Error creating inbound delivery for PO ${poId}:`, error);
    failed = 1;
  }

  return { succeeded, failed };
}

Deno.serve(async (req) => {
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();

      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await req.json();
      const { syncType, articles, purchaseOrderId, createInboundDelivery } = body;

      const accessToken = await getFortnoxToken(base44);

      // Create inbound delivery for received PO
      if (purchaseOrderId && createInboundDelivery) {
        const result = await createFortnoxInboundDelivery(accessToken, base44, purchaseOrderId);
        return Response.json({
          success: result.failed === 0,
          synced: result.succeeded,
          errors: result.failed > 0 ? ['Failed to create inbound delivery'] : []
        });
      }

      // Legacy: sync PO without inbound delivery
      if (purchaseOrderId) {
        const result = await syncPurchaseOrders(accessToken, base44, purchaseOrderId);
        return Response.json({
          success: true,
          synced: result.succeeded,
          errors: []
        });
      }

      if (!syncType) {
        return Response.json({ error: 'Missing syncType or purchaseOrderId' }, { status: 400 });
      }

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
        synced: result.succeeded,
        errors: []
      });
    } catch (error) {
      console.error('Fortnox sync error:', error);
      return Response.json({
        success: false,
        error: error.message,
        synced: 0,
        errors: [error.message]
      }, { status: 500 });
    }
});