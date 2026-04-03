import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req, { skipAuth: true });
    const { token, confirmedDate, supplierComments, items } = body;

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.PurchaseOrder.filter({ 
      supplier_portal_token: token 
    });
    const po = orders[0];
    
    if (!po) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    await base44.asServiceRole.entities.PurchaseOrder.update(po.id, {
      status: 'confirmed',
      confirmed_date: new Date().toISOString(),
      confirmed_delivery_date: confirmedDate || undefined,
      supplier_comments: supplierComments || undefined,
    });

    if (items && items.length > 0) {
      for (const item of items) {
        await base44.asServiceRole.entities.PurchaseOrderItem.update(item.id, {
          quantity_confirmed: item.quantity_confirmed,
          supplier_batch_numbers: item.supplier_batch_numbers,
          supplier_comment: item.supplier_comment,
          status: 'confirmed',
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('supplierConfirmPO error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});