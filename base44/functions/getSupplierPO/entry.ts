import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Public endpoint - no auth required, validated by supplier_portal_token
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token krävs' }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.PurchaseOrder.filter({ 
      supplier_portal_token: token 
    });

    const purchaseOrder = orders[0] || null;

    if (!purchaseOrder) {
      return Response.json({ purchaseOrder: null, items: [], supplier: null });
    }

    const items = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ 
      purchase_order_id: purchaseOrder.id 
    });

    const enrichedItems = await Promise.all(items.map(async (item) => {
      if (!item.article_sku && item.article_id) {
        const articles = await base44.asServiceRole.entities.Article.filter({ id: item.article_id });
        if (articles.length > 0) {
          return { ...item, article_sku: articles[0].sku };
        }
      }
      return item;
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