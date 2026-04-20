import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const configs = await base44.asServiceRole.entities.KimiConfig.filter({ is_active: true }, '-created_date', 1);

    const patch = {
      thinking_mode: true,
      min_confidence_to_save_batch: 0.60,
      confidence_threshold_auto_approve: 0.88,
      prompt_version: 'v2'
    };

    if (configs.length > 0) {
      await base44.asServiceRole.entities.KimiConfig.update(configs[0].id, patch);
      return Response.json({ success: true, updated: configs[0].id, patch });
    } else {
      const created = await base44.asServiceRole.entities.KimiConfig.create({
        is_active: true,
        model_name: 'kimi-k2.5',
        api_base_url: 'https://api.moonshot.ai/v1',
        confidence_threshold_manual_review: 0.60,
        max_retries: 2,
        timeout_ms: 30000,
        cost_limit_per_run: 10,
        monthly_cost_limit: 300,
        current_month_spend: 0,
        ...patch
      });
      return Response.json({ success: true, created: created.id, patch });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});