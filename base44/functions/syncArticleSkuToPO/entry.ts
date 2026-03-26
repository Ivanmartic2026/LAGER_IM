import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only proceed if SKU changed
    if (data?.sku === old_data?.sku) {
      return Response.json({ success: true, message: 'No SKU change' });
    }

    const articleId = event.entity_id;
    const newSku = data?.sku;

    if (!newSku || !articleId) {
      return Response.json({ success: true, message: 'Missing SKU or article ID' });
    }

    // Find all PO items for this article
    const poItems = await base44.asServiceRole.entities.PurchaseOrderItem.filter({
      article_id: articleId
    });

    // Update all matching PO items with new SKU
    for (const item of poItems) {
      await base44.asServiceRole.entities.PurchaseOrderItem.update(item.id, {
        article_sku: newSku
      });
    }

    return Response.json({ 
      success: true, 
      message: `Updated ${poItems.length} PO items with new SKU: ${newSku}` 
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});