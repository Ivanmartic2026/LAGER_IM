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

async function syncArticles(accessToken, base44, articles) {
  let succeeded = 0;
  const errors = [];

  for (const article of articles) {
    try {
      // Skip articles without SKU
      if (!article.sku) {
        console.warn(`Skipping article ${article.id} - no SKU`);
        continue;
      }

      const articleNumber = article.sku;
      const description = article.name || articleNumber;

      // First check if article exists in Fortnox
      const checkRes = await fetch(`${FORTNOX_API_BASE}/articles/${encodeURIComponent(articleNumber)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      let createResponse;
      if (!checkRes.ok) {
        // Create new article (no SalesPrice - read-only)
        createResponse = await fetch(`${FORTNOX_API_BASE}/articles`, {
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
      } else {
        // Update existing article (no SalesPrice - read-only)
        createResponse = await fetch(`${FORTNOX_API_BASE}/articles/${encodeURIComponent(articleNumber)}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            Article: {
              Description: description,
              PurchasePrice: article.unit_cost || 0,
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
      }

      if (createResponse.ok) {
        // Mark as synced in database
        await base44.asServiceRole.entities.Article.update(article.id, { fortnox_synced: true }).catch(() => {});
        succeeded++;
      } else {
        const errorText = await createResponse.text();
        console.error(`Failed to sync article ${articleNumber}: ${createResponse.status} - ${errorText}`);
        errors.push({ sku: articleNumber, error: errorText });
      }
    } catch (error) {
      console.error(`Error syncing article ${article.id}:`, error);
      errors.push({ sku: article.sku, error: error.message });
    }
  }

  return { succeeded, errors };
}

async function syncSuppliers(accessToken, base44) {
  let succeeded = 0;
  let failed = 0;

  const suppliers = await base44.asServiceRole.entities.Supplier.list();
  const activeSuppliers = suppliers.filter(s => s.is_active !== false);

  for (const supplier of activeSuppliers) {
    try {
      const supplierData = {
        Name: supplier.name
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
        const responseData = await response.json();
        const fortnoxNumber = responseData?.Supplier?.SupplierNumber;
        if (fortnoxNumber) {
          await base44.asServiceRole.entities.Supplier.update(supplier.id, {
            fortnox_supplier_number: fortnoxNumber
          });
        }
        succeeded++;
      } else {
        const errText = await response.text();
        console.warn(`Failed to push supplier ${supplier.name}: ${response.status} - ${errText}`);
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

async function ensureSupplierInFortnox(accessToken, base44, supplierId) {
  if (!supplierId) return null;

  const supplier = await base44.asServiceRole.entities.Supplier.get(supplierId).catch(() => null);
  if (!supplier) return null;

  // Already has a Fortnox supplier number
  if (supplier.fortnox_supplier_number) return supplier.fortnox_supplier_number;

  // Check if supplier exists in Fortnox by name
  const searchRes = await fetch(`${FORTNOX_API_BASE}/suppliers?limit=500`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    const allSuppliers = searchData.Suppliers || [];
    const match = allSuppliers.find(s => s.Name?.toLowerCase().trim() === supplier.name?.toLowerCase().trim());
    if (match) {
      await base44.asServiceRole.entities.Supplier.update(supplierId, {
        fortnox_supplier_number: match.SupplierNumber
      });
      return match.SupplierNumber;
    }
  }

  // Not found — create in Fortnox
  const createRes = await fetch(`${FORTNOX_API_BASE}/suppliers`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      Supplier: {
        Name: supplier.name?.trim() || ''
      }
    })
  });

  if (createRes.ok) {
    const createData = await createRes.json();
    const fortnoxNumber = createData?.Supplier?.SupplierNumber;
    if (fortnoxNumber) {
      await base44.asServiceRole.entities.Supplier.update(supplierId, {
        fortnox_supplier_number: fortnoxNumber
      });
      return fortnoxNumber;
    }
  } else {
    const errText = await createRes.text();
    console.warn(`ensureSupplierInFortnox: kunde inte skapa leverantör ${supplier.name}: ${errText}`);
  }

  return null;
}

async function createFortnoxInboundDelivery(accessToken, base44, poId) {
  const diagnostics = {
    po: null,
    items: [],
    rows: [],
    skippedItems: [],
    fortnoxRequest: null,
    fortnoxResponse: null,
    fortnoxResponseBody: null
  };

  const po = await base44.asServiceRole.entities.PurchaseOrder.get(poId);
  if (!po) throw new Error(`PO ${poId} hittades inte`);
  if (po.status !== 'received') throw new Error(`PO ${poId} har status '${po.status}', måste vara 'received'`);

  diagnostics.po = {
    id: po.id,
    po_number: po.po_number,
    supplier_name: po.supplier_name,
    supplier_id: po.supplier_id,
    status: po.status,
    fortnox_project_number: po.fortnox_project_number
  };

  const items = await base44.asServiceRole.entities.PurchaseOrderItem.filter({
    purchase_order_id: poId
  });

  diagnostics.items = items.map(i => ({
    id: i.id,
    article_id: i.article_id,
    article_name: i.article_name,
    article_sku: i.article_sku,
    quantity_ordered: i.quantity_ordered,
    quantity_received: i.quantity_received
  }));

  if (!items || items.length === 0) {
    return { succeeded: 0, failed: 0, diagnostics, error: 'Inga orderrader hittades för denna PO' };
  }

  const rows = [];
  for (const item of items) {
    if (!item.quantity_received || item.quantity_received <= 0) {
      diagnostics.skippedItems.push({ id: item.id, reason: 'quantity_received är 0 eller saknas', article_name: item.article_name });
      continue;
    }

    const article = item.article_id
      ? await base44.asServiceRole.entities.Article.get(item.article_id)
      : null;

    // Fortnox tillåter endast a-z, A-Z, 0-9, _ - / + i artikelnummer
    const sanitizeSku = (sku) => sku ? sku.replace(/[^a-zA-Z0-9_\-\/+]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : null;

    let rawArticleNumber = article?.sku || item.article_sku;
    let articleNumber = sanitizeSku(rawArticleNumber);

    // Om articleNumber saknas, försök skapa artikeln i Fortnox automatiskt
    if (!articleNumber) {
      const articleName = article?.name || item.article_name || `Artikel-${item.id.slice(0, 8)}`;
      console.log(`Ingen SKU för "${articleName}", försöker skapa i Fortnox automatiskt...`);

      // Skapa artikel i Fortnox
      const autoSku = `AUTO-${item.id.slice(0, 8).toUpperCase()}`;
      const createArticleRes = await fetch(`${FORTNOX_API_BASE}/articles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          Article: {
            ArticleNumber: autoSku,
            Description: articleName,
            PurchasePrice: article?.unit_cost || item.unit_price || 0,
            Type: 'STOCK'
          }
        })
      });

      if (createArticleRes.ok) {
        const created = await createArticleRes.json();
        articleNumber = created?.Article?.ArticleNumber || autoSku;
        console.log(`Skapade artikel i Fortnox: ${articleNumber}`);

        // Spara SKU på artikeln i Lager AI om vi har ett article_id
        if (article?.id) {
          await base44.asServiceRole.entities.Article.update(article.id, { sku: articleNumber });
          console.log(`Uppdaterade SKU på artikel ${article.id} → ${articleNumber}`);
        }
      } else {
        const errText = await createArticleRes.text();
        console.warn(`Kunde inte skapa artikel "${articleName}" i Fortnox: ${errText}`);
        diagnostics.skippedItems.push({ id: item.id, reason: `Kunde inte skapa artikel i Fortnox: ${errText}`, article_name: articleName });
        continue;
      }
    } else {
    // Artikelnummer finns — verifiera att artikeln existerar i Fortnox, skapa om inte
    // Om SKU-sanering ändrade articleNumber, uppdatera artikeln med det rensade SKU:et
    if (rawArticleNumber !== articleNumber && article?.id) {
      await base44.asServiceRole.entities.Article.update(article.id, { sku: articleNumber });
      console.log(`Rensade SKU "${rawArticleNumber}" → "${articleNumber}" för artikel ${article.id}`);
    }
    const checkRes = await fetch(`${FORTNOX_API_BASE}/articles/${encodeURIComponent(articleNumber)}`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });

      if (!checkRes.ok) {
        console.log(`Artikel "${articleNumber}" finns inte i Fortnox, skapar...`);
        const articleName = article?.name || item.article_name || articleNumber;
        const createRes = await fetch(`${FORTNOX_API_BASE}/articles`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            Article: {
              ArticleNumber: articleNumber,
              Description: articleName,
              PurchasePrice: article?.unit_cost || item.unit_price || 0,
              Type: 'STOCK'
            }
          })
        });

        if (!createRes.ok) {
          const errText = await createRes.text();
          console.warn(`Kunde inte skapa artikel "${articleNumber}" i Fortnox: ${errText}`);
          diagnostics.skippedItems.push({ id: item.id, reason: `Artikel saknas i Fortnox och kunde inte skapas: ${errText}`, article_name: articleName });
          continue;
        }
        console.log(`Skapade artikel "${articleNumber}" i Fortnox`);
      }
    }

    rows.push({
      ArticleNumber: articleNumber,
      DeliveredQuantity: item.quantity_received
    });
  }

  diagnostics.rows = rows;

  if (rows.length === 0) {
    return { succeeded: 0, failed: 0, diagnostics, error: 'Inga rader med mottagna artiklar och giltiga SKU:er att skicka' };
  }

  // Säkerställ att leverantören finns i Fortnox (matcha, skapa vid behov) och hämta nummer
  let supplierNumber = '';
  if (po.supplier_id) {
    supplierNumber = await ensureSupplierInFortnox(accessToken, base44, po.supplier_id) || '';
    console.log(`Leverantör Fortnox-nummer: ${supplierNumber || '(ej funnet)'}`);
  }

  const invoiceDate = po.received_date ? po.received_date.split('T')[0] : new Date().toISOString().split('T')[0];

  const supplierInvoiceData = {
    SupplierNumber: supplierNumber,
    InvoiceDate: invoiceDate,
    DueDate: invoiceDate,
    Comments: po.po_number ? `Inköpsorder: ${po.po_number}` : '',
    SupplierInvoiceRows: rows.map(r => ({
      ArticleNumber: r.ArticleNumber,
      Quantity: r.DeliveredQuantity,
      Price: 0
    }))
  };

  diagnostics.fortnoxRequest = supplierInvoiceData;

  const response = await fetch(`${FORTNOX_API_BASE}/supplierinvoices`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ SupplierInvoice: supplierInvoiceData })
  });

  const responseBody = await response.text();
  diagnostics.fortnoxResponse = { status: response.status, statusText: response.statusText };

  let parsedBody;
  try { parsedBody = JSON.parse(responseBody); } catch { parsedBody = responseBody; }
  diagnostics.fortnoxResponseBody = parsedBody;

  if (response.ok) {
    const goodsReceiptNumber = parsedBody?.SupplierInvoice?.GivenNumber || parsedBody?.SupplierInvoice?.SupplierInvoiceNumber;
    if (goodsReceiptNumber) {
      await base44.asServiceRole.entities.PurchaseOrder.update(poId, {
        fortnox_incoming_goods_id: String(goodsReceiptNumber)
      });
    }
    return { succeeded: 1, failed: 0, diagnostics, goodsReceiptNumber };
  } else {
    console.error(`Fortnox inleverans misslyckades: ${response.status} - ${responseBody}`);
    return { succeeded: 0, failed: 1, diagnostics, error: `Fortnox svarade ${response.status}: ${responseBody}` };
  }
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
          success: result.succeeded > 0,
          synced: result.succeeded,
          goodsReceiptNumber: result.goodsReceiptNumber || null,
          diagnostics: result.diagnostics,
          errors: result.error ? [result.error] : []
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
        result = await syncArticles(accessToken, base44, articles);
      } else if (syncType === 'suppliers') {
        result = await syncSuppliers(accessToken, base44);
      } else if (syncType === 'purchaseOrders') {
        result = await syncPurchaseOrders(accessToken, base44);
      } else {
        return Response.json({ error: 'Invalid sync type' }, { status: 400 });
      }

      return Response.json({
        success: result.errors.length === 0,
        synced: result.succeeded,
        errors: result.errors || []
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