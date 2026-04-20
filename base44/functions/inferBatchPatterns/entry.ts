import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const triggeredBy = body.triggered_by || 'manual';

    const startedAt = new Date().toISOString();
    const t0 = Date.now();

    // Load all batches and articles
    const batches = await base44.asServiceRole.entities.Batch.list('-created_date', 1000);
    const samplesAnalyzed = batches.length;

    // Load existing rules to avoid duplicates
    const existingRules = await base44.asServiceRole.entities.BatchPatternRule.list('-created_date', 500);
    const existingRuleKeys = new Set(existingRules.map(r => `${r.pattern_type}:${(r.pattern_value || '').toUpperCase()}`));

    // ── Group by prefix (2-4 chars) ──
    const prefixGroups = {};
    for (const batch of batches) {
      const bn = normalizeBatchNumber(batch.batch_number || '');
      if (bn.length < 3) continue;
      for (let len = 2; len <= Math.min(4, bn.length - 1); len++) {
        const prefix = bn.slice(0, len);
        if (!/^[A-Z0-9]+$/.test(prefix)) continue;
        if (!prefixGroups[prefix]) prefixGroups[prefix] = [];
        prefixGroups[prefix].push(batch);
      }
    }

    // ── Group by suffix (2-4 chars) ──
    const suffixGroups = {};
    for (const batch of batches) {
      const bn = normalizeBatchNumber(batch.batch_number || '');
      if (bn.length < 3) continue;
      for (let len = 2; len <= Math.min(4, bn.length - 1); len++) {
        const suffix = bn.slice(-len);
        if (!/^[A-Z0-9]+$/.test(suffix)) continue;
        if (!suffixGroups[suffix]) suffixGroups[suffix] = [];
        suffixGroups[suffix].push(batch);
      }
    }

    let rulesCreated = 0;
    let rulesUpdated = 0;
    let patternsFound = 0;

    const MIN_SAMPLES = 5;
    const MIN_SUPPLIER_PURITY = 0.80;

    // Process prefix groups
    for (const [prefix, groupBatches] of Object.entries(prefixGroups)) {
      if (groupBatches.length < MIN_SAMPLES) continue;

      const supplierCounts = {};
      const categoryCounts = {};
      for (const b of groupBatches) {
        const sid = b.supplier_id || b.supplier_name || 'unknown';
        supplierCounts[sid] = (supplierCounts[sid] || 0) + 1;
        if (b.article_name) {
          // infer category from article name patterns
        }
      }

      const topSupplier = Object.entries(supplierCounts).sort((a, b) => b[1] - a[1])[0];
      if (!topSupplier) continue;

      const purity = topSupplier[1] / groupBatches.length;
      if (purity < MIN_SUPPLIER_PURITY) continue;

      patternsFound++;
      const ruleKey = `prefix:${prefix}`;
      const conflictCount = groupBatches.length - topSupplier[1];

      if (existingRuleKeys.has(ruleKey)) {
        // Update sample count on existing rule
        const existing = existingRules.find(r => r.pattern_type === 'prefix' && (r.pattern_value || '').toUpperCase() === prefix);
        if (existing) {
          await base44.asServiceRole.entities.BatchPatternRule.update(existing.id, {
            sample_count: groupBatches.length,
            conflict_count: conflictCount,
            confidence: purity,
            sample_batch_ids: groupBatches.slice(0, 10).map(b => b.id)
          });
          rulesUpdated++;
        }
        continue;
      }

      // Find supplier record to get name
      const supplierId = topSupplier[0] !== 'unknown' ? topSupplier[0] : null;
      const supplierName = groupBatches.find(b => b.supplier_id === supplierId)?.supplier_name
        || groupBatches.find(b => b.supplier_name)?.supplier_name
        || null;

      await base44.asServiceRole.entities.BatchPatternRule.create({
        pattern_type: 'prefix',
        pattern_value: prefix,
        applies_to: 'batch',
        preferred_supplier_id: supplierId !== 'unknown' ? supplierId : null,
        preferred_supplier_name: supplierName,
        source: 'ai_inferred',
        confidence: purity,
        sample_count: groupBatches.length,
        sample_batch_ids: groupBatches.slice(0, 10).map(b => b.id),
        conflict_count: conflictCount,
        status: 'suggested',
        created_by: user.email
      });

      existingRuleKeys.add(ruleKey);
      rulesCreated++;
    }

    // Process suffix groups
    for (const [suffix, groupBatches] of Object.entries(suffixGroups)) {
      if (groupBatches.length < MIN_SAMPLES) continue;

      const supplierCounts = {};
      for (const b of groupBatches) {
        const sid = b.supplier_id || b.supplier_name || 'unknown';
        supplierCounts[sid] = (supplierCounts[sid] || 0) + 1;
      }

      const topSupplier = Object.entries(supplierCounts).sort((a, b) => b[1] - a[1])[0];
      if (!topSupplier) continue;

      const purity = topSupplier[1] / groupBatches.length;
      if (purity < MIN_SUPPLIER_PURITY) continue;

      patternsFound++;
      const ruleKey = `suffix:${suffix}`;
      const conflictCount = groupBatches.length - topSupplier[1];

      if (existingRuleKeys.has(ruleKey)) {
        const existing = existingRules.find(r => r.pattern_type === 'suffix' && (r.pattern_value || '').toUpperCase() === suffix);
        if (existing) {
          await base44.asServiceRole.entities.BatchPatternRule.update(existing.id, {
            sample_count: groupBatches.length,
            conflict_count: conflictCount,
            confidence: purity
          });
          rulesUpdated++;
        }
        continue;
      }

      const supplierId = topSupplier[0] !== 'unknown' ? topSupplier[0] : null;
      const supplierName = groupBatches.find(b => b.supplier_id === supplierId)?.supplier_name
        || groupBatches.find(b => b.supplier_name)?.supplier_name
        || null;

      await base44.asServiceRole.entities.BatchPatternRule.create({
        pattern_type: 'suffix',
        pattern_value: suffix,
        applies_to: 'batch',
        preferred_supplier_id: supplierId !== 'unknown' ? supplierId : null,
        preferred_supplier_name: supplierName,
        source: 'ai_inferred',
        confidence: purity,
        sample_count: groupBatches.length,
        sample_batch_ids: groupBatches.slice(0, 10).map(b => b.id),
        conflict_count: conflictCount,
        status: 'suggested',
        created_by: user.email
      });

      existingRuleKeys.add(ruleKey);
      rulesCreated++;
    }

    const durationMs = Date.now() - t0;

    // Write inference log
    await base44.asServiceRole.entities.PatternInferenceLog.create({
      started_at: startedAt,
      duration_ms: durationMs,
      samples_analyzed: samplesAnalyzed,
      patterns_found: patternsFound,
      rules_created: rulesCreated,
      rules_updated: rulesUpdated,
      triggered_by: triggeredBy
    });

    return Response.json({
      success: true,
      samples_analyzed: samplesAnalyzed,
      patterns_found: patternsFound,
      rules_created: rulesCreated,
      rules_updated: rulesUpdated,
      duration_ms: durationMs
    });

  } catch (error) {
    console.error('inferBatchPatterns error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function normalizeBatchNumber(raw) {
  return (raw || '').toUpperCase().replace(/\s+/g, '').trim();
}