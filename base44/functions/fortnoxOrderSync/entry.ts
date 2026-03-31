import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

async function getFortnoxToken(base44) {
  const configs = await base44.entities.FortnoxConfig.list();
  if (!configs || configs.length === 0) throw new Error('Fortnox inte ansluten');
  
  const config = configs[0];
  const now = Date.now();
  
  // Token valid for another 5 min?
  if (config.access_token && config.token_expires_at && (config.token_expires_at - 300000) > now) {
    return config.access_token;
  }
  
  // Refresh needed
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
      // Try to verify article exists in Fortnox
      try {
        const articleResponse = await fetch(`${FORTNOX_API_BASE}/articles/${encodeURIComponent(r.article_number)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });
        
        if (articleResponse.ok) {
          // Article exists, use it
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
    
    // Article not found or no article_number: use free-text row
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

    // Only customer_number and order_rows are truly required
    if (!customer_number || !order_rows || order_rows.length === 0) {
      return Response.json({ error: 'Missing required fields: customer_number and order_rows' }, { status: 400 });
    }

    const accessToken = await getFortnoxToken(base44);

    // Build rows with fallback to free-text if article not found
    const builtRows = await buildOrderRows(accessToken, order_rows);

    const fortnoxOrderData = {
      CustomerNumber: customer_number,
      DeliveryDate: delivery_date || new Date().toISOString().split('T')[0],
      OrderRows: builtRows
    };

    // YourOrderNumber is optional, only set if provided
    if (your_order_number) {
      fortnoxOrderData.YourOrderNumber = your_order_number;
    }

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
    const fortnoxOrderNumber = fortnoxOrder.OrderNumber;
    const fortnoxDocumentNumber = fortnoxOrder.DocumentNumber;

    // Update Lager AI order record with Fortnox document number and project name if provided
    if (order_id && fortnoxDocumentNumber) {
      try {
        const updateData = {
          fortnox_document_number: fortnoxDocumentNumber,
          fortnox_order_id: fortnoxDocumentNumber
        };
        if (project_name) {
          updateData.fortnox_project_name = project_name;
        }
        await base44.asServiceRole.entities.Order.update(order_id, updateData);
      } catch (e) {
        console.warn('Failed to update Lager AI order record:', e.message);
      }
    }

    return Response.json({
      success: true,
      fortnox_order_id: fortnoxOrderNumber,
      fortnox_document_number: fortnoxOrder.DocumentNumber
    });
  } catch (error) {
    console.error('Fortnox order sync error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});