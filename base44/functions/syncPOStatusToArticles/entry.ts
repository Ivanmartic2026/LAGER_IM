import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Triggered when a PurchaseOrder status changes
// Syncs all linked articles' status to match the PO status

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { data, old_data } = payload;
    if (!data?.id) return Response.json({ success: true, action: 'no_data' });

    const po = data;
    const oldStatus = old_data?.status;
    const newStatus = po.status;

    if (oldStatus === newStatus) {
      return Response.json({ success: true, action: 'status_unchanged' });
    }

    // Find all PO items for this PO
    const poItems = await base44.asServiceRole.entities.PurchaseOrderItem.filter({
      purchase_order_id: po.id
    });

    if (!poItems || poItems.length === 0) {
      return Response.json({ success: true, action: 'no_po_items' });
    }

    const results = [];

    for (const poItem of poItems) {
      if (!poItem.article_id) continue;

      // Only manage articles that were created by this PO
      const article = await base44.asServiceRole.entities.Article.get(poItem.article_id).catch(() => null);
      if (!article || article.source_purchase_order_id !== po.id) continue;

      if (newStatus === 'cancelled') {
        // Delete article that was created solely for this PO
        await base44.asServiceRole.entities.Article.delete(poItem.article_id);
        results.push({ article_id: poItem.article_id, action: 'deleted' });
      } else if (newStatus === 'received') {
        // Article is now physically in stock - update status to active and set real stock qty
        const receivedQty = poItem.quantity_received || poItem.quantity_ordered || 0;
        await base44.asServiceRole.entities.Article.update(poItem.article_id, {
          status: article.stock_qty > 0 ? 'active' : 'out_of_stock',
          stock_qty: receivedQty,
          transit_notes: null,
          transit_expected_date: null,
        });
        results.push({ article_id: poItem.article_id, action: 'marked_received' });
      } else {
        // Map PO status to article transit status
        const articleStatus = 'in_transit';
        await base44.asServiceRole.entities.Article.update(poItem.article_id, {
          status: articleStatus,
          transit_expected_date: po.expected_delivery_date || po.confirmed_delivery_date || null,
          transit_notes: `PO: ${po.po_number || po.id.slice(0,8)} | Leverantör: ${po.supplier_name} | Status: ${newStatus}`,
        });
        results.push({ article_id: poItem.article_id, action: 'status_synced', new_status: articleStatus });
      }
    }

    return Response.json({ success: true, results });

  } catch (error) {
    console.error('syncPOStatusToArticles error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});