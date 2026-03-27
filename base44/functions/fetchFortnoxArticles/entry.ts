import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

async function getFortnoxToken(base44) {
  const configs = await base44.entities.FortnoxConfig.list();
  if (!configs || configs.length === 0) {
    throw new Error('Fortnox not connected. Please click "Anslut till Fortnox" on the FortnoxSync page to authorize.');
  }

  const config = configs[0];
  const now = Date.now();

  // Use cached access token if still valid (with 5 min buffer)
  if (config.access_token && config.token_expires_at && (config.token_expires_at - 300000) > now) {
    return config.access_token;
  }

  // Refresh the token
  if (!config.refresh_token) {
    throw new Error('No refresh token stored. Please reconnect Fortnox.');
  }

  const credentials = btoa(CLIENT_ID + ':' + CLIENT_SECRET);
  const response = await fetch('https://apps.fortnox.se/oauth-v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + credentials,
    },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(config.refresh_token)
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error('Token refresh failed: ' + text);
  }

  const data = JSON.parse(text);
  const expiresAt = now + ((data.expires_in || 3600) * 1000);

  await base44.entities.FortnoxConfig.update(config.id, {
    access_token: data.access_token,
    token_expires_at: expiresAt,
    refresh_token: data.refresh_token || config.refresh_token
  });

  return data.access_token;
}

async function getFortnoxArticles(accessToken, limit = 10000) {
  const response = await fetch(FORTNOX_API_BASE + '/articles?limit=' + limit, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error('Failed to fetch articles: ' + response.status + ' ' + errText);
  }
  const data = await response.json();
  return data.Articles || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const accessToken = await getFortnoxToken(base44);
    const articles = await getFortnoxArticles(accessToken);
    return Response.json({ success: true, articles });
  } catch (error) {
    console.error('Fetch Fortnox articles error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});