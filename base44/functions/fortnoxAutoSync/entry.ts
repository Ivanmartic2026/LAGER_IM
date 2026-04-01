import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    // Handle both entity automation and direct invocation formats
    let order_id = payload.data?.order_id;
    
    // If triggered by article change, need to find related orders
    if (!order_id && payload.event?.entity_name === 'Article') {
      return Response.json({ success: true, message: 'Article change detected but no order context' });
    }

    // Validate order_id
    if (!order_id) {
      return Response.json({ success: false, error: 'No order_id provided' }, { status: 400 });
    }
    
    // Fetch the order
    let order;
    try {
      order = await base44.asServiceRole.entities.Order.get(order_id);
    } catch (err) {
      return Response.json({ success: false, error: `Entity Order with ID ${order_id} not found` }, { status: 404 });
    }
    
    if (!order) return Response.json({ success: false, error: `Entity Order with ID ${order_id} not found` }, { status: 404 });

    // Check if already synced to Fortnox
    if (order.fortnox_order_id) {
      return Response.json({ success: true, message: 'Already synced' });
    }

    // Check if customer number exists
    if (!order.fortnox_customer_number) {
      return Response.json({ success: true, message: 'No customer number' });
    }

    // Fetch all order items
    const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ order_id });
    
    // Only sync if there are items
    if (!orderItems || orderItems.length === 0) {
      return Response.json({ success: true, message: 'No items yet' });
    }

    // Fetch articles for pricing
    const articles = await base44.asServiceRole.entities.Article.list();

    const order_rows = orderItems.map(item => {
      const article = articles.find(a => a.id === item.article_id);
      return {
        article_number: article?.sku || article?.fortnox_article_number || item.article_id || 'UNKNOWN',
        description: item.article_name || 'Item',
        quantity: item.quantity_picked || item.quantity_ordered || 0,
        price: article?.sales_price || article?.price || 0
      };
    });

    // Call Fortnox sync
    const result = await base44.asServiceRole.functions.invoke('fortnoxOrderSync', {
      order_id: order.id,
      customer_number: order.fortnox_customer_number,
      your_order_number: order.order_number || `ORD-${order.id.slice(0, 8)}`,
      delivery_date: order.delivery_date || new Date().toISOString().split('T')[0],
      order_rows
    });

    if (result.data.success) {
      // Update order with Fortnox info
      await base44.asServiceRole.entities.Order.update(order.id, {
        fortnox_order_id: result.data.fortnox_order_id,
        fortnox_document_number: result.data.fortnox_document_number,
        financial_status: 'billed'
      });
      
      return Response.json({ success: true, fortnox_order_id: result.data.fortnox_order_id });
    } else {
      return Response.json({ success: false, error: result.data.error });
    }
  } catch (error) {
    console.error('Auto-sync error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});