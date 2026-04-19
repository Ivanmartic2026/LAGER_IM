import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let suggestionsCreated = 0;

    const patterns = await base44.asServiceRole.entities.SupplierLabelPattern.list('-last_updated', 100);

    for (const pattern of patterns) {
      const { supplier_id, batch_prefix_patterns, batch_regex } = pattern;
      if (!supplier_id || !batch_prefix_patterns || batch_prefix_patterns.length === 0) continue;

      // Get all pending/verified batches for this supplier
      const batches = await base44.asServiceRole.entities.Batch.filter(
        { supplier_id }, '-created_date', 100
      );

      for (const batch of batches) {
        const bn = batch.batch_number;
        if (!bn) continue;

        const matchesAnyPrefix = batch_prefix_patterns.some(p => bn.startsWith(p));
        if (!matchesAnyPrefix && batch_prefix_patterns.length >= 2) {
          // Check if there's a close variant (e.g. LG- vs LG_)
          const normalized = bn.replace(/[-_]/, '-');
          const suggestion = batch_prefix_patterns.find(p => {
            const pNorm = p.replace(/[-_]/, '-');
            return normalized.startsWith(pNorm);
          });

          if (suggestion) {
            // Check if suggestion already exists
            const existing = await base44.asServiceRole.entities.BatchSuggestion.filter({
              batch_id: batch.id,
              suggestion_type: 'batch_number_correction',
              status: 'pending'
            });
            if (existing.length > 0) continue;

            const suggestedValue = batch.batch_number.replace(/^([A-Z]+)[-_]/, `$1-`);
            await base44.asServiceRole.entities.BatchSuggestion.create({
              batch_id: batch.id,
              suggestion_type: 'pattern_normalization',
              current_value: batch.batch_number,
              suggested_value: suggestedValue,
              confidence: 0.8,
              reasoning: `Batchnummer avviker från leverantörens normalmönster (${batch_prefix_patterns.join(', ')}). Föreslår normalisering av separator.`,
              based_on_pattern_id: pattern.id,
              based_on_batch_ids: batches.filter(b => batch_prefix_patterns.some(p => b.batch_number?.startsWith(p))).slice(0, 5).map(b => b.id),
              status: 'pending'
            });
            suggestionsCreated++;
          }
        }

        // Suggest reanalysis for old low-confidence batches
        if (batch.risk_score > 60 && batch.status === 'pending_verification') {
          const existing = await base44.asServiceRole.entities.BatchSuggestion.filter({
            batch_id: batch.id,
            suggestion_type: 'reanalyze_image',
            status: 'pending'
          });
          if (existing.length === 0) {
            await base44.asServiceRole.entities.BatchSuggestion.create({
              batch_id: batch.id,
              suggestion_type: 'reanalyze_image',
              current_value: `risk_score: ${batch.risk_score}`,
              suggested_value: 'Kör om AI-analys med ny modell',
              confidence: 0.9,
              reasoning: `Hög riskpoäng (${batch.risk_score}/100). Omanalys rekommenderas.`,
              status: 'pending'
            });
            suggestionsCreated++;
          }
        }
      }
    }

    return Response.json({ success: true, suggestions_created: suggestionsCreated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});