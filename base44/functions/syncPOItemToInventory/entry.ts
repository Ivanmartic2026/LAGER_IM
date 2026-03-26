import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;
    const eventType = event?.type;

    // Handle DELETE: if a PO item is deleted and it was the sole reason for an article existing, remove it
    if (eventType === 'delete' && old_data?.article_id && old_data?.source_created_by_po) {
      // Check if the article was created solely for this PO
      const article = await base44.asServiceRole.entities.Article.get(old_data.article_id);
      if (article && article.source_purchase_order_id === old_data.purchase_order_id) {
        // Check if there are other PO items still referencing this article
        const otherPOItems = await base44.asServiceRole.entities.PurchaseOrderItem.filter({
          article_id: old_data.article_id
        });
        const remainingItems = otherPOItems.filter(item => item.id !== old_data.id);
        
        if (remainingItems.length === 0) {
          // No other PO items - delete the article
          await base44.asServiceRole.entities.Article.delete(old_data.article_id);
          return Response.json({ success: true, action: 'deleted_article', article_id: old_data.article_id });
        }
      }
      return Response.json({ success: true, action: 'no_action_needed' });
    }

    // Handle CREATE or UPDATE
    if (!data) {
      return Response.json({ success: true, action: 'no_data' });
    }

    const poItem = data;

    // If article_id already exists on this PO item, just sync status
    if (poItem.article_id) {
      // Get the PO to sync status
      if (poItem.purchase_order_id) {
        const po = await base44.asServiceRole.entities.PurchaseOrder.get(poItem.purchase_order_id);
        if (po) {
          // Map PO status to article status
          const statusMap = {
            draft: 'in_transit',
            sent: 'in_transit',
            confirmed: 'in_transit',
            waiting_for_supplier_documentation: 'in_transit',
            in_production: 'in_transit',
            shipped: 'in_transit',
            ready_for_reception: 'in_transit',
            received: 'active',
            cancelled: null, // will handle separately
          };

          if (po.status === 'cancelled') {
            // Check if article was created by this PO
            const article = await base44.asServiceRole.entities.Article.get(poItem.article_id);
            if (article && article.source_purchase_order_id === poItem.purchase_order_id) {
              await base44.asServiceRole.entities.Article.delete(poItem.article_id);
              return Response.json({ success: true, action: 'deleted_cancelled_article' });
            }
          } else {
            const article = await base44.asServiceRole.entities.Article.get(poItem.article_id).catch(() => null);
            if (!article) {
              return Response.json({ success: true, action: 'article_not_found' });
            }

            const updatePayload = {};

            // Always sync unit_cost when unit_price is set on the PO item
            if (poItem.unit_price != null && poItem.unit_price !== undefined) {
              updatePayload.unit_cost = poItem.unit_price;
            }

            const newStatus = statusMap[po.status];
            if (newStatus && po.status !== 'received' && article.source_purchase_order_id === poItem.purchase_order_id) {
              updatePayload.status = newStatus;
              updatePayload.transit_expected_date = po.expected_delivery_date || po.confirmed_delivery_date || null;
              updatePayload.transit_notes = `PO: ${po.po_number || po.id.slice(0,8)} | Leverantör: ${po.supplier_name}`;
              updatePayload.stock_qty = poItem.quantity_ordered || 0;
            }

            if (Object.keys(updatePayload).length > 0) {
              await base44.asServiceRole.entities.Article.update(poItem.article_id, updatePayload);
            }
          }
        }
      }
      return Response.json({ success: true, action: 'synced_existing_article' });
    }

    // No article_id on PO item - create a new article
    if (!poItem.article_name) {
      return Response.json({ success: true, action: 'no_article_name_skipped' });
    }

    // Get the PO for additional context
    let po = null;
    if (poItem.purchase_order_id) {
      po = await base44.asServiceRole.entities.PurchaseOrder.get(poItem.purchase_order_id).catch(() => null);
    }

    if (po?.status === 'cancelled' || po?.status === 'received') {
      return Response.json({ success: true, action: 'po_cancelled_or_received_skipped' });
    }

    // Create the new article
    const newArticle = await base44.asServiceRole.entities.Article.create({
      name: poItem.article_name,
      storage_type: 'company_owned',
      status: 'in_transit',
      stock_qty: poItem.quantity_ordered || 0,
      source_purchase_order_id: poItem.purchase_order_id,
      supplier_name: po?.supplier_name || null,
      transit_expected_date: po?.expected_delivery_date || po?.confirmed_delivery_date || null,
      transit_notes: po ? `PO: ${po.po_number || po.id.slice(0,8)} | Leverantör: ${po.supplier_name}` : null,
      batch_number: poItem.article_batch_number || null,
      unit_cost: poItem.unit_price != null ? poItem.unit_price : null,
      notes: `Automatiskt skapad från inköpsorder. PO-ID: ${poItem.purchase_order_id}`,
    });

    // Link the article back to the PO item
    await base44.asServiceRole.entities.PurchaseOrderItem.update(poItem.id, {
      article_id: newArticle.id,
      source_created_by_po: true,
    });

    return Response.json({ 
      success: true, 
      action: 'created_article', 
      article_id: newArticle.id,
      article_name: newArticle.name 
    });

  } catch (error) {
    console.error('syncPOItemToInventory error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});