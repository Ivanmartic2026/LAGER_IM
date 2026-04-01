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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id } = await req.json();
    
    if (!order_id) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    const order = await base44.entities.Order.get(order_id);
    
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.fortnox_project_number) {
      return Response.json({ 
        error: 'Order already has a Fortnox project',
        project_number: order.fortnox_project_number
      }, { status: 400 });
    }

    const accessToken = await getFortnoxToken(base44);

    const fortnoxResponse = await fetch(`${FORTNOX_API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        Project: {
          Description: order.order_number || order.customer_name,
          Status: 'ONGOING'
        }
      })
    });

    const responseText = await fortnoxResponse.text();
    if (!fortnoxResponse.ok) {
      console.error('Fortnox API error:', responseText);
      return Response.json({ 
        error: 'Failed to create Fortnox project',
        details: responseText
      }, { status: fortnoxResponse.status });
    }

    const fortnoxData = JSON.parse(responseText);
    const projectNumber = fortnoxData.Project?.ProjectNumber;

    if (!projectNumber) {
      return Response.json({ error: 'No project number returned from Fortnox' }, { status: 500 });
    }

    await base44.entities.Order.update(order_id, {
      fortnox_project_number: projectNumber,
      fortnox_project_name: order.order_number || order.customer_name
    });

    return Response.json({
      success: true,
      project_number: projectNumber,
      project_name: order.order_number || order.customer_name
    });
  } catch (error) {
    console.error('Error in createFortnoxProject:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});