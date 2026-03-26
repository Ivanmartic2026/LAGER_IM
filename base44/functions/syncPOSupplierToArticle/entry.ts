import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only process updates to PurchaseOrder
    if (event.type !== 'update') {
      return Response.json({ success: true, reason: 'Not an update event' });
    }

    const supplierId = data.supplier_id || old_data?.supplier_id;
    const supplierName = data.supplier_name || old_data?.supplier_name;

    // Get all items in this PO
    const poItems = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ 
      purchase_order_id: data.id 
    });

    if (poItems.length === 0) {
      return Response.json({ success: true, reason: 'No items in PO' });
    }

    // Update each article with supplier info if PO supplier changed
    const supplierChanged = (data.supplier_id !== old_data?.supplier_id) || 
                           (data.supplier_name !== old_data?.supplier_name);

    if (supplierChanged) {
      const updateData = {};
      if (supplierId !== undefined) updateData.supplier_id = supplierId;
      if (supplierName !== undefined) updateData.supplier_name = supplierName;

      if (Object.keys(updateData).length > 0) {
        const articleIds = [...new Set(poItems.map(item => item.article_id))];
        await Promise.all(
          articleIds.map(articleId =>
            base44.asServiceRole.entities.Article.update(articleId, updateData)
          )
        );
      }
    }

    return Response.json({ 
      success: true, 
      articlesUpdated: [...new Set(poItems.map(item => item.article_id))].length 
    });
  } catch (error) {
    console.error('Error syncing PO supplier to articles:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});