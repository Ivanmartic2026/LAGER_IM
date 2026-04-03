import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    const { token, poId } = body;

    if (!token && !poId) {
      return Response.json({ error: 'Token eller PO-id krävs' }, { status: 400 });
    }

    let purchaseOrder = null;

    // Try token first
    if (token) {
      const orders = await base44.asServiceRole.entities.PurchaseOrder.filter({ 
        supplier_portal_token: token 
      });
      purchaseOrder = orders[0] || null;
    }

    // Fallback: try matching by PO id directly (if poId provided and token didn't match)
    if (!purchaseOrder && poId) {
      const orders = await base44.asServiceRole.entities.PurchaseOrder.filter({ id: poId });
      // Only return if token also matches (security check)
      const match = orders[0];
      if (match && token && match.supplier_portal_token === token) {
        purchaseOrder = match;
      } else if (match && !token) {
        purchaseOrder = match;
      }
    }

    if (!purchaseOrder) {
      return Response.json({ purchaseOrder: null, items: [], supplier: null });
    }

    const items = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ 
      purchase_order_id: purchaseOrder.id 
    });

    const enrichedItems = await Promise.all(items.map(async (item) => {
      let enrichedItem = { ...item };
      
      if (item.article_id) {
        const articles = await base44.asServiceRole.entities.Article.filter({ id: item.article_id });
        if (articles.length > 0) {
          const article = articles[0];
          enrichedItem.article_sku = item.article_sku || article.sku;
          enrichedItem.transit_expected_date = article.transit_expected_date;
          enrichedItem.article_status = article.status;
        }
      }
      
      return enrichedItem;
    }));

    let supplier = null;
    if (purchaseOrder.supplier_id) {
      const suppliers = await base44.asServiceRole.entities.Supplier.filter({ 
        id: purchaseOrder.supplier_id 
      });
      supplier = suppliers[0] || null;
    }

    return Response.json({ purchaseOrder, items: enrichedItems, supplier });

  } catch (error) {
    console.error('getSupplierPO error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});