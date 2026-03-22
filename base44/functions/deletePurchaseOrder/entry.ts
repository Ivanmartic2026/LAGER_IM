import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchaseOrderId } = await req.json();

    if (!purchaseOrderId) {
      return Response.json({ error: 'Purchase order ID required' }, { status: 400 });
    }

    // Use service role for deletion operations
    const serviceBase44 = base44.asServiceRole;

    // 1. Get all PO items
    const allPOItems = await serviceBase44.entities.PurchaseOrderItem.list();
    const poItems = allPOItems.filter(item => item.purchase_order_id === purchaseOrderId);

    // 2. Delete all receiving records for these PO items
    const allReceivingRecords = await serviceBase44.entities.ReceivingRecord.list();
    const receivingRecords = allReceivingRecords.filter(
      record => record.purchase_order_id === purchaseOrderId
    );
    
    for (const record of receivingRecords) {
      await serviceBase44.entities.ReceivingRecord.delete(record.id);
    }

    // 3. Delete all PO items
    for (const item of poItems) {
      await serviceBase44.entities.PurchaseOrderItem.delete(item.id);
    }

    // 4. Delete the purchase order
    await serviceBase44.entities.PurchaseOrder.delete(purchaseOrderId);

    return Response.json({ 
      success: true,
      message: 'Inköpsorder och relaterade poster borttagna'
    });

  } catch (error) {
    console.error('Delete PO error:', error);
    return Response.json({ 
      error: error.message || 'Failed to delete purchase order' 
    }, { status: 500 });
  }
});