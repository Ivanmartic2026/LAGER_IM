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

    const normalized = scan.normalized_fields || scan.extracted_fields || {};
    const batchNumber = normalized.batch_number;
    if (!batchNumber) return Response.json({ error: 'No batch_number in scan' }, { status: 400 });

    const matchResults = scan.match_results || {};
    const confidence = scan.field_confidence || {};
    const newConfidence = confidence.overall || 0;

    // Check for existing batch
    const existing = await base44.asServiceRole.entities.Batch.filter({ batch_number: batchNumber });

    let batch;
    let action;

    if (existing.length > 0) {
      // Merge: only update fields where new confidence is higher
      const existingBatch = existing[0];
      const updates = {};

      // Only update fields if new scan has higher confidence
      if (newConfidence > (existingBatch._last_confidence || 0)) {
        if (normalized.article_sku) updates.article_sku = normalized.article_sku;
        if (normalized.article_name) updates.article_name = normalized.article_name;
        if (normalized.supplier_name) updates.supplier_name = normalized.supplier_name;
        if (normalized.manufacturing_date) updates.manufacturing_date = normalized.manufacturing_date;
        if (normalized.production_date) updates.production_date = normalized.production_date;
        if (normalized.expiry_date) updates.expiry_date = normalized.expiry_date;
        if (normalized.quantity) updates.quantity = normalized.quantity;
        if (matchResults.article_match_id) updates.article_id = matchResults.article_match_id;
        if (matchResults.supplier_match_id) updates.supplier_id = matchResults.supplier_match_id;
        if (matchResults.po_match_id) updates.purchase_order_id = matchResults.po_match_id;
      }

      batch = await base44.asServiceRole.entities.Batch.update(existingBatch.id, updates);
      action = 'updated';

      // Log activity
      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.BatchActivity.create({
          batch_id: existingBatch.id,
          type: 'reanalysis',
          message: `Batch uppdaterad från ny AI-scanning (confidence: ${(newConfidence * 100).toFixed(0)}%)`,
          actor_email: user.email,
          actor_name: user.full_name,
          metadata: { label_scan_id, updates, new_confidence: newConfidence }
        });
      }

      // Update scan with batch_id
      await base44.asServiceRole.entities.LabelScan.update(scan.id, { batch_id: existingBatch.id });

    } else {
      // Create new batch
      batch = await base44.asServiceRole.entities.Batch.create({
        batch_number: batchNumber,
        raw_batch_number: scan.extracted_fields?.batch_number || batchNumber,
        article_id: matchResults.article_match_id || null,
        article_sku: normalized.article_sku || null,
        article_name: normalized.article_name || null,
        supplier_id: matchResults.supplier_match_id || null,
        supplier_name: normalized.supplier_name || null,
        supplier_source: matchResults.supplier_match_id ? 'ai_inferred' : 'unknown',
        purchase_order_id: matchResults.po_match_id || null,
        quantity: normalized.quantity || null,
        manufacturing_date: normalized.manufacturing_date || null,
        expiry_date: normalized.expiry_date || null,
        production_date: normalized.production_date || null,
        status: 'pending_verification',
        risk_score: 0
      });
      action = 'created';

      // Update scan with batch_id
      await base44.asServiceRole.entities.LabelScan.update(scan.id, { batch_id: batch.id });

      // Log activity
      await base44.asServiceRole.entities.BatchActivity.create({
        batch_id: batch.id,
        type: 'system',
        message: `Batch skapad från AI-scanning (confidence: ${(newConfidence * 100).toFixed(0)}%)`,
        actor_email: 'system',
        actor_name: 'System',
        metadata: { label_scan_id }
      });
    }

    return Response.json({ success: true, batch_id: batch.id, action });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});