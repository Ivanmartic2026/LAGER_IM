import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all articles
    const articles = await base44.asServiceRole.entities.Article.list();
    
    // Get all orders and filter for active (non-completed/cancelled) statuses
    const allOrders = await base44.asServiceRole.entities.Order.list();
    const orders = allOrders.filter(o => 
      !['delivered', 'cancelled', 'shipped'].includes(o.status)
    );
    
    const orderIds = orders.map(o => o.id);
    
    if (orderIds.length === 0) {
      // No active orders, reset all reserved stock
      for (const article of articles) {
        if (article.reserved_stock_qty > 0) {
          await base44.asServiceRole.entities.Article.update(article.id, {
            reserved_stock_qty: 0
          });
        }
      }
      
      return Response.json({ 
        success: true, 
        message: 'No active orders, all reserved stock cleared',
        articlesUpdated: articles.filter(a => a.reserved_stock_qty > 0).length
      });
    }
    
    // Get all order items and filter for active orders
    const allOrderItems = await base44.asServiceRole.entities.OrderItem.list();
    const orderItems = allOrderItems.filter(item => orderIds.includes(item.order_id));
    
    // Calculate reserved quantities per article
    const reservedByArticle = {};
    
    for (const item of orderItems) {
      if (item.status !== 'picked') {
        const remaining = item.quantity_ordered - (item.quantity_picked || 0);
        if (remaining > 0) {
          reservedByArticle[item.article_id] = 
            (reservedByArticle[item.article_id] || 0) + remaining;
        }
      }
    }
    
    // Update all articles
    let updated = 0;
    for (const article of articles) {
      const newReserved = reservedByArticle[article.id] || 0;
      
      if (article.reserved_stock_qty !== newReserved) {
        await base44.asServiceRole.entities.Article.update(article.id, {
          reserved_stock_qty: newReserved
        });
        updated++;
      }
    }
    
    return Response.json({ 
      success: true,
      articlesUpdated: updated,
      totalReserved: Object.values(reservedByArticle).reduce((sum, val) => sum + val, 0)
    });
    
  } catch (error) {
    console.error('Sync reserved stock error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});