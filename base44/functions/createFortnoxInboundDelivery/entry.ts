import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';

async function getFortnoxToken(base44) {
  const configs = await base44.asServiceRole.entities.FortnoxConfig.list({});
  if (!configs || configs.length === 0) throw new Error('No FortnoxConfig found');
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
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchase_order_id, items, complete } = await req.json();
    if (!purchase_order_id) {
      return Response.json({ error: 'Missing purchase_order_id' }, { status: 400 });
    }

    // Fetch PurchaseOrder
    const purchaseOrder = await base44.asServiceRole.entities.PurchaseOrder.get(purchase_order_id);
    if (!purchaseOrder) {
      throw new Error(`PurchaseOrder not found: ${purchase_order_id}`);
    }
    console.log(`[1] PurchaseOrder: ${purchaseOrder.po_number}`);

    const accessToken = await getFortnoxToken(base44);
    console.log(`[2] Fortnox token obtained`);

    // Build rows from provided items or fetch PO items
    let rows = [];
    if (items && items.length > 0) {
      rows = items.map(item => ({
        ArticleNumber: item.article_sku || item.sku,
        DeliveredQuantity: item.quantity_received || item.quantity,
        Price: item.unit_price || 0
      }));
    } else {
      // Fetch PO items automatically
      const poItems = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ purchase_order_id });
      rows = poItems
        .filter(i => i.quantity_received > 0)
        .map(i => ({
          ArticleNumber: i.article_sku,
          DeliveredQuantity: i.quantity_received,
          Price: i.unit_price || 0
        }));
    }

    if (rows.length === 0) {
      throw new Error('Inga artikelrader att skicka till Fortnox');
    }

    const today = new Date().toISOString().split('T')[0];

    // POST /3/supplierinvoices or /3/incominggoods
    // Fortnox uses /3/incominggoods for warehouse incoming goods
    const body = {
      IncomingGoods: {
        SupplierNumber: purchaseOrder.supplier_id || undefined,
        DeliveryDate: today,
        OurReference: purchaseOrder.po_number || purchaseOrder.id.slice(0, 8),
        Comments: `PO: ${purchaseOrder.po_number || purchaseOrder.id}`,
        IncomingGoodsRows: rows.map(r => ({
          ArticleNumber: r.ArticleNumber,
          DeliveredQuantity: r.DeliveredQuantity,
          Price: r.Price
        }))
      }
    };

    console.log(`[3] POST /3/incominggoods with ${rows.length} rows`);
    const createRes = await fetch('https://api.fortnox.se/3/incominggoods', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const resText = await createRes.text();
    console.log(`[4] Fortnox response status: ${createRes.status}, body: ${resText.slice(0, 500)}`);

    if (!createRes.ok) {
      throw new Error(`Fortnox incominggoods failed (${createRes.status}): ${resText}`);
    }

    const resData = JSON.parse(resText);
    const fortnoxId = resData.IncomingGoods?.GoodsReceiptNumber || resData.IncomingGoods?.DocumentNumber || resData.IncomingGoods?.id;

    if (fortnoxId) {
      // Save Fortnox ID on PurchaseOrder
      await base44.asServiceRole.entities.PurchaseOrder.update(purchase_order_id, {
        fortnox_incoming_goods_id: String(fortnoxId)
      });
      console.log(`[5] Saved fortnox_incoming_goods_id: ${fortnoxId}`);

      // If complete=true, mark as WarehouseReady
      if (complete) {
        const completeRes = await fetch(`https://api.fortnox.se/3/incominggoods/${fortnoxId}/warehouseready`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        console.log(`[6] WarehouseReady response: ${completeRes.status}`);
        if (!completeRes.ok) {
          const errText = await completeRes.text();
          console.warn(`[6] WarehouseReady warning (non-fatal): ${errText}`);
        }
      }
    }

    return Response.json({ success: true, fortnoxId, data: resData.IncomingGoods });

  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});