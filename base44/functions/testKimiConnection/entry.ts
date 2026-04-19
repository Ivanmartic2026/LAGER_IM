import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MOONSHOT_API_KEY = Deno.env.get("KIMI_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get KimiConfig for api_base_url
    let apiBaseUrl = 'https://api.moonshot.ai/v1';
    try {
      const configs = await base44.asServiceRole.entities.KimiConfig.filter({ is_active: true }, '-created_date', 1);
      if (configs.length > 0 && configs[0].api_base_url) {
        apiBaseUrl = configs[0].api_base_url;
      }
    } catch (e) { /* use default */ }

    if (!MOONSHOT_API_KEY) {
      return Response.json({
        ok: false,
        model_reachable: false,
        response_time_ms: 0,
        error_message: 'MOONSHOT_API_KEY not configured',
        timestamp: new Date().toISOString()
      });
    }

    const startTime = Date.now();
    let ok = false;
    let modelReachable = false;
    let errorMessage = null;

    try {
      const resp = await fetch(`${apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOONSHOT_API_KEY}`
        },
        body: JSON.stringify({
          model: 'kimi-k2.5',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 20,
          chat_template_kwargs: { thinking: false }
        })
      });

      const responseTimeMs = Date.now() - startTime;

      if (resp.ok) {
        ok = true;
        modelReachable = true;
      } else {
        const errText = await resp.text();
        errorMessage = `HTTP ${resp.status}: ${errText}`;
        // Still reachable if we got a proper API error (not network error)
        modelReachable = resp.status < 500;
      }

      // Create notification to ivan
      const notificationBody = ok
        ? `✅ Kimi K2.5 är online. Svarstid: ${responseTimeMs}ms`
        : `❌ Kimi K2.5 fel: ${errorMessage}`;

      await base44.asServiceRole.entities.Notification.create({
        user_email: 'ivan@imvision.se',
        type: 'system',
        title: ok ? 'Kimi-anslutning OK' : 'Kimi-anslutning FEL',
        message: notificationBody,
        is_read: false
      });

      return Response.json({
        ok,
        model_reachable: modelReachable,
        response_time_ms: responseTimeMs,
        error_message: errorMessage,
        timestamp: new Date().toISOString()
      });

    } catch (fetchErr) {
      const responseTimeMs = Date.now() - startTime;
      errorMessage = fetchErr.message;

      await base44.asServiceRole.entities.Notification.create({
        user_email: 'ivan@imvision.se',
        type: 'system',
        title: 'Kimi-anslutning FEL',
        message: `❌ Nätverksfel: ${fetchErr.message}`,
        is_read: false
      });

      return Response.json({
        ok: false,
        model_reachable: false,
        response_time_ms: responseTimeMs,
        error_message: errorMessage,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});