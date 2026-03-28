import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

async function getFortnoxToken(base44) {
  const configs = await base44.entities.FortnoxConfig.list();
  if (!configs || configs.length === 0) throw new Error('Fortnox inte ansluten. Klicka "Anslut till Fortnox" på sidan.');
  const config = configs[0];
  const now = Date.now();
  if (config.access_token && config.token_expires_at && (config.token_expires_at - 300000) > now) return config.access_token;
  if (!config.refresh_token) throw new Error('Ingen refresh token. Anslut Fortnox igen.');
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
  await base44.entities.FortnoxConfig.update(config.id, { access_token: data.access_token, token_expires_at: expiresAt, refresh_token: data.refresh_token || config.refresh_token });
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const accessToken = await getFortnoxToken(base44);

    let allArticles = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await fetch(`${FORTNOX_API_BASE}/articles?limit=500&page=${page}`, {
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Accept': 'application/json' }
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error('Articles failed (' + response.status + '): ' + errText);
      }
      const data = await response.json();
      allArticles = [...allArticles, ...(data.Articles || [])];
      totalPages = parseInt(data.MetaInformation?.['@TotalPages'] || '1');
      page++;
    } while (page <= totalPages);

    return Response.json({ success: true, articles: allArticles });
  } catch (error) {
    console.error('fetchFortnoxArticles error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});