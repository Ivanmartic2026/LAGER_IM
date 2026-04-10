import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';

async function getFortnoxToken(base44) {
  const configs = await base44.asServiceRole.entities.FortnoxConfig.list();
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

    const article = payload.data;
    if (!article) {
      return Response.json({ success: false, error: 'Ingen artikel i payload' }, { status: 400 });
    }

    // Only sync if fortnox_synced is true
    if (!article.fortnox_synced) {
      return Response.json({ success: true, message: 'Artikel är inte markerad för Fortnox-sync' });
    }

    const articleNumber = article.sku;
    if (!articleNumber) {
      return Response.json({ success: true, message: 'Artikel saknar SKU, kan ej synka' });
    }

    const accessToken = await getFortnoxToken(base44);

    const articleBody = {
      ArticleNumber: articleNumber,
      Description: article.name || articleNumber,
      StockGoods: true,
      Unit: article.unit || 'st'
    };

    if (article.unit_cost != null) articleBody.PurchasePrice = article.unit_cost;

    // Try to update first (PUT), if 404 create (POST)
    const putRes = await fetch(`https://api.fortnox.se/3/articles/${encodeURIComponent(articleNumber)}`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ Article: articleBody })
    });

    if (putRes.status === 404) {
      // Article doesn't exist in Fortnox, create it
      const postRes = await fetch('https://api.fortnox.se/3/articles', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Article: articleBody })
      });
      const postText = await postRes.text();
      if (!postRes.ok) throw new Error('Fortnox skapa artikel fel: ' + postText);
      console.log('Artikel skapad i Fortnox:', articleNumber);
      return Response.json({ success: true, action: 'created', article_number: articleNumber });
    }

    const putText = await putRes.text();
    if (!putRes.ok) throw new Error('Fortnox uppdatera artikel fel: ' + putText);

    console.log('Artikel uppdaterad i Fortnox:', articleNumber);
    return Response.json({ success: true, action: 'updated', article_number: articleNumber });

  } catch (error) {
    console.error('fortnoxArticleSync error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});