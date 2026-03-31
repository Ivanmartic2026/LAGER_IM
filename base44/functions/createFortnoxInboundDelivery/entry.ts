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

    // 2. Fetch PurchaseOrderItem
    const poItem = await base44.asServiceRole.entities.PurchaseOrderItem.get(receivingRecord.purchase_order_item_id);
    if (!poItem) {
      throw new Error(`PurchaseOrderItem not found: ${receivingRecord.purchase_order_item_id}`);
    }

    // 3. Fetch PurchaseOrder
    const purchaseOrder = await base44.asServiceRole.entities.PurchaseOrder.get(receivingRecord.purchase_order_id);
    if (!purchaseOrder) {
      throw new Error(`PurchaseOrder not found: ${receivingRecord.purchase_order_id}`);
    }

    // 4. Fetch Warehouse
    if (!purchaseOrder.warehouse_id) {
      throw new Error('PurchaseOrder has no warehouse_id');
    }
    const warehouse = await base44.asServiceRole.entities.Warehouse.get(purchaseOrder.warehouse_id);
    if (!warehouse) {
      throw new Error(`Warehouse not found: ${purchaseOrder.warehouse_id}`);
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

    const today = new Date().toISOString().split('T')[0];
    const noteText = `PO: ${purchaseOrder.po_number || purchaseOrder.id}${receivingRecord.notes ? ' - ' + receivingRecord.notes : ''}`;

    const deliveryBody = {
      date: today,
      currency: "SEK",
      currencyRate: 1,
      currencyUnit: 1,
      stockPointCode: warehouse.code,
      note: noteText,
      rows: [
        {
          itemId: poItem.article_sku,
          quantity: receivingRecord.quantity_received,
          directCost: poItem.unit_price || 0,
          stockPointCode: warehouse.code
        }
      ]
    };

    // 6. POST to Fortnox inbound deliveries
    const createResponse = await fetch('https://api.fortnox.se/api/warehouse/deliveries-v1/inbounddeliveries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fortnoxConfig.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deliveryBody)
    });

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      throw new Error(`Fortnox create delivery failed (${createResponse.status}): ${errText}`);
    }

    const createdDelivery = await createResponse.json();
    const deliveryId = createdDelivery.id;

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

    if (!releaseResponse.ok) {
      const errText = await releaseResponse.text();
      throw new Error(`Fortnox release delivery failed (${releaseResponse.status}): ${errText}`);
    }

    return Response.json({ success: true, deliveryId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});