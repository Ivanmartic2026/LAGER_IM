import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { supplierId } = body;

    if (!supplierId) {
      return Response.json({ error: 'supplierId is required' }, { status: 400 });
    }

    // Fetch all POs for this supplier
    const purchaseOrders = await base44.asServiceRole.entities.PurchaseOrder.filter(
      { supplier_id: supplierId },
      '-updated_date'
    );

    return Response.json({ purchaseOrders });
  } catch (error) {
    console.error('Error in getSupplierPurchaseOrders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});