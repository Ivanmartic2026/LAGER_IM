import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Check if supplier info changed
    const supplierChanged = (data.supplier_id !== old_data?.supplier_id) || 
                           (data.supplier_name !== old_data?.supplier_name);

    if (!supplierChanged || !data.id) {
      return Response.json({ success: true, reason: 'No supplier change' });
    }

    // Get all PO items linked to this article
    const linkedItems = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ 
      article_id: data.id 
    });

    if (linkedItems.length === 0) {
      return Response.json({ success: true, reason: 'No linked PO items' });
    }

    // Update all linked PO items with new supplier info
    const updateData = {};
    if (data.supplier_id !== undefined) updateData.supplier_id = data.supplier_id;
    if (data.supplier_name !== undefined) updateData.supplier_name = data.supplier_name;

    if (Object.keys(updateData).length > 0) {
      await Promise.all(
        linkedItems.map(item => 
          base44.asServiceRole.entities.PurchaseOrderItem.update(item.id, updateData)
        )
      );
    }

    return Response.json({ 
      success: true, 
      itemsUpdated: linkedItems.length 
    });
  } catch (error) {
    console.error('Error syncing supplier:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});