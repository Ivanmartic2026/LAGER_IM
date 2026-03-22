import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify webhook secret for security
    const webhookSecret = Deno.env.get('EMAIL_WEBHOOK_SECRET');
    const providedSecret = req.headers.get('X-Webhook-Secret') || new URL(req.url).searchParams.get('secret');
    
    if (webhookSecret && providedSecret !== webhookSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailData = await req.json();
    
    // Extract email details
    const fromEmail = emailData.from || emailData.sender;
    const subject = emailData.subject || '';
    const bodyText = emailData.text || emailData.body || '';
    const bodyHtml = emailData.html || '';
    const attachments = emailData.attachments || [];

    console.log('Processing email order from:', fromEmail);

    // Upload attachments if any
    let attachmentUrls = [];
    if (attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          // Decode base64 if needed
          const fileData = attachment.content || attachment.data;
          const fileName = attachment.filename || 'attachment.pdf';
          
          // Convert to file-like object
          const blob = new Blob([Uint8Array.from(atob(fileData), c => c.charCodeAt(0))], { 
            type: attachment.contentType || 'application/pdf' 
          });
          const file = new File([blob], fileName, { type: blob.type });
          
          const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
          attachmentUrls.push(file_url);
        } catch (error) {
          console.error('Failed to upload attachment:', error);
        }
      }
    }

    // Extract order data using AI
    let orderData;
    if (attachmentUrls.length > 0) {
      // If there are attachments (likely PDF orders), extract from them
      orderData = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
        file_url: attachmentUrls[0],
        json_schema: {
          type: "object",
          properties: {
            customer_name: { type: "string" },
            customer_reference: { type: "string" },
            order_number: { type: "string" },
            delivery_date: { type: "string" },
            delivery_address: { type: "string" },
            notes: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  article_name: { type: "string" },
                  article_number: { type: "string" },
                  quantity: { type: "number" },
                  notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (orderData.status !== 'success') {
        throw new Error('Failed to extract order data from attachment');
      }
      orderData = orderData.output;
    } else {
      // Extract from email body using LLM
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Extract order information from this email:
        
Subject: ${subject}
From: ${fromEmail}
Body: ${bodyText || bodyHtml}

Extract and return ONLY a JSON object with the following structure:
{
  "customer_name": "customer name",
  "customer_reference": "any reference number mentioned",
  "order_number": "order number if mentioned",
  "delivery_date": "delivery date in YYYY-MM-DD format if mentioned",
  "delivery_address": "delivery address if mentioned",
  "notes": "any additional notes or special instructions",
  "items": [
    {
      "article_name": "product/article name",
      "article_number": "article/SKU/batch number if mentioned",
      "quantity": number,
      "notes": "any notes about this item"
    }
  ]
}

If information is not available, use null. Make sure to include all items mentioned in the email.`,
        response_json_schema: {
          type: "object",
          properties: {
            customer_name: { type: "string" },
            customer_reference: { type: "string" },
            order_number: { type: "string" },
            delivery_date: { type: "string" },
            delivery_address: { type: "string" },
            notes: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  article_name: { type: "string" },
                  article_number: { type: "string" },
                  quantity: { type: "number" },
                  notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      orderData = result;
    }

    console.log('Extracted order data:', orderData);

    // Create the order
    const order = await base44.asServiceRole.entities.Order.create({
      order_number: orderData.order_number || `EMAIL-${Date.now()}`,
      customer_name: orderData.customer_name || fromEmail,
      customer_reference: orderData.customer_reference,
      delivery_date: orderData.delivery_date,
      delivery_address: orderData.delivery_address,
      notes: `${orderData.notes || ''}\n\nMotagen via e-post från: ${fromEmail}\nÄmne: ${subject}`,
      status: 'draft',
      priority: 'normal'
    });

    console.log('Created order:', order.id);

    // Get all articles to match against
    const allArticles = await base44.asServiceRole.entities.Article.list('-updated_date', 1000);

    // Create order items
    const createdItems = [];
    for (const item of orderData.items || []) {
      // Try to find matching article
      let matchedArticle = null;
      
      if (item.article_number) {
        matchedArticle = allArticles.find(a => 
          a.batch_number?.toLowerCase() === item.article_number.toLowerCase() ||
          a.sku?.toLowerCase() === item.article_number.toLowerCase()
        );
      }
      
      if (!matchedArticle && item.article_name) {
        matchedArticle = allArticles.find(a => 
          a.name?.toLowerCase().includes(item.article_name.toLowerCase()) ||
          a.customer_name?.toLowerCase().includes(item.article_name.toLowerCase())
        );
      }

      if (matchedArticle) {
        const orderItem = await base44.asServiceRole.entities.OrderItem.create({
          order_id: order.id,
          article_id: matchedArticle.id,
          article_name: matchedArticle.name,
          article_batch_number: matchedArticle.batch_number,
          shelf_address: matchedArticle.shelf_address,
          quantity_ordered: item.quantity || 1,
          quantity_picked: 0,
          status: 'pending'
        });
        createdItems.push({ ...item, matched: true, article: matchedArticle.name });
      } else {
        // Article not found - add to notes
        console.log('Article not found:', item.article_name || item.article_number);
        createdItems.push({ ...item, matched: false });
      }
    }

    // Update order status
    await base44.asServiceRole.entities.Order.update(order.id, {
      status: 'ready_to_pick'
    });

    // Send confirmation email
    const unmatchedItems = createdItems.filter(i => !i.matched);
    const confirmationBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Order mottagen och skapad</h2>
        <p>Din order har mottagits via e-post och skapats i systemet.</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Ordernummer:</strong> ${order.order_number}</p>
          <p style="margin: 4px 0;"><strong>Kund:</strong> ${order.customer_name}</p>
          <p style="margin: 4px 0;"><strong>Antal artiklar:</strong> ${createdItems.length}</p>
          <p style="margin: 4px 0;"><strong>Matchade artiklar:</strong> ${createdItems.filter(i => i.matched).length}</p>
        </div>

        ${unmatchedItems.length > 0 ? `
          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #d97706; margin-top: 0;">⚠️ Ej matchade artiklar</h3>
            <p>Följande artiklar kunde inte matchas automatiskt och måste läggas till manuellt:</p>
            <ul>
              ${unmatchedItems.map(item => `<li>${item.article_name || item.article_number} (${item.quantity} st)</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <p style="margin-top: 24px;">Ordern är nu redo att plockas i lagersystemet.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">Detta är ett automatiskt meddelande från lagersystemet.</p>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: fromEmail,
      subject: `✅ Order ${order.order_number} mottagen`,
      body: confirmationBody
    });

    // Send notification to admins
    const users = await base44.asServiceRole.entities.User.list();
    const admins = users.filter(u => u.role === 'admin');
    
    for (const admin of admins) {
      await base44.asServiceRole.functions.invoke('sendNotification', {
        user_email: admin.email,
        title: 'Ny order via e-post',
        message: `Order ${order.order_number} från ${order.customer_name} har skapats via e-post. ${createdItems.filter(i => i.matched).length}/${createdItems.length} artiklar matchade.`,
        type: 'order_status',
        priority: unmatchedItems.length > 0 ? 'high' : 'normal',
        link_to: order.id,
        link_page: 'Orders',
        send_email: true
      });
    }

    return Response.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      items_created: createdItems.filter(i => i.matched).length,
      items_unmatched: unmatchedItems.length,
      unmatched_items: unmatchedItems
    });

  } catch (error) {
    console.error('Process email error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});