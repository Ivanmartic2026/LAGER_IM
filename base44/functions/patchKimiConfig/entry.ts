import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// One-shot migration: update the active KimiConfig record with new fields
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const configs = await base44.asServiceRole.entities.KimiConfig.filter({ is_active: true }, '-created_date', 1);

    if (configs.length === 0) {
      // Create fresh config
      const created = await base44.asServiceRole.entities.KimiConfig.create({
        model_name: 'kimi-k2.5',
        api_base_url: 'https://api.moonshot.ai/v1',
        thinking_mode: false,
        is_active: true,
        prompt_version: 'v1',
        confidence_threshold_auto_approve: 0.85,
        confidence_threshold_manual_review: 0.6,
        max_retries: 2,
        timeout_ms: 30000,
        cost_limit_per_run: 10,
        monthly_cost_limit: 300,
        current_month_spend: 0,
        min_confidence_to_save_batch: 0.4
      });
      return Response.json({ success: true, action: 'created', id: created.id });
    }

    const config = configs[0];
    await base44.asServiceRole.entities.KimiConfig.update(config.id, {
      model_name: 'kimi-k2.5',
      api_base_url: 'https://api.moonshot.ai/v1',
      thinking_mode: false
    });

    return Response.json({ success: true, action: 'updated', id: config.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});