import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all articles
    const articles = await base44.asServiceRole.entities.Article.list('-updated_date', 1000);
    
    // Get all stock movements for historical analysis
    const movements = await base44.asServiceRole.entities.StockMovement.list('-created_date', 1000);
    
    // Get existing pending purchase orders to avoid duplicates
    const existingOrders = await base44.asServiceRole.entities.PurchaseOrder.filter({ 
      status: 'pending' 
    });

    const existingArticleIds = new Set(existingOrders.map(o => o.article_id));
    
    // Find articles below min stock level
    const lowStockArticles = articles.filter(article => {
      const stock = article.stock_qty || 0;
      const minLevel = article.min_stock_level || 5;
      
      // Only process if below min level and no existing pending order
      return stock < minLevel && !existingArticleIds.has(article.id);
    });

    if (lowStockArticles.length === 0) {
      return Response.json({ 
        message: 'Inga artiklar behöver påfyllning',
        orders: [] 
      });
    }

    // Generate AI suggestions for each low stock article
    const orderPromises = lowStockArticles.map(async (article) => {
      // Get movement history for this article
      const articleMovements = movements.filter(m => m.article_id === article.id);
      
      // Calculate statistics
      const last30Days = articleMovements.filter(m => {
        const movementDate = new Date(m.created_date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return movementDate >= thirtyDaysAgo;
      });

      const outboundMovements = last30Days.filter(m => m.movement_type === 'outbound');
      const totalOutbound = outboundMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      const avgDailyUsage = totalOutbound / 30;

      // Use AI to suggest optimal quantity
      const aiPrompt = `Du är en expert på lagerhantering och inköpsoptimering. Analysera följande data och föreslå optimal påfyllnadsmängd:

Artikel: ${article.name}
Nuvarande lager: ${article.stock_qty || 0} st
Minsta lagernivå: ${article.min_stock_level || 5} st
Genomsnittlig daglig förbrukning (senaste 30 dagarna): ${avgDailyUsage.toFixed(2)} st/dag
Antal uttag senaste 30 dagarna: ${outboundMovements.length} st
Total förbrukning senaste 30 dagarna: ${totalOutbound} st

Kategori: ${article.category || 'Okänd'}
Tillverkare: ${article.manufacturer || 'Okänd'}

Föreslå en lämplig beställningsmängd som:
1. Täcker minst 60 dagars förbrukning
2. Tar hänsyn till leveranstider (anta 7-14 dagar)
3. Undviker överlager men säkerställer buffert
4. Anpassas till förbrukningsmönster

Returnera ett JSON-objekt med föreslagna mängden och motivering.`;

      try {
        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: aiPrompt,
          response_json_schema: {
            type: "object",
            properties: {
              suggested_quantity: { type: "number" },
              reasoning: { type: "string" },
              priority: { 
                type: "string",
                enum: ["low", "medium", "high", "urgent"]
              },
              estimated_delivery_days: { type: "number" }
            }
          }
        });

        // Calculate estimated delivery date
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + (aiResponse.estimated_delivery_days || 10));

        // Determine priority based on current stock level
        let priority = aiResponse.priority || 'medium';
        if (article.stock_qty <= 0) {
          priority = 'urgent';
        } else if (article.stock_qty < (article.min_stock_level || 5) / 2) {
          priority = 'high';
        }

        // Create purchase order
        const order = await base44.asServiceRole.entities.PurchaseOrder.create({
          article_id: article.id,
          article_name: article.name,
          article_batch_number: article.batch_number,
          current_stock: article.stock_qty || 0,
          min_stock_level: article.min_stock_level || 5,
          suggested_quantity: aiResponse.suggested_quantity,
          ai_reasoning: aiResponse.reasoning,
          status: 'pending',
          priority: priority,
          supplier: article.manufacturer,
          estimated_delivery_date: deliveryDate.toISOString().split('T')[0]
        });

        return order;
      } catch (error) {
        console.error(`Failed to generate order for ${article.name}:`, error);
        
        // Fallback: create basic order without AI
        const fallbackQuantity = Math.max(
          (article.min_stock_level || 5) * 2 - (article.stock_qty || 0),
          10
        );

        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 10);

        return await base44.asServiceRole.entities.PurchaseOrder.create({
          article_id: article.id,
          article_name: article.name,
          article_batch_number: article.batch_number,
          current_stock: article.stock_qty || 0,
          min_stock_level: article.min_stock_level || 5,
          suggested_quantity: fallbackQuantity,
          ai_reasoning: 'Automatiskt genererad baserat på minsta lagernivå (AI otillgänglig)',
          status: 'pending',
          priority: article.stock_qty <= 0 ? 'urgent' : 'medium',
          supplier: article.manufacturer,
          estimated_delivery_date: deliveryDate.toISOString().split('T')[0]
        });
      }
    });

    const createdOrders = await Promise.all(orderPromises);

    return Response.json({
      message: `${createdOrders.length} inköpsorder skapade`,
      orders: createdOrders
    });

  } catch (error) {
    console.error('Error generating purchase orders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});