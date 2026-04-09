import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

async function getFortnoxToken(base44) {
  const configs = await base44.entities.FortnoxConfig.list();
  if (!configs || configs.length === 0) throw new Error('Fortnox inte ansluten');
  
  const config = configs[0];
  const now = Date.now();
  
  if (config.access_token && config.token_expires_at && (config.token_expires_at - 300000) > now) {
    return config.access_token;
  }
  
  if (!config.refresh_token) throw new Error('Ingen refresh token');
  
  const credentials = btoa(CLIENT_ID + ':' + CLIENT_SECRET);
  const response = await fetch('https://apps.fortnox.se/oauth-v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + credentials },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(config.refresh_token)
  });
  
  const text = await response.text();
  if (!response.ok) throw new Error('Token refresh failed: ' + text);
  
  const data = JSON.parse(text);
  const expiresAt = now + ((data.expires_in || 3600) * 1000);
  
  await base44.entities.FortnoxConfig.update(config.id, {
    access_token: data.access_token,
    token_expires_at: expiresAt,
    refresh_token: data.refresh_token || config.refresh_token
  });
  
  return data.access_token;
}

async function buildOrderRows(accessToken, orderRows) {
  const builtRows = [];
  
  for (const r of orderRows) {
    if (r.article_number) {
      try {
        const articleResponse = await fetch(`${FORTNOX_API_BASE}/articles/${encodeURIComponent(r.article_number)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });
        
        if (articleResponse.ok) {
          builtRows.push({
            ArticleNumber: r.article_number,
            Description: r.description || '',
            OrderedQuantity: r.quantity || 0,
            Price: r.price !== undefined ? r.price : 0
          });
          continue;
        }
      } catch (e) {
        // Continue to fallback
      }
    }
    
    builtRows.push({
      Description: r.description || r.article_number || 'Artikel',
      OrderedQuantity: r.quantity || 0,
      Price: r.price !== undefined ? r.price : 0
    });
  }
  
  return builtRows;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id, customer_number, your_order_number, delivery_date, order_rows, project_name } = await req.json();

    if (!order_id) {
      return Response.json({ error: 'Missing required field: order_id' }, { status: 400 });
    }

    // Fetch the Order to get customer info and build rows if not provided
    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Use fortnox_customer_number from Order, fall back to provided customer_number
    const resolvedCustomerNumber = order.fortnox_customer_number || customer_number;
    if (!resolvedCustomerNumber) {
      return Response.json({ error: 'Missing customer_number: set fortnox_customer_number on Order or pass customer_number' }, { status: 400 });
    }

    // Build order rows from OrderItems if not provided
    let resolvedOrderRows = order_rows;
    if (!resolvedOrderRows || resolvedOrderRows.length === 0) {
      const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ order_id });
      resolvedOrderRows = orderItems.map(item => ({
        article_number: item.article_id,
        description: item.article_name,
        quantity: item.quantity_ordered,
        price: 0
      }));
    }

    if (!resolvedOrderRows || resolvedOrderRows.length === 0) {
      return Response.json({ error: 'No order rows found' }, { status: 400 });
    }

    const accessToken = await getFortnoxToken(base44);
    const builtRows = await buildOrderRows(accessToken, resolvedOrderRows);

    const fortnoxOrderData = {
      CustomerNumber: resolvedCustomerNumber,
      DeliveryDate: delivery_date || order.delivery_date || new Date().toISOString().split('T')[0],
      OrderRows: builtRows
    };

    const resolvedYourOrderNumber = your_order_number || order.order_number;
    if (resolvedYourOrderNumber) {
      fortnoxOrderData.YourOrderNumber = resolvedYourOrderNumber;
    }

    if (project_name || order.fortnox_project_name) {
      fortnoxOrderData.Project = project_name || order.fortnox_project_name;
    }

    console.log(`[1] Creating Fortnox order for customer: ${resolvedCustomerNumber}`);

    const response = await fetch(`${FORTNOX_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ Order: fortnoxOrderData })
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Fortnox API error: ${response.status} - ${text}`);
    }

    const data = JSON.parse(text);
    const fortnoxOrder = data.Order || {};
    const fortnoxDocumentNumber = fortnoxOrder.DocumentNumber;
    const fortnoxOrderNumber = fortnoxOrder.OrderNumber;

    console.log(`[2] Fortnox order created: DocumentNumber=${fortnoxDocumentNumber}`);

    // Always save back to Order entity
    if (fortnoxDocumentNumber) {
      const updateData = {
        fortnox_document_number: String(fortnoxDocumentNumber),
        fortnox_order_id: String(fortnoxDocumentNumber)
      };
      if (project_name || order.fortnox_project_name) {
        updateData.fortnox_project_name = project_name || order.fortnox_project_name;
      }
      await base44.asServiceRole.entities.Order.update(order_id, updateData);
      console.log(`[3] Saved fortnox_order_id=${fortnoxDocumentNumber} on Order`);
    }

    return Response.json({
      success: true,
      fortnox_order_id: fortnoxDocumentNumber,
      fortnox_document_number: fortnoxDocumentNumber,
      fortnox_order_number: fortnoxOrderNumber
    });
  } catch (error) {
    console.error('Fortnox order sync error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});