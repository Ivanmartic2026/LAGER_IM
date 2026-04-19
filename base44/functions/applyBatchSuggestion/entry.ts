import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { suggestion_id } = await req.json();
    if (!suggestion_id) return Response.json({ error: 'suggestion_id krävs' }, { status: 400 });

    const suggestion = await base44.asServiceRole.entities.BatchSuggestion.get(suggestion_id);
    if (!suggestion) return Response.json({ error: 'Suggestion hittades inte' }, { status: 404 });
    if (suggestion.status !== 'pending') return Response.json({ error: 'Suggestion är inte pending' }, { status: 409 });

    const batch = await base44.asServiceRole.entities.Batch.get(suggestion.batch_id);
    if (!batch) return Response.json({ error: 'Batch hittades inte' }, { status: 404 });

    // Apply based on type
    const updateData = {};
    switch (suggestion.suggestion_type) {
      case 'supplier_link':
        updateData.supplier_id = suggestion.suggested_value;
        updateData.supplier_name = suggestion.suggested_value;
        break;
      case 'article_link':
        updateData.article_id = suggestion.suggested_value;
        break;
      case 'batch_number_correction':
        updateData.batch_number = suggestion.suggested_value;
        break;
      case 'date_fill':
        updateData.manufacturing_date = suggestion.suggested_value;
        break;
      case 'pattern_normalization':
        updateData.batch_number = suggestion.suggested_value;
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await base44.asServiceRole.entities.Batch.update(suggestion.batch_id, updateData);
    }

    await base44.asServiceRole.entities.BatchSuggestion.update(suggestion_id, {
      status: 'accepted',
      decided_by: user.email,
      decided_at: new Date().toISOString()
    });

    await base44.asServiceRole.entities.BatchActivity.create({
      batch_id: suggestion.batch_id,
      type: 'suggestion_accepted',
      message: `Förslag "${suggestion.suggestion_type}" accepterat: ${suggestion.current_value} → ${suggestion.suggested_value}`,
      actor_email: user.email,
      actor_name: user.full_name
    });

    // Update pattern sample count if relevant
    if (suggestion.based_on_pattern_id && ['batch_number_correction','pattern_normalization'].includes(suggestion.suggestion_type)) {
      const pattern = await base44.asServiceRole.entities.SupplierLabelPattern.get(suggestion.based_on_pattern_id).catch(() => null);
      if (pattern) {
        await base44.asServiceRole.entities.SupplierLabelPattern.update(suggestion.based_on_pattern_id, {
          sample_count: (pattern.sample_count || 0) + 1
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});