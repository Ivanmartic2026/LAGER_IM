import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';
const FORTNOX_WAREHOUSE_BASE = 'https://api.fortnox.se/api/warehouse';

const COST_CENTER_MAP = {
  "10_support_service": "10",
  "20_rental": "20",
  "30_sales": "30",
  "99_generell": "99"
};

const WAY_OF_DELIVERY_MAP = {
  "air_freight_express": "FLYGFRAKT",
  "air_freight_economy": "FLYGFRAKT",
  "sea_freight": "SJÖFRAKT",
  "rail_transport": "JÄRNVÄG",
  "road_transport": "LANDTRANSPORT",
  "courier": "KURIR"
};

const PAYMENT_TERMS_MAP = {
  "100_procent_forskott": "0",
  "30_dagar_netto": "30",
  "30_dagar": "30",
  "10_dagar_2_procent": "10",
  "omedelbar_betalning": "0",
  "60_dagar_netto": "60",
  "60_dagar": "60"
};

const PURCHASE_TYPE_LABEL = {
  "påfyllning_lager": "Påfyllning lager",
  "specifik_kundorder": "Specifik kundorder",
  "dropship": "Dropship",
  "projekt_intern": "Projekt/Internt"
};

const CATEGORY_GROUP_MAP = {
  "Cabinet": "KAB",
  "LED Module": "LED",
  "Power Supply": "PSU",
  "Receiving Card": "CTRL",
  "Control Processor": "CTRL",
  "Computer": "KOMP",
  "Cable": "KABEL",
  "Accessory": "ACC",
  "Other": "OVR"
};

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

async function ensureArticleInFortnox(accessToken, base44, item) {
  // Sanitize SKU: replace spaces with dash, keep only allowed chars: A-Z a-z 0-9 _ - / +
  const sku = (item.article_sku || '').replace(/ /g, '-').replace(/[^A-Za-z0-9_\-\/+]/g, '');
  if (!sku) throw new Error(`Artikel "${item.article_name}" saknar SKU`);

  // Check if exists
  const checkRes = await fetch(`${FORTNOX_API_BASE}/articles/${encodeURIComponent(sku)}`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
  });

  if (checkRes.ok) return; // Already exists

  // Fetch article for category
  let category = null;
  if (item.article_id) {
    const art = await base44.asServiceRole.entities.Article.get(item.article_id).catch(() => null);
    category = art?.category;
  }

  const createRes = await fetch(`${FORTNOX_API_BASE}/articles`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      Article: {
        ArticleNumber: sku,
        Description: item.article_name || sku,
        PurchasePrice: item.unit_price || 0
      }
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Kunde inte skapa artikel ${sku} i Fortnox: ${errText}`);
  }

  // Mark article as synced
  if (item.article_id) {
    await base44.asServiceRole.entities.Article.update(item.article_id, { fortnox_synced: true }).catch(() => {});
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { purchaseOrderId } = await req.json();
    if (!purchaseOrderId) return Response.json({ error: 'purchaseOrderId krävs' }, { status: 400 });

    const po = await base44.asServiceRole.entities.PurchaseOrder.get(purchaseOrderId);
    if (!po) return Response.json({ error: 'PO hittades inte' }, { status: 404 });

    // === BATCH QUARANTINE HARD BLOCK ===
    // Check if any batches linked to this PO's receiving records are in quarantine
    const poReceivingRecords = await base44.asServiceRole.entities.ReceivingRecord.filter({ purchase_order_id: purchaseOrderId });
    const allBatchIds = poReceivingRecords.flatMap(r => r.batch_ids || []);
    if (allBatchIds.length > 0) {
      const quarantinedBatches = await base44.asServiceRole.entities.Batch.filter({ status: 'quarantine' });
      const blockedBatches = quarantinedBatches.filter(b => allBatchIds.includes(b.id));
      if (blockedBatches.length > 0) {
        await base44.asServiceRole.entities.POActivity.create({
          purchase_order_id: purchaseOrderId,
          type: 'system',
          message: `Fortnox-synk blockerad: ${blockedBatches.length} batcher i karantän (${blockedBatches.map(b => b.batch_number).join(', ')})`,
          actor_email: user.email
        });
        return Response.json({
          success: false,
          blocked: true,
          quarantine_count: blockedBatches.length,
          quarantine_batches: blockedBatches.map(b => ({ id: b.id, batch_number: b.batch_number })),
          error: `Inleverans innehåller ${blockedBatches.length} batcher i karantän — verifiera först`
        }, { status: 409 });
      }
    }

    // === VALIDATION ===
    const errors = [];

    const supplier = po.supplier_id
      ? await base44.asServiceRole.entities.Supplier.get(po.supplier_id).catch(() => null)
      : null;

    if (!supplier?.fortnox_supplier_number) {
      errors.push('Leverantören saknar Fortnox-leverantörsnummer');
    }

    const allItems = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ purchase_order_id: purchaseOrderId });
    // Skip items without SKU — warn but don't block
    const itemsMissingSku = allItems.filter(i => !i.article_sku);
    const items = allItems.filter(i => i.article_sku);
    if (items.length === 0) {
      errors.push('Inga artiklar med SKU hittades');
    }

    if (errors.length > 0) {
      return Response.json({ success: false, validationErrors: errors }, { status: 422 });
    }

    // === GET TOKEN ===
    const accessToken = await getFortnoxToken(base44);

    // === SYNC ARTICLES ===
    for (const item of items) {
      await ensureArticleInFortnox(accessToken, base44, item);
    }

    // === BUILD PO ROWS ===
    const rows = items.map(item => ({
      ArticleNumber: (item.article_sku || '').replace(/ /g, '-').replace(/[^A-Za-z0-9_\-\/+]/g, ''),
      Description: item.article_name || '',
      OrderedQuantity: item.quantity_ordered,
      Price: item.unit_price || 0
    }));

    const costCenter = po.cost_center ? po.cost_center.split('_')[0] : '';
    const purchaseTypeLabel = PURCHASE_TYPE_LABEL[po.purchase_type] || po.purchase_type || '';
    const comments = [
      purchaseTypeLabel ? `Typ: ${purchaseTypeLabel}` : '',
      po.notes || ''
    ].filter(Boolean).join(' | ');

    // === GET SUPPLIER DETAILS ===
    const supplierName = supplier.name || po.supplier_name || 'Okänd leverantör';
    const supplierAddress = supplier.address || '';
    const addressParts = supplierAddress.split(',').map(s => s.trim());

    // === GET WAREHOUSE STOCK POINT CODE ===
    let warehouseStockPointCode = null;
    if (po.warehouse_id) {
      const warehouse = await base44.asServiceRole.entities.Warehouse.get(po.warehouse_id).catch(() => null);
      if (warehouse?.fortnox_stock_point_code) {
        warehouseStockPointCode = warehouse.fortnox_stock_point_code;
      }
    }

    // === CREATE PURCHASE ORDER IN FORTNOX (warehouse API v1, camelCase) ===
    const ourRef = (po.intern_reference || po.po_number || '').substring(0, 50);
    const poBody = {
      supplierNumber: supplier.fortnox_supplier_number,
      orderDate: po.order_date || new Date().toISOString().split('T')[0],
      stockPointCode: warehouseStockPointCode || 'JKP-HER',
      ourReference: ourRef,
      remarks: comments,
      deliveryName: supplierName,
      deliveryAddress: addressParts[0] || supplierAddress || '-',
      deliveryZipCode: '-',
      deliveryCity: addressParts[1] || '-',
      rows: rows.map(r => ({
        itemId: r.ArticleNumber,
        description: r.Description,
        orderedQuantity: r.OrderedQuantity,
        price: r.Price
      }))
    };

    if (po.expected_delivery_date) poBody.deliveryDate = po.expected_delivery_date;
    if (po.fortnox_project_number && po.fortnox_project_number !== '-') poBody.project = po.fortnox_project_number;
    if (costCenter) poBody.costCenter = costCenter;
    if (po.delivery_terms) poBody.deliveryTerms = po.delivery_terms;
    if (po.mode_of_transport && WAY_OF_DELIVERY_MAP[po.mode_of_transport]) poBody.wayOfDelivery = WAY_OF_DELIVERY_MAP[po.mode_of_transport];
    const mappedPaymentTerms = po.payment_terms ? PAYMENT_TERMS_MAP[po.payment_terms] : "30";
    poBody.paymentTermsCode = mappedPaymentTerms;

    const poPayload = poBody;

    const createRes = await fetch(`${FORTNOX_WAREHOUSE_BASE}/purchaseorders-v1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(poPayload)
    });

    const responseText = await createRes.text();
    let responseData;
    try { responseData = JSON.parse(responseText); } catch { responseData = null; }

    if (!createRes.ok) {
      // Save error status
      await base44.asServiceRole.entities.PurchaseOrder.update(purchaseOrderId, {
        fortnox_po_sync_status: 'sync_error',
        fortnox_po_sync_error: `Fortnox svarade ${createRes.status}: ${responseText}`
      });
      await base44.asServiceRole.entities.SyncLog.create({
        sync_type: 'purchase_order_to_fortnox',
        status: 'error',
        error_message: `Fortnox svarade ${createRes.status}: ${responseText}`,
        triggered_by: user.email
      });
      return Response.json({ success: false, error: `Fortnox fel ${createRes.status}: ${responseText}` }, { status: 500 });
    }

    console.log('Fortnox PO response:', JSON.stringify(responseData));
    const documentNumber = responseData?.id || responseData?.documentNumber || responseData?.purchaseOrderNumber || responseData?.PurchaseOrder?.DocumentNumber;

    // === SAVE SUCCESS ===
    await base44.asServiceRole.entities.PurchaseOrder.update(purchaseOrderId, {
      fortnox_po_id: String(documentNumber || ''),
      fortnox_po_sync_status: 'synced',
      fortnox_po_synced_at: new Date().toISOString(),
      fortnox_po_sync_error: null
    });

    await base44.asServiceRole.entities.SyncLog.create({
      sync_type: 'purchase_order_to_fortnox',
      status: 'success',
      records_processed: 1,
      records_created: 1,
      triggered_by: user.email
    });

    await base44.asServiceRole.entities.POActivity.create({
      purchase_order_id: purchaseOrderId,
      type: 'system',
      message: `Leverantörsorder skapad i Fortnox #${documentNumber}`,
      actor_email: user.email
    });

    return Response.json({ 
      success: true, 
      documentNumber,
      skipped_items: itemsMissingSku.map(i => i.article_name || i.id)
    });

  } catch (error) {
    console.error('syncPurchaseOrderToFortnox error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});