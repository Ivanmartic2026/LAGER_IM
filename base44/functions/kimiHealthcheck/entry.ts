import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MOONSHOT_API_KEY = Deno.env.get("KIMI_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!MOONSHOT_API_KEY) {
      await logResult(base44, user.email, 'error', 0, 'KIMI_API_KEY saknas i Secrets');
      return Response.json({ ok: false, error: 'KIMI_API_KEY not configured' });
    }

    const start = Date.now();
    let ok = false;
    let errorMsg = null;

    try {
      const resp = await fetch('https://api.moonshot.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOONSHOT_API_KEY}`
        },
        body: JSON.stringify({
          model: 'moonshot-v1-8k',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }]
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (resp.ok) {
        ok = true;
      } else {
        const txt = await resp.text();
        errorMsg = `HTTP ${resp.status}: ${txt.substring(0, 200)}`;
      }
    } catch (e) {
      errorMsg = e.message;
    }

    const duration = Date.now() - start;

    // Log to SyncLog
    await logResult(base44, user.email, ok ? 'success' : 'error', duration, errorMsg);

    // Update KimiConfig if check passed
    if (ok) {
      const configs = await base44.asServiceRole.entities.KimiConfig.filter({ is_active: false }, '-created_date', 1).catch(() => []);
      for (const c of configs) {
        await base44.asServiceRole.entities.KimiConfig.update(c.id, { is_active: true }).catch(() => {});
      }
    }

    return Response.json({ ok, duration_ms: duration, error: errorMsg || null });

  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});

async function logResult(base44, email, status, duration, errorMsg) {
  await base44.asServiceRole.entities.SyncLog.create({
    sync_type: 'kimi_healthcheck',
    status,
    direction: 'internal',
    duration_ms: duration,
    error_message: errorMsg || null,
    triggered_by: email || 'system'
  }).catch(() => {});
}