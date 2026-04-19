import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { suggestion_id, reason } = await req.json();
    if (!suggestion_id) return Response.json({ error: 'suggestion_id krävs' }, { status: 400 });

    const suggestion = await base44.asServiceRole.entities.BatchSuggestion.get(suggestion_id);
    if (!suggestion) return Response.json({ error: 'Suggestion hittades inte' }, { status: 404 });

    await base44.asServiceRole.entities.BatchSuggestion.update(suggestion_id, {
      status: 'rejected',
      decided_by: user.email,
      decided_at: new Date().toISOString()
    });

    await base44.asServiceRole.entities.BatchActivity.create({
      batch_id: suggestion.batch_id,
      type: 'suggestion_rejected',
      message: `Förslag "${suggestion.suggestion_type}" avvisat${reason ? ': ' + reason : ''}`,
      actor_email: user.email,
      actor_name: user.full_name
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});