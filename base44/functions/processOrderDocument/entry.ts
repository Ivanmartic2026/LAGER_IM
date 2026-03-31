import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'File URL is required' }, { status: 400 });
    }

    const json_schema = {
      "type": "object",
      "properties": {
        "order_number": {
          "type": "string",
          "description": "Order reference number, e.g., from 'Install: #5898' extract '#5898'."
        },
        "customer_name": {
          "type": "string",
          "description": "Full customer name, e.g., 'BB - Karlskrona - Ronnebygatan (H&M)'."
        },
        "articles": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "description": "Exact article name from 'Title' column, e.g., 'TB40 - NovaStar Tech CO - Controlbox'."
              },
              "quantity": {
                "type": "number",
                "description": "Article quantity. Default to 1 if not specified."
              }
            },
            "required": ["name"]
          }
        }
      },
      "required": ["customer_name", "articles"]
    };

    const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema,
    });

    if (extractionResult.status === 'error') {
      return Response.json({ error: 'Failed to extract data', details: extractionResult.details }, { status: 500 });
    }

    const extractedData = extractionResult.output;

    if (!extractedData || !extractedData.customer_name || !extractedData.articles) {
      return Response.json({ error: 'Extracted data is incomplete' }, { status: 400 });
    }

    let is_incomplete = false;
    const notes = [];
    const orderItemsToCreate = [];
    const allArticles = await base44.asServiceRole.entities.Article.list();

    for (const extractedArticle of extractedData.articles) {
      const articleName = extractedArticle.name.trim();
      if (!articleName) continue;

      const quantity = extractedArticle.quantity || 1;

      // Find matching article (case-insensitive partial match)
      const matchedArticle = allArticles.find(a => 
        a.name.toLowerCase().includes(articleName.toLowerCase()) ||
        articleName.toLowerCase().includes(a.name.toLowerCase())
      );

      if (matchedArticle) {
        orderItemsToCreate.push({
          article_id: matchedArticle.id,
          article_name: matchedArticle.name,
          article_batch_number: matchedArticle.batch_number,
          shelf_address: Array.isArray(matchedArticle.shelf_address) 
            ? (matchedArticle.shelf_address[0] || '') 
            : (matchedArticle.shelf_address || ''),
          quantity_ordered: quantity,
          status: 'pending',
        });
      } else {
        is_incomplete = true;
        notes.push(`❌ Artikel ej hittad: ${articleName} (kvantitet: ${quantity})`);
      }
    }

    // Check for duplicate order
    if (extractedData.order_number) {
      const existingOrders = await base44.asServiceRole.entities.Order.filter({ order_number: extractedData.order_number });
      if (existingOrders && existingOrders.length > 0) {
        return Response.json({
          success: false,
          error: `Order ${extractedData.order_number} finns redan i systemet.`,
        }, { status: 409 });
      }
    }

    // Create Order
    const newOrder = await base44.asServiceRole.entities.Order.create({
      order_number: extractedData.order_number,
      customer_name: extractedData.customer_name,
      status: 'draft',
      priority: 'normal',
      notes: notes.length > 0 ? notes.join('\n') : '',
      is_incomplete: is_incomplete,
      source_document_url: file_url,
    });

    // Create OrderItems
    for (const item of orderItemsToCreate) {
      await base44.asServiceRole.entities.OrderItem.create({
        ...item,
        order_id: newOrder.id,
      });
    }

    return Response.json({
      success: true,
      order_id: newOrder.id,
      is_incomplete: is_incomplete,
      matched_count: orderItemsToCreate.length,
      total_count: extractedData.articles.length,
      message: is_incomplete 
        ? `Order skapad men ofullständig (${orderItemsToCreate.length}/${extractedData.articles.length} artiklar matchade)` 
        : 'Order skapad framgångsrikt',
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});