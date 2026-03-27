import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';
const TENANT_ID = '211766';
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

async function getFortnoxToken() {
  const credentials = btoa(CLIENT_ID + ':' + CLIENT_SECRET);
  const response = await fetch('https://apps.fortnox.se/oauth-v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + credentials,
      'TenantId': TENANT_ID
    },
    body: 'grant_type=client_credentials&scope=article'
  });
  const text = await response.text();
  if (!response.ok) throw new Error('Token failed (HTTP ' + response.status + '): ' + text);
  const data = JSON.parse(text);
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const accessToken = await getFortnoxToken();
    const response = await fetch(FORTNOX_API_BASE + '/articles?limit=10000', {
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Accept': 'application/json' }
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error('Articles fetch failed (' + response.status + '): ' + errText);
    }
    const data = await response.json();
    return Response.json({ success: true, articles: data.Articles || [] });
  } catch (error) {
    console.error('fetchFortnoxArticles error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});