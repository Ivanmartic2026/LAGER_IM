import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    const { supplierId } = body;

    if (!supplierId) {
      return Response.json({ error: 'supplierId krävs' }, { status: 400 });
    }

    const purchaseOrders = await base44.asServiceRole.entities.PurchaseOrder.filter(
      { supplier_id: supplierId },
      '-created_date'
    );

    return Response.json({ purchaseOrders });

  } catch (error) {
    console.error('getSupplierPurchaseOrders error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});