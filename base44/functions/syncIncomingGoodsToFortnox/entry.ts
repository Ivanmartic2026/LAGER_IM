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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { purchaseOrderId } = await req.json();
    if (!purchaseOrderId) return Response.json({ error: 'purchaseOrderId krävs' }, { status: 400 });

    const po = await base44.asServiceRole.entities.PurchaseOrder.get(purchaseOrderId);
    if (!po) return Response.json({ error: 'PO hittades inte' }, { status: 404 });
    if (!po.fortnox_po_id) return Response.json({ error: 'PO är inte synkad till Fortnox ännu' }, { status: 422 });

    // Get supplier
    const supplier = po.supplier_id
      ? await base44.asServiceRole.entities.Supplier.get(po.supplier_id).catch(() => null)
      : null;

    if (!supplier?.fortnox_supplier_number) {
      return Response.json({ error: 'Leverantören saknar Fortnox-leverantörsnummer' }, { status: 422 });
    }

    // Get receiving records for this PO
    const receivingRecords = await base44.asServiceRole.entities.ReceivingRecord.filter({ purchase_order_id: purchaseOrderId });
    if (!receivingRecords || receivingRecords.length === 0) {
      return Response.json({ error: 'Inga mottagningsrader hittades' }, { status: 422 });
    }

    // Get PO items to map article SKUs
    const poItems = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ purchase_order_id: purchaseOrderId });
    const itemMap = {};
    for (const item of poItems) {
      itemMap[item.id] = item;
    }

    const costCenter = COST_CENTER_MAP[po.cost_center] || '';
    const today = new Date().toISOString().split('T')[0];

    const rows = [];
    for (const record of receivingRecords) {
      if (!record.quantity_received || record.quantity_received <= 0) continue;
      const poItem = itemMap[record.purchase_order_item_id];
      const rawSku = poItem?.article_sku;
      if (!rawSku) continue;
      const sku = rawSku.replace(/ /g, '-').replace(/[^A-Za-z0-9_\-\/+]/g, '');

      const row = {
        itemId: sku,
        receivedQuantity: record.quantity_received,
        stockPointCode: 'JKP-HER'
      };
      if (po.fortnox_project_number) row.project = po.fortnox_project_number;
      if (costCenter) row.costCenter = costCenter;
      rows.push(row);
    }

    if (rows.length === 0) {
      return Response.json({ error: 'Inga rader med giltiga artiklar och kvantiteter att skicka' }, { status: 422 });
    }

    const accessToken = await getFortnoxToken(base44);

    // === CREATE INLEVERANS (warehouse API uses camelCase) ===
    // deliveryNoteId MUST be the Fortnox PO ID from the linked PurchaseOrder
    const deliveryNoteId = po.fortnox_po_id;
    if (!deliveryNoteId) {
      return Response.json({ error: 'Inköpsordern saknar Fortnox PO-nummer. Kör "Skicka till Fortnox" först.' }, { status: 422 });
    }
    const payload = {
      supplierNumber: supplier.fortnox_supplier_number,
      deliveryNoteId: String(deliveryNoteId),
      stockPointCode: 'JKP-HER',
      date: today,
      note: `Inkommande Gods registrerat via Lager AI – PO ${po.po_number || po.id}`,
      rows
    };

    const createRes = await fetch(`${FORTNOX_WAREHOUSE_BASE}/incominggoods-v1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await createRes.text();
    let responseData;
    try { responseData = JSON.parse(responseText); } catch { responseData = null; }

    if (!createRes.ok) {
      await base44.asServiceRole.entities.SyncLog.create({
        sync_type: 'incoming_goods_to_fortnox',
        status: 'error',
        error_message: `Fortnox svarade ${createRes.status}: ${responseText}`,
        triggered_by: user.email
      });
      return Response.json({ success: false, error: `Fortnox fel ${createRes.status}: ${responseText}` }, { status: 500 });
    }

    console.log('Fortnox inleverans response:', JSON.stringify(responseData));
    // Warehouse API returns camelCase: id or goodsReceiptNumber
    const incomingGoodsNumber = responseData?.id || responseData?.goodsReceiptNumber || responseData?.IncomingGoods?.GivenNumber;

    // === FETCH FULL RECORD TO GET UUID ===
    let resourceUuid = null;
    if (incomingGoodsNumber) {
      const getRes = await fetch(`${FORTNOX_WAREHOUSE_BASE}/incominggoods-v1/${incomingGoodsNumber}`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });
      const getText = await getRes.text();
      console.log(`GET inleverans ${incomingGoodsNumber} → ${getRes.status}: ${getText}`);
      try {
        const getJson = JSON.parse(getText);
        resourceUuid = getJson?.uuid || getJson?.id;
      } catch {}
    }

    // === COMPLETE THE INLEVERANS via PUT with completed:true ===
    let completed = false;
    let completeError = null;
    if (incomingGoodsNumber && responseData) {
      // Build updated payload with completed:true
      const updatePayload = { ...responseData, completed: true };
      const putRes = await fetch(`${FORTNOX_WAREHOUSE_BASE}/incominggoods-v1/${incomingGoodsNumber}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      const putText = await putRes.text();
      console.log(`PUT complete inleverans ${incomingGoodsNumber} → ${putRes.status}: ${putText}`);
      if (putRes.ok) {
        completed = true;
      } else {
        completeError = `PUT ${putRes.status}: ${putText}`;
        // Fallback: try PATCH
        const patchRes = await fetch(`${FORTNOX_WAREHOUSE_BASE}/incominggoods-v1/${incomingGoodsNumber}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true })
        });
        const patchText = await patchRes.text();
        console.log(`PATCH complete inleverans ${incomingGoodsNumber} → ${patchRes.status}: ${patchText}`);
        if (patchRes.ok) {
          completed = true;
          completeError = null;
        } else {
          completeError += ` | PATCH ${patchRes.status}: ${patchText}`;
        }
      }
    }

    // === SAVE RESULT ===
    const existingId = po.fortnox_incoming_goods_id;
    const newId = existingId
      ? `${existingId},${incomingGoodsNumber}`
      : String(incomingGoodsNumber || '');

    await base44.asServiceRole.entities.PurchaseOrder.update(purchaseOrderId, {
      fortnox_incoming_goods_id: newId
    });

    await base44.asServiceRole.entities.SyncLog.create({
      sync_type: 'incoming_goods_to_fortnox',
      status: 'success',
      records_processed: rows.length,
      triggered_by: user.email
    });

    await base44.asServiceRole.entities.POActivity.create({
      purchase_order_id: purchaseOrderId,
      type: 'system',
      message: `Inleverans #${incomingGoodsNumber} registrerad i Fortnox`,
      actor_email: user.email
    });

    return Response.json({ success: true, incomingGoodsNumber, completed, completeError });

  } catch (error) {
    console.error('syncIncomingGoodsToFortnox error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});