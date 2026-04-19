import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { label_scan_id } = await req.json();
    if (!label_scan_id) return Response.json({ error: 'label_scan_id required' }, { status: 400 });

    const scans = await base44.asServiceRole.entities.LabelScan.filter({ id: label_scan_id });
    if (!scans || scans.length === 0) return Response.json({ error: 'LabelScan not found' }, { status: 404 });
    const scan = scans[0];

    const confidence = scan.field_confidence || {};
    const overallConfidence = confidence.overall || 0;
    const matchResults = scan.match_results || {};

    // Risk factors
    const lowConfidenceFactor = (1 - overallConfidence); // 0-1
    const supplierMismatch = matchResults.supplier_match_confidence < 0.5 ? 1 : 0;
    const duplicateFound = matchResults.duplicate_check?.hasDuplicates ? 1 : 0;

    // Check pattern deviation
    let patternDeviation = 0;
    let layoutChange = 0;
    if (scan.batch_id) {
      // Get supplier pattern
      const batches = await base44.asServiceRole.entities.Batch.filter({ id: scan.batch_id });
      if (batches.length > 0 && batches[0].supplier_id) {
        const patterns = await base44.asServiceRole.entities.SupplierLabelPattern.filter({ supplier_id: batches[0].supplier_id });
        if (patterns.length > 0) {
          const p = patterns[0];
          const normalizedBatch = scan.normalized_fields?.batch_number || '';
          if (p.batch_prefix_patterns && p.batch_prefix_patterns.length > 0) {
            const matchesPattern = p.batch_prefix_patterns.some(prefix => normalizedBatch.startsWith(prefix));
            patternDeviation = matchesPattern ? 0 : 1;
          }
          // Layout change detection (simplified)
          if (p.label_layout_fingerprint && scan.ai_raw_response?.choices?.[0]?.message?.content) {
            layoutChange = 0; // Would compare fingerprints in full implementation
          }
        }
      }
    }

    // Formula: w1*(1-overall_confidence)*40 + w2*pattern_deviation*25 + w3*supplier_mismatch*20 + w4*duplicate_penalty*10 + w5*layout_change*5
    const riskScore = Math.round(
      lowConfidenceFactor * 40 +
      patternDeviation * 25 +
      supplierMismatch * 20 +
      duplicateFound * 10 +
      layoutChange * 5
    );

    const clampedScore = Math.min(100, Math.max(0, riskScore));

    // Determine flags
    const riskFlags = [];
    if (overallConfidence < 0.6) riskFlags.push('low_ai_confidence');
    if (supplierMismatch) riskFlags.push('supplier_mismatch');
    if (patternDeviation) riskFlags.push('batch_pattern_deviation');
    if (duplicateFound) riskFlags.push('duplicate_batch');
    if (!matchResults.supplier_match_id) riskFlags.push('unknown_supplier');
    if (!matchResults.po_match_id) riskFlags.push('no_po_match');
    if (layoutChange) riskFlags.push('label_format_changed');

    // Determine batch status
    let batchStatus = 'pending_verification';
    if (clampedScore < 30) batchStatus = 'verified';
    else if (clampedScore >= 70) batchStatus = 'quarantine';

    // Update associated batch if exists
    if (scan.batch_id) {
      await base44.asServiceRole.entities.Batch.update(scan.batch_id, {
        risk_score: clampedScore,
        risk_flags: riskFlags,
        status: batchStatus
      });
    }

    return Response.json({
      success: true,
      risk_score: clampedScore,
      risk_flags: riskFlags,
      batch_status: batchStatus,
      breakdown: {
        low_confidence: Math.round(lowConfidenceFactor * 40),
        pattern_deviation: patternDeviation * 25,
        supplier_mismatch: supplierMismatch * 20,
        duplicate_penalty: duplicateFound * 10,
        layout_change: layoutChange * 5
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});