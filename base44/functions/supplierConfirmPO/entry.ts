import { createClient } from 'npm:@base44/sdk@0.8.23';

const base44 = createClient({ appId: Deno.env.get("BASE44_APP_ID"), serviceRole: true });

// Public endpoint - supplier confirms PO without auth
Deno.serve(async (req) => {
  try {
    const { token, confirmedDate, supplierComments, items } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    const orders = await base44.entities.PurchaseOrder.filter({ supplier_portal_token: token });
    const po = orders[0];
    if (!po) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    await base44.entities.PurchaseOrder.update(po.id, {
      status: 'confirmed',
      confirmed_date: new Date().toISOString(),
      confirmed_delivery_date: confirmedDate || undefined,
      supplier_comments: supplierComments || undefined,
    });

    if (items && items.length > 0) {
      for (const item of items) {
        await base44.entities.PurchaseOrderItem.update(item.id, {
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