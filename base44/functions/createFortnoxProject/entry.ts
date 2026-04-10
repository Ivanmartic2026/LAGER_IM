import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';

async function getFortnoxToken(base44) {
  const configs = await base44.asServiceRole.entities.FortnoxConfig.list();
  if (!configs || configs.length === 0) throw new Error('Fortnox inte ansluten - ingen FortnoxConfig hittad');

  const config = configs[0];
  const now = Date.now();

  if (config.access_token && config.token_expires_at && (config.token_expires_at - 300000) > now) {
    return config.access_token;
  }

  if (!config.refresh_token) throw new Error('Ingen refresh token i FortnoxConfig');

  const credentials = btoa(CLIENT_ID + ':' + CLIENT_SECRET);
  const response = await fetch('https://apps.fortnox.se/oauth-v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + credentials },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(config.refresh_token)
  });

  const text = await response.text();
  if (!response.ok) throw new Error('Token refresh misslyckades: ' + text);

  const data = JSON.parse(text);
  const expiresAt = now + ((data.expires_in || 3600) * 1000);

  await base44.asServiceRole.entities.FortnoxConfig.update(config.id, {
    access_token: data.access_token,
    token_expires_at: expiresAt,
    refresh_token: data.refresh_token || config.refresh_token
  });

  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Support both automation trigger (payload.data = order entity) and direct call
    let order = payload.data;
    let orderId = payload.event?.entity_id || payload.order_id;

    // If called directly with order_id
    if (!order && orderId) {
      order = await base44.asServiceRole.entities.Order.get(orderId);
    }

    if (!order) {
      console.error('createFortnoxProject: ingen order i payload', JSON.stringify(payload).slice(0, 500));
      return Response.json({ success: false, error: 'Ingen order hittad i payload' }, { status: 400 });
    }

    orderId = order.id || orderId;

    // Skip if already has fortnox project
    if (order.fortnox_project_number) {
      return Response.json({ success: true, message: 'Order har redan Fortnox-projekt: ' + order.fortnox_project_number });
    }

    const description = [order.customer_name, order.order_number].filter(Boolean).join(' - ') || 'Nytt projekt';

    const accessToken = await getFortnoxToken(base44);

    const response = await fetch('https://api.fortnox.se/3/projects', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ Project: { Description: description, Status: 'ONGOING' } })
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error('Fortnox API fel: ' + responseText);
    }

    const result = JSON.parse(responseText);
    const projectNumber = result.Project?.ProjectNumber;

    if (projectNumber && orderId) {
      await base44.asServiceRole.entities.Order.update(orderId, {
        fortnox_project_number: projectNumber,
        fortnox_project_name: description
      });
    }

    console.log('Fortnox projekt skapat:', projectNumber, 'för order:', orderId);
    return Response.json({ success: true, project_number: projectNumber });

  } catch (error) {
    console.error('createFortnoxProject error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});