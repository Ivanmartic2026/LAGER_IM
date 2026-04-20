import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createHash } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { image_url, image_urls, context, context_reference_id } = body;

    const fileUrls = image_urls || (image_url ? [image_url] : []);
    if (fileUrls.length === 0) return Response.json({ error: 'No images provided' }, { status: 400 });

    const validContexts = [
      'purchase_receiving','article_creation','repair_return','site_report','production',
      'manual_scan','reanalysis','pick','ship_out','move_location','stock_adjustment',
      'inventory_count','service'
    ];
    if (!context || !validContexts.includes(context)) {
      return Response.json({ error: `Invalid context. Must be one of: ${validContexts.join(', ')}` }, { status: 400 });
    }

    const firstUrl = fileUrls[0];

    // ── 1. Image hash + dedup ──
    const imgResp = await fetch(firstUrl);
    const imgBuffer = await imgResp.arrayBuffer();
    const imgHash = createHash('sha256').update(new Uint8Array(imgBuffer)).digest('hex');

    const existingScans = await base44.asServiceRole.entities.LabelScan.filter({ image_hash: imgHash }, '-created_date', 1);
    if (existingScans.length > 0) {
      const s = existingScans[0];
      const ageDays = (Date.now() - new Date(s.created_date).getTime()) / 86400000;
      if (ageDays < 7) {
        return Response.json({
          batch_id: s.batch_id,
          article_id: s.match_results?.article_match_id,
          label_scan_id: s.id,
          match_type: 'dedupe_cached',
          message: 'Bild analyserades nyligen'
        });
      }
    }

    // ── 2. AI analysis ──
    let analysis;
    try {
      const r = await base44.asServiceRole.functions.invoke('analyzeLabelWithKimi', { fileUrls });
      analysis = r.data;
    } catch (e) {
      return Response.json({ error: `AI analysis failed: ${e.message}` }, { status: 500 });
    }

    const extracted = analysis?.extracted_fields || {};

    // ── 3. Create stub LabelScan so we have an ID ──
    const labelScan = await base44.asServiceRole.entities.LabelScan.create({
      image_url: firstUrl,
      image_hash: imgHash,
      image_uploaded_by: user.email,
      image_uploaded_at: new Date().toISOString(),
      ai_provider: 'moonshot',
      ai_model_used: analysis?.model_used || 'kimi-k2.5',
      extracted_fields: extracted,
      field_confidence: analysis?.field_confidence || {},
      status: 'processing',
      context,
      context_reference_id
    });

    // ── 4. Build full identifier list ──
    const rawIdentifiers = buildIdentifiers(extracted);

    // ── 5. findExistingMatches — HARD ASSERTION ──
    const matchStart = Date.now();
    const { matches, hardMatchFound } = await findExistingMatches(base44, rawIdentifiers);
    const matchDurationMs = Date.now() - matchStart;

    // ── 6. Apply pattern rules ──
    const patternSuggestion = await applyPatternRules(base44, rawIdentifiers);

    // ── 7. Write ScanMatchAudit ──
    const decision = hardMatchFound
      ? 'auto_link'
      : matches.length > 0
        ? 'review_queue'
        : 'no_match_prompt_create';

    await base44.asServiceRole.entities.ScanMatchAudit.create({
      label_scan_id: labelScan.id,
      identifiers_searched: rawIdentifiers,
      matches_found: matches,
      decision,
      confidence: hardMatchFound ? 1.0 : matches.length > 0 ? 0.7 : 0.0,
      pattern_rules_applied: patternSuggestion.ruleIds,
      supplier_inferred_from_rule: patternSuggestion.supplierName || null,
      timestamp: new Date().toISOString(),
      duration_ms: matchDurationMs,
      actor: user.email
    });

    // ── 8. HARD MATCH → auto-link, no creation ──
    if (hardMatchFound) {
      const topBatch = matches.find(m => m.entity === 'Batch');
      const topArticle = matches.find(m => m.entity === 'Article');
      const batchId = topBatch?.id || null;
      const articleId = topArticle?.id || null;

      // Check supplier_mismatch if we have a batch and a pattern suggestion
      if (batchId && patternSuggestion.supplierId) {
        const batch = await base44.asServiceRole.entities.Batch.get(batchId);
        if (batch && batch.supplier_id && batch.supplier_id !== patternSuggestion.supplierId) {
          const existingFlags = batch.risk_flags || [];
          if (!existingFlags.includes('supplier_mismatch')) {
            await base44.asServiceRole.entities.Batch.update(batchId, {
              risk_flags: [...existingFlags, 'supplier_mismatch']
            });
            // Write BatchEvent for pattern_conflict
            await base44.asServiceRole.entities.BatchEvent.create({
              batch_id: batchId,
              event_type: 'status_changed',
              actor: user.email,
              timestamp: new Date().toISOString(),
              payload: {
                type: 'pattern_conflict',
                rule_supplier: patternSuggestion.supplierName,
                batch_supplier_id: batch.supplier_id,
                identifiers: rawIdentifiers
              },
              source_entity: 'LabelScan',
              source_id: labelScan.id
            });
          }
        }
      }

      await base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
        batch_id: batchId,
        status: 'completed',
        match_results: {
          article_match_id: articleId,
          article_match_confidence: 1.0,
          batch_match_id: batchId,
          batch_match_confidence: 1.0,
          batch_match_method: topBatch?.matched_on || 'exact',
          review_queued: false
        }
      });

      await doContextLinking(base44, { context, context_reference_id, batchId, labelScanId: labelScan.id });

      return Response.json({
        success: true,
        batch_id: batchId,
        article_id: articleId,
        label_scan_id: labelScan.id,
        match_type: 'auto_link',
        pattern_suggestion: patternSuggestion.toJSON ? patternSuggestion.toJSON() : null
      });
    }

    // ── 9. Ambiguous candidates → filter + auto-link check ──
    if (matches.length > 0) {
      // Filter: drop candidates below 0.50 confidence
      const qualifiedMatches = matches.filter(m => m.confidence >= 0.50);

      // Check for single high-confidence candidate (≥ 0.88) → auto-link
      const highConfBatch = qualifiedMatches
        .filter(m => m.entity === 'Batch' && m.confidence >= 0.88)
        .sort((a, b) => b.confidence - a.confidence)[0];

      if (highConfBatch) {
        const batchId = highConfBatch.id;
        const articleMatch = qualifiedMatches.find(m => m.entity === 'Article');
        const articleId = articleMatch?.id || null;

        // Write audit entry as auto-approved
        await base44.asServiceRole.entities.MatchReviewQueue.create({
          label_scan_id: labelScan.id,
          candidate_batch_ids: [batchId],
          candidate_article_ids: articleId ? [articleId] : [],
          confidence_scores: { [batchId]: highConfBatch.confidence },
          extracted_summary: extracted,
          image_url: firstUrl,
          context,
          context_reference_id,
          suggested_action: 'link_existing_batch',
          reason: 'ambiguous_match',
          status: 'approved',
          approved_batch_id: batchId,
          approved_article_id: articleId,
          reviewed_by: 'system:auto-link',
          reviewed_at: new Date().toISOString(),
          review_notes: `Auto-linked: single candidate with confidence ${highConfBatch.confidence}`
        });

        await base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
          batch_id: batchId,
          status: 'completed',
          match_results: {
            article_match_id: articleId,
            article_match_confidence: articleMatch?.confidence || null,
            batch_match_id: batchId,
            batch_match_confidence: highConfBatch.confidence,
            batch_match_method: highConfBatch.matched_on || 'auto_link',
            review_queued: false
          }
        });

        await doContextLinking(base44, { context, context_reference_id, batchId, labelScanId: labelScan.id });

        return Response.json({
          success: true,
          batch_id: batchId,
          article_id: articleId,
          label_scan_id: labelScan.id,
          match_type: 'auto_link',
          confidence: highConfBatch.confidence
        });
      }

      // Multiple/low-confidence candidates → send to review queue (top 3 only)
      const topBatchIds = qualifiedMatches
        .filter(m => m.entity === 'Batch')
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
        .map(m => m.id);
      const topArticleIds = qualifiedMatches
        .filter(m => m.entity === 'Article')
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
        .map(m => m.id);

      const reviewEntry = await base44.asServiceRole.entities.MatchReviewQueue.create({
        label_scan_id: labelScan.id,
        candidate_batch_ids: topBatchIds,
        candidate_article_ids: topArticleIds,
        confidence_scores: Object.fromEntries(qualifiedMatches.map(m => [m.id, m.confidence])),
        extracted_summary: extracted,
        image_url: firstUrl,
        context,
        context_reference_id,
        suggested_action: 'link_existing_batch',
        reason: 'ambiguous_match',
        status: 'pending'
      });

      await base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
        status: 'manual_review',
        match_results: { review_queued: true, review_reason: 'ambiguous_match' }
      });

      return Response.json({
        needs_review: true,
        review_queue_id: reviewEntry.id,
        label_scan_id: labelScan.id,
        message: 'Skickades till granskning – ambiguous match'
      });
    }

    // ── 10. NO MATCH → prompt user ──
    await base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
      status: 'manual_review',
      match_results: { review_queued: false, review_reason: 'no_match' }
    });

    return Response.json({
      needs_user_decision: true,
      label_scan_id: labelScan.id,
      image_url: firstUrl,
      extracted_summary: extracted,
      barcode_values: extracted.barcode_values || [],
      pattern_suggestion: {
        supplier_id: patternSuggestion.supplierId,
        supplier_name: patternSuggestion.supplierName,
        category: patternSuggestion.category,
        series: patternSuggestion.series,
        rule_ids: patternSuggestion.ruleIds,
        explanation: patternSuggestion.explanation
      }
    });

  } catch (error) {
    console.error('scanAndProcess error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Helpers ──

function normalizeBatchNumber(raw) {
  return (raw || '').toUpperCase().replace(/\s+/g, '').trim();
}

function buildIdentifiers(extracted) {
  const ids = new Set();

  if (extracted.batch_number) {
    const raw = extracted.batch_number;
    ids.add(raw);
    ids.add(normalizeBatchNumber(raw));
    // canonical_core: strip common prefixes up to 4 chars
    const norm = normalizeBatchNumber(raw);
    if (norm.length > 4) ids.add(norm.slice(0, 4) + '_core:' + norm);
  }

  if (extracted.article_sku) {
    ids.add(extracted.article_sku);
    ids.add(normalizeBatchNumber(extracted.article_sku));
  }

  // All barcode raw_values and canonical_cores
  const barcodes = extracted.barcode_values || [];
  for (const bc of barcodes) {
    if (bc.raw_value) ids.add(bc.raw_value);
    if (bc.canonical_core) ids.add(bc.canonical_core);
    // Also add segments
    for (const seg of (bc.parsed_segments || [])) {
      if (seg && seg.length > 3) ids.add(seg);
    }
  }

  // OCR regions
  const regions = extracted.ocr_regions || [];
  for (const r of regions) {
    if (r.text && r.text.length > 2) ids.add(r.text.trim());
  }

  return [...ids].filter(Boolean);
}

async function findExistingMatches(base44, identifiers) {
  const matches = [];
  let hardMatchFound = false;

  // Load all batches (cap at 500 for perf)
  const batches = await base44.asServiceRole.entities.Batch.list('-updated_date', 500);

  for (const identifier of identifiers) {
    const norm = normalizeBatchNumber(identifier);
    if (!norm || norm.includes('_core:')) continue; // skip meta-identifiers

    for (const batch of batches) {
      let matchedOn = null;
      let confidence = 0;

      const normBatch = normalizeBatchNumber(batch.batch_number || '');
      const normRaw = normalizeBatchNumber(batch.raw_batch_number || '');

      if (normBatch && norm === normBatch) {
        matchedOn = 'batch_number'; confidence = 1.0;
      } else if (normRaw && norm === normRaw) {
        matchedOn = 'raw_batch_number'; confidence = 0.98;
      } else {
        // Check aliases
        const aliases = batch.aliases || [];
        for (const alias of aliases) {
          if (norm === normalizeBatchNumber(alias)) {
            matchedOn = 'alias'; confidence = 0.97; break;
          }
        }
        // Check canonical_core
        if (!matchedOn && batch.batch_pattern?.canonical_core) {
          const bcc = normalizeBatchNumber(batch.batch_pattern.canonical_core);
          if (norm === bcc) { matchedOn = 'canonical_core'; confidence = 0.95; }
        }
      }

      if (matchedOn && !matches.some(m => m.id === batch.id && m.entity === 'Batch')) {
        matches.push({ entity: 'Batch', id: batch.id, matched_on: matchedOn, confidence });
        if (confidence >= 0.90) hardMatchFound = true;
      }
    }

    // Check Articles (sku + legacy batch_number)
    const articles = await base44.asServiceRole.entities.Article.filter({ sku: identifier }, '-updated_date', 5);
    for (const a of articles) {
      if (!matches.some(m => m.id === a.id && m.entity === 'Article')) {
        matches.push({ entity: 'Article', id: a.id, matched_on: 'sku', confidence: 1.0 });
        hardMatchFound = true;
      }
    }

    // Legacy Article.batch_number
    const articlesByBatch = await base44.asServiceRole.entities.Article.filter({ batch_number: identifier }, '-updated_date', 5);
    for (const a of articlesByBatch) {
      if (!matches.some(m => m.id === a.id && m.entity === 'Article')) {
        matches.push({ entity: 'Article', id: a.id, matched_on: 'legacy_batch_number', confidence: 0.92 });
        if (0.92 >= 0.90) hardMatchFound = true;
      }
    }
  }

  // HARD INVARIANT: if hardMatchFound, we must NOT create any new Batch or Article
  // Any future code that tries to call .create after this returning hardMatchFound=true
  // must throw DUPLICATE_MATCH_FOUND
  return { matches, hardMatchFound };
}

async function applyPatternRules(base44, identifiers) {
  try {
    const activeRules = await base44.asServiceRole.entities.BatchPatternRule.filter({ status: 'active' }, '-confidence', 50);
    const matched = [];

    for (const rule of activeRules) {
      for (const id of identifiers) {
        let hit = false;
        const normId = normalizeBatchNumber(id);
        const normPat = normalizeBatchNumber(rule.pattern_value || '');

        if (rule.pattern_type === 'prefix' && normId.startsWith(normPat)) hit = true;
        else if (rule.pattern_type === 'suffix' && normId.endsWith(normPat)) hit = true;
        else if (rule.pattern_type === 'length' && normId.length === parseInt(normPat)) hit = true;
        else if (rule.pattern_type === 'regex') {
          try { if (new RegExp(rule.pattern_value, 'i').test(id)) hit = true; } catch (_e) {}
        }

        if (hit) { matched.push(rule); break; }
      }
    }

    if (matched.length === 0) {
      return { supplierId: null, supplierName: null, category: null, series: null, ruleIds: [], explanation: null };
    }

    // Pick highest-confidence rule
    matched.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    const top = matched[0];
    const ruleIds = matched.map(r => r.id);

    const idSample = identifiers.find(i => {
      const norm = normalizeBatchNumber(i);
      const pat = normalizeBatchNumber(top.pattern_value || '');
      if (top.pattern_type === 'prefix') return norm.startsWith(pat);
      if (top.pattern_type === 'suffix') return norm.endsWith(pat);
      return false;
    }) || identifiers[0];

    const explanation = `Vi tror leverantör = ${top.preferred_supplier_name || 'okänd'} baserat på ${top.pattern_type} '${top.pattern_value}' (matchar ${top.sample_count || '?'} andra batcher)`;

    return {
      supplierId: top.preferred_supplier_id || null,
      supplierName: top.preferred_supplier_name || null,
      category: top.preferred_category || null,
      series: top.preferred_series || null,
      ruleIds,
      explanation
    };
  } catch (e) {
    console.log('applyPatternRules failed:', e.message);
    return { supplierId: null, supplierName: null, category: null, series: null, ruleIds: [], explanation: null };
  }
}

async function doContextLinking(base44, { context, context_reference_id, batchId, labelScanId }) {
  if (!context_reference_id || !batchId) return;

  if (context === 'purchase_receiving') {
    const poItem = await base44.asServiceRole.entities.PurchaseOrderItem.get(context_reference_id).catch(() => null);
    if (poItem) {
      const existing = poItem.supplier_batch_numbers || [];
      if (!existing.some(b => b.batch_id === batchId)) {
        existing.push({ batch_id: batchId, label_scan_id: labelScanId, quantity: poItem.quantity_ordered });
        await base44.asServiceRole.entities.PurchaseOrderItem.update(context_reference_id, { supplier_batch_numbers: existing });
      }
      const recs = await base44.asServiceRole.entities.ReceivingRecord.filter({ purchase_order_item_id: context_reference_id }, '-updated_date', 1);
      if (recs.length > 0) {
        const bids = recs[0].batch_ids || [];
        const sids = recs[0].ai_scan_ids || [];
        if (!bids.includes(batchId)) bids.push(batchId);
        if (!sids.includes(labelScanId)) sids.push(labelScanId);
        await base44.asServiceRole.entities.ReceivingRecord.update(recs[0].id, { batch_ids: bids, ai_scan_ids: sids });
      }
    }
  } else if (context === 'repair_return') {
    await base44.asServiceRole.entities.RepairLog.update(context_reference_id, { batch_id: batchId, label_scan_id: labelScanId }).catch(() => null);
  } else if (context === 'site_report') {
    const sr = await base44.asServiceRole.entities.SiteReport.get(context_reference_id).catch(() => null);
    if (sr) {
      const bids = sr.batch_ids || [];
      if (!bids.includes(batchId)) bids.push(batchId);
      await base44.asServiceRole.entities.SiteReport.update(context_reference_id, { batch_ids: bids });
    }
  } else if (context === 'production') {
    const pr = await base44.asServiceRole.entities.ProductionRecord.get(context_reference_id).catch(() => null);
    if (pr) {
      const sids = pr.label_scan_ids || [];
      if (!sids.includes(labelScanId)) sids.push(labelScanId);
      await base44.asServiceRole.entities.ProductionRecord.update(context_reference_id, { batch_id: batchId, label_scan_ids: sids });
    }
  } else if (context === 'pick') {
    // Link label scan to OrderPickList item
    if (context_reference_id) {
      const pickList = await base44.asServiceRole.entities.OrderPickList.get(context_reference_id).catch(() => null);
      if (pickList) {
        const items = pickList.pick_items || [];
        // Find matching item by batch_id and attach scan
        let updated = false;
        const updatedItems = items.map(item => {
          if (item.batch_id === batchId && !updated) {
            updated = true;
            const scanIds = item.label_scan_ids || [];
            if (!scanIds.includes(labelScanId)) scanIds.push(labelScanId);
            return { ...item, label_scan_ids: scanIds };
          }
          return item;
        });
        await base44.asServiceRole.entities.OrderPickList.update(context_reference_id, { pick_items: updatedItems });
      }
    }
  } else if (context === 'ship_out') {
    // Link label scan to DeliveryRecord item
    if (context_reference_id) {
      const delivery = await base44.asServiceRole.entities.DeliveryRecord.get(context_reference_id).catch(() => null);
      if (delivery) {
        const items = delivery.items || [];
        let updated = false;
        const updatedItems = items.map(item => {
          if (item.batch_id === batchId && !updated) {
            updated = true;
            const scanIds = item.label_scan_ids || [];
            if (!scanIds.includes(labelScanId)) scanIds.push(labelScanId);
            return { ...item, label_scan_ids: scanIds };
          }
          return item;
        });
        await base44.asServiceRole.entities.DeliveryRecord.update(context_reference_id, { items: updatedItems });
      }
    }
  } else if (context === 'stock_adjustment') {
    // Update StockAdjustment to link scan
    if (context_reference_id) {
      await base44.asServiceRole.entities.StockAdjustment.update(context_reference_id, { label_scan_id: labelScanId }).catch(() => null);
    }
  } else if (context === 'inventory_count') {
    // Add to active InventoryCount session
    if (context_reference_id) {
      const countSession = await base44.asServiceRole.entities.InventoryCount.get(context_reference_id).catch(() => null);
      if (countSession && countSession.status === 'in_progress') {
        const items = countSession.count_items || [];
        const existingIdx = items.findIndex(i => i.batch_id === batchId);
        if (existingIdx >= 0) {
          // Update existing, append scan id
          const scanIds = items[existingIdx].label_scan_ids || [];
          if (!scanIds.includes(labelScanId)) scanIds.push(labelScanId);
          items[existingIdx] = { ...items[existingIdx], label_scan_ids: scanIds };
        } else {
          items.push({ batch_id: batchId, label_scan_ids: [labelScanId], counted_qty: 0 });
        }
        await base44.asServiceRole.entities.InventoryCount.update(context_reference_id, {
          count_items: items,
          total_items: items.length
        });
      }
    }
  } else if (context === 'service') {
    // Link to ServiceLog
    if (context_reference_id) {
      await base44.asServiceRole.entities.ServiceLog.update(context_reference_id, { batch_id: batchId, label_scan_id: labelScanId }).catch(() => null);
    }
  } else if (context === 'move_location') {
    // move_location: just log — actual shelf update is done by UI with new location
    // No automatic DB write needed here beyond the LabelScan linkage
  }
}