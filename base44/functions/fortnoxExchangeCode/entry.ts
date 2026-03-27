import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_ID = 'C84gmzGW0STm';
const CLIENT_SECRET = 'jCAiY13645iCfRljftcvAES3BZNL1W5Z';
const REDIRECT_URI = 'https://lager-ai-7d26cc74.base44.app/FortnoxSync';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code) return Response.json({ error: 'Missing code' }, { status: 400 });

    const credentials = btoa(CLIENT_ID + ':' + CLIENT_SECRET);
    const response = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + credentials,
      },
      body: 'grant_type=authorization_code&code=' + encodeURIComponent(code) + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI)
    });

    const text = await response.text();
    if (!response.ok) {
      return Response.json({ success: false, error: text }, { status: 400 });
    }

    const data = JSON.parse(text);
    const expiresAt = Date.now() + ((data.expires_in || 3600) * 1000);

    const existing = await base44.entities.FortnoxConfig.list();
    if (existing.length > 0) {
      await base44.entities.FortnoxConfig.update(existing[0].id, {
        refresh_token: data.refresh_token,
        access_token: data.access_token,
        token_expires_at: expiresAt
      });
    } else {
      await base44.entities.FortnoxConfig.create({
        refresh_token: data.refresh_token,
        access_token: data.access_token,
        token_expires_at: expiresAt
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Exchange code error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});