import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { receiving_record_id } = await req.json();
    if (!receiving_record_id) {
      return Response.json({ error: 'Missing receiving_record_id' }, { status: 400 });
    }

    // 1. Fetch ReceivingRecord
    const receivingRecord = await base44.asServiceRole.entities.ReceivingRecord.get(receiving_record_id);
    if (!receivingRecord) {
      throw new Error(`ReceivingRecord not found: ${receiving_record_id}`);
    }
    console.log(`[1] ReceivingRecord fetched: id=${receivingRecord.id}, article_name=${receivingRecord.article_name}, qty=${receivingRecord.quantity_received}`);

    // 2. Fetch PurchaseOrderItem
    const poItem = await base44.asServiceRole.entities.PurchaseOrderItem.get(receivingRecord.purchase_order_item_id);
    if (!poItem) {
      throw new Error(`PurchaseOrderItem not found: ${receivingRecord.purchase_order_item_id}`);
    }
    console.log(`[2] PurchaseOrderItem fetched: id=${poItem.id}, article_sku=${poItem.article_sku}, unit_price=${poItem.unit_price}`);

    // If article_sku missing on POItem, fall back to Article.sku
    let articleSku = poItem.article_sku;
    if (!articleSku && receivingRecord.article_id) {
      const article = await base44.asServiceRole.entities.Article.get(receivingRecord.article_id);
      articleSku = article?.sku || null;
      console.log(`[2b] article_sku missing on POItem, fetched from Article: ${articleSku}`);
    }
    if (!articleSku) {
      throw new Error(`No article_sku found on PurchaseOrderItem or Article for receiving record ${receiving_record_id}`);
    }

    // 3. Fetch PurchaseOrder
    const purchaseOrder = await base44.asServiceRole.entities.PurchaseOrder.get(receivingRecord.purchase_order_id);
    if (!purchaseOrder) {
      throw new Error(`PurchaseOrder not found: ${receivingRecord.purchase_order_id}`);
    }
    console.log(`[3] PurchaseOrder fetched: id=${purchaseOrder.id}, po_number=${purchaseOrder.po_number}, warehouse_id=${purchaseOrder.warehouse_id || 'NULL'}`);

    // 4. Fetch Warehouse (optional - skip if warehouse_id is missing)
    let warehouse = null;
    if (purchaseOrder.warehouse_id) {
      warehouse = await base44.asServiceRole.entities.Warehouse.get(purchaseOrder.warehouse_id);
      if (!warehouse) {
        console.log(`[4] WARNING: warehouse_id set but Warehouse not found: ${purchaseOrder.warehouse_id}. Proceeding without stockPointCode.`);
      } else {
        console.log(`[4] Warehouse fetched: id=${warehouse.id}, code=${warehouse.code}`);
      }
    } else {
      console.log(`[4] No warehouse_id on PurchaseOrder — will use Fortnox default stock point`);
    }

    // 5. Fetch FortnoxConfig (access token)
    const configs = await base44.asServiceRole.entities.FortnoxConfig.list({});
    if (!configs || configs.length === 0) {
      throw new Error('No FortnoxConfig found');
    }
    const fortnoxConfig = configs[0];
    if (!fortnoxConfig.access_token) {
      throw new Error('FortnoxConfig has no access_token');
    }
    console.log(`[5] FortnoxConfig fetched, access_token present: ${!!fortnoxConfig.access_token}`);

    const today = new Date().toISOString().split('T')[0];
    const noteText = `PO: ${purchaseOrder.po_number || purchaseOrder.id}${receivingRecord.notes ? ' - ' + receivingRecord.notes : ''}`;

    // Build row — only include stockPointCode if we have a warehouse
    const row = {
      itemId: poItem.article_sku,
      quantity: receivingRecord.quantity_received,
      directCost: poItem.unit_price || 0,
      ...(warehouse?.code ? { stockPointCode: warehouse.code } : {})
    };

    // Build delivery body — only include stockPointCode if we have a warehouse
    const deliveryBody = {
      date: today,
      currency: "SEK",
      currencyRate: 1,
      currencyUnit: 1,
      note: noteText,
      ...(warehouse?.code ? { stockPointCode: warehouse.code } : {}),
      rows: [row]
    };

    console.log(`[6] Calling Fortnox POST /inbounddeliveries with body:`, JSON.stringify(deliveryBody));

    // 6. POST to Fortnox inbound deliveries
    const createResponse = await fetch('https://api.fortnox.se/api/warehouse/deliveries-v1/inbounddeliveries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fortnoxConfig.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deliveryBody)
    });

    console.log(`[7] Fortnox create response status: ${createResponse.status}`);

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      throw new Error(`Fortnox create delivery failed (${createResponse.status}): ${errText}`);
    }

    const createdDelivery = await createResponse.json();
    const deliveryId = createdDelivery.id;
    console.log(`[8] Fortnox delivery created: id=${deliveryId}`);

    if (!deliveryId) {
      throw new Error('Fortnox response missing delivery id');
    }

    // 7. Release the delivery
    const releaseResponse = await fetch(
      `https://api.fortnox.se/api/warehouse/deliveries-v1/inbounddeliveries/${deliveryId}/release`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${fortnoxConfig.access_token}`
        }
      }
    );

    console.log(`[9] Fortnox release response status: ${releaseResponse.status}`);

    if (!releaseResponse.ok) {
      const errText = await releaseResponse.text();
      throw new Error(`Fortnox release delivery failed (${releaseResponse.status}): ${errText}`);
    }

    console.log(`[10] Fortnox delivery released successfully: id=${deliveryId}`);
    return Response.json({ success: true, deliveryId });

  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});