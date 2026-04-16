import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
  if (!response.ok) throw new Error('Token refresh failed: ' + text);
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
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = await getFortnoxToken(base44);

    const res = await fetch('https://api.fortnox.se/3/projects', {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });

    const text = await res.text();
    if (!res.ok) return Response.json({ error: `Fortnox fel ${res.status}: ${text}` }, { status: 500 });

    const data = JSON.parse(text);
    const projects = (data.Projects || []).map(p => ({
      projectNumber: p.ProjectNumber,
      description: p.Description || p.ProjectNumber
    }));

    return Response.json({ projects });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});