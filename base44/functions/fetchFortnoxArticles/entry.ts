import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';
const CLIENT_ID = 'C84gmzGW0STm';
const CLIENT_SECRET = 'jCAiY13645iCfRljftcvAES3BZNL1W5Z';
const TENANT_ID = '211766';

async function getFortnoxToken() {
  // Fortnox requires Basic Auth: base64(CLIENT_ID:CLIENT_SECRET)
  const credentials = btoa(CLIENT_ID + ':' + CLIENT_SECRET);
  const response = await fetch(FORTNOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + credentials,
      'TenantId': TENANT_ID
    },
    body: 'grant_type=client_credentials&scope=article'
  });
  const responseText = await response.text();
  if (!response.ok) {
    let errorMsg;
    try {
      const errorData = JSON.parse(responseText);
      errorMsg = errorData.error_description || errorData.error || responseText;
    } catch {
      errorMsg = responseText || 'HTTP ' + response.status;
    }
    throw new Error('Token request failed (HTTP ' + response.status + '): ' + errorMsg);
  }
  const data = JSON.parse(responseText);
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
    const accessToken = await getFortnoxToken();
    const articles = await getFortnoxArticles(accessToken);
    return Response.json({ success: true, articles });
  } catch (error) {
    console.error('Fetch Fortnox articles error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});