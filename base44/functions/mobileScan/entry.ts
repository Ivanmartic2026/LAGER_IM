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

    const firstUrl = fileUrls[0];

    // ── 1. Hash + dedup (return cached if <7 days) ──
    const imgResp = await fetch(firstUrl);
    const imgBuffer = await imgResp.arrayBuffer();
    const imgHash = createHash('sha256').update(new Uint8Array(imgBuffer)).digest('hex');

    const existingScans = await base44.asServiceRole.entities.LabelScan.filter({ image_hash: imgHash }, '-created_date', 1);
    if (existingScans.length > 0) {
      const s = existingScans[0];
      const ageDays = (Date.now() - new Date(s.created_date).getTime()) / 86400000;
      if (ageDays < 7 && s.status === 'completed' && s.match_results?.all_matches) {
        return Response.json({
          label_scan_id: s.id,
          all_numbers: s.match_results.all_identifiers_searched || [],
          all_matches: s.match_results.all_matches || [],
          image_url: firstUrl,
          cached: true
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

    // ── 3. Create LabelScan stub ──
    const labelScan = await base44.asServiceRole.entities.LabelScan.create({
      image_url: firstUrl,
      image_hash: imgHash,
      image_uploaded_by: user.email,
      image_uploaded_at: new Date().toISOString(),
      ai_provider: 'moonshot',
      ai_model_used: analysis?.model_used || 'kimi-k2.5',
      ai_prompt_version: analysis?.prompt_version || 'v2',
      extracted_fields: extracted,
      field_confidence: analysis?.confidence || {},
      status: 'processing',
      context: context || 'manual_scan',
      context_reference_id
    });

    // ── 4. Collect ALL numbers/codes — flat, no categorization ──
    const allNumbers = collectAllNumbers(extracted);

    // ── 5. Search across all entities ──
    const t0 = Date.now();
    const allMatches = await searchAllEntities(base44, allNumbers);
    const duration = Date.now() - t0;

    // ── 6. Log audit in background ──
    const decision = allMatches.length > 0 ? 'review_queue' : 'no_match_prompt_create';
    base44.asServiceRole.entities.ScanMatchAudit.create({
      label_scan_id: labelScan.id,
      identifiers_searched: allNumbers,
      matches_found: allMatches.map(m => ({ entity: m.entity_type, id: m.entity_id, matched_on: m.matched_field, confidence: 1.0 })),
      decision,
      confidence: allMatches.length > 0 ? 0.7 : 0.0,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      actor: user.email
    }).catch(() => {});

    // ── 7. Apply pattern rules (background, for admin use) ──
    applyPatternRulesBackground(base44, allNumbers).catch(() => {});

    // ── 8. Update LabelScan with results ──
    await base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
      status: allMatches.length > 0 ? 'manual_review' : 'manual_review',
      match_results: {
        review_queued: true,
        review_reason: allMatches.length > 0 ? 'ambiguous_match' : 'no_match',
        all_identifiers_searched: allNumbers,
        all_matches: allMatches
      }
    });

    return Response.json({
      label_scan_id: labelScan.id,
      all_numbers: allNumbers,
      all_matches: allMatches,
      image_url: firstUrl,
      extracted_summary: extracted
    });

  } catch (error) {
    console.error('mobileScan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function norm(s) {
  return (s || '').toString().toUpperCase().replace(/\s+/g, '').trim();
}

function collectAllNumbers(extracted) {
  const seen = new Set();
  const add = (v) => { if (v && v.length > 1) seen.add(v.toString().trim()); };

  // Barcode/Data Matrix — highest priority, add raw + canonical
  for (const bc of (extracted.barcode_values || [])) {
    if (bc.raw_value) add(bc.raw_value);
    if (bc.canonical_core) add(bc.canonical_core);
    for (const seg of (bc.parsed_segments || [])) { if (seg && seg.length > 2) add(seg); }
  }

  // Named fields from AI
  add(extracted.batch_number);
  add(extracted.article_sku);
  add(extracted.series);

  // OCR regions
  for (const r of (extracted.ocr_regions || [])) {
    if (r.text && r.text.length > 2) add(r.text.trim());
  }

  // Filter: keep only things that look like codes (not sentences)
  return [...seen].filter(v => v.length <= 60 && !/\s{2,}/.test(v));
}

async function searchAllEntities(base44, numbers) {
  const results = [];
  const seenKey = new Set(); // entity_type:entity_id

  const addMatch = (entityType, entityId, entityName, matchedField, matchedValue, extraInfo = {}) => {
    const key = `${entityType}:${entityId}`;
    if (seenKey.has(key)) return;
    seenKey.add(key);
    results.push({ entity_type: entityType, entity_id: entityId, entity_name: entityName, matched_field: matchedField, matched_value: matchedValue, ...extraInfo });
  };

  // Load batches + articles once for bulk search
  const [batches, articles] = await Promise.all([
    base44.asServiceRole.entities.Batch.list('-updated_date', 1000),
    base44.asServiceRole.entities.Article.list('-updated_date', 500)
  ]);

  for (const number of numbers) {
    const n = norm(number);
    if (!n || n.length < 2) continue;

    // Batch: batch_number, raw_batch_number, aliases, canonical_core
    for (const batch of batches) {
      if (norm(batch.batch_number) === n) {
        const article = articles.find(a => a.id === batch.article_id);
        addMatch('Batch', batch.id, batch.batch_number, 'batch_number', number, {
          article_name: article?.name || batch.article_name || null,
          article_sku: article?.sku || batch.article_sku || null,
          article_id: batch.article_id || null,
          shelf_address: article?.shelf_address || null,
          stock_qty: article?.stock_qty ?? null,
          supplier_name: batch.supplier_name || null
        });
      } else if (norm(batch.raw_batch_number) === n) {
        const article = articles.find(a => a.id === batch.article_id);
        addMatch('Batch', batch.id, batch.batch_number, 'raw_batch_number', number, {
          article_name: article?.name || batch.article_name || null,
          article_sku: article?.sku || batch.article_sku || null,
          article_id: batch.article_id || null,
          shelf_address: article?.shelf_address || null,
          stock_qty: article?.stock_qty ?? null,
          supplier_name: batch.supplier_name || null
        });
      } else if ((batch.aliases || []).some(a => norm(a) === n)) {
        const article = articles.find(a => a.id === batch.article_id);
        addMatch('Batch', batch.id, batch.batch_number, 'alias', number, {
          article_name: article?.name || batch.article_name || null,
          article_id: batch.article_id || null,
          shelf_address: article?.shelf_address || null,
          stock_qty: article?.stock_qty ?? null
        });
      } else if (batch.batch_pattern?.canonical_core && norm(batch.batch_pattern.canonical_core) === n) {
        const article = articles.find(a => a.id === batch.article_id);
        addMatch('Batch', batch.id, batch.batch_number, 'canonical_core', number, {
          article_name: article?.name || batch.article_name || null,
          article_id: batch.article_id || null,
          shelf_address: article?.shelf_address || null,
          stock_qty: article?.stock_qty ?? null
        });
      }
    }

    // Article: sku, legacy batch_number
    for (const article of articles) {
      if (norm(article.sku) === n) {
        addMatch('Article', article.id, article.name, 'sku', number, {
          article_sku: article.sku,
          shelf_address: article.shelf_address,
          stock_qty: article.stock_qty ?? null,
          supplier_name: article.supplier_name || null
        });
      } else if (norm(article.batch_number) === n) {
        addMatch('Article', article.id, article.name, 'legacy_batch_number', number, {
          article_sku: article.sku,
          shelf_address: article.shelf_address,
          stock_qty: article.stock_qty ?? null
        });
      }
    }
  }

  // PurchaseOrderItem: batch_number, supplier_batch_numbers
  try {
    const poItems = await base44.asServiceRole.entities.PurchaseOrderItem.list('-updated_date', 500);
    for (const number of numbers) {
      const n = norm(number);
      for (const item of poItems) {
        if (norm(item.batch_number) === n) {
          addMatch('PurchaseOrderItem', item.id, `PO-rad: ${item.article_name || item.id}`, 'batch_number', number, {
            article_name: item.article_name || null,
            purchase_order_id: item.purchase_order_id
          });
        }
        for (const sbn of (item.supplier_batch_numbers || [])) {
          if (norm(sbn.batch_number) === n) {
            addMatch('PurchaseOrderItem', item.id, `PO-rad: ${item.article_name || item.id}`, 'supplier_batch_number', number, {
              article_name: item.article_name || null,
              purchase_order_id: item.purchase_order_id
            });
          }
        }
      }
    }
  } catch (_e) {}

  // OrderItem: batch_number
  try {
    const orderItems = await base44.asServiceRole.entities.OrderItem.list('-updated_date', 300);
    for (const number of numbers) {
      const n = norm(number);
      for (const item of orderItems) {
        if (norm(item.batch_number) === n) {
          addMatch('OrderItem', item.id, `Order-rad: ${item.article_name || item.id}`, 'batch_number', number, {
            article_name: item.article_name || null,
            order_id: item.order_id
          });
        }
      }
    }
  } catch (_e) {}

  // InternalWithdrawal: batch_number
  try {
    const withdrawals = await base44.asServiceRole.entities.InternalWithdrawal.list('-updated_date', 200);
    for (const number of numbers) {
      const n = norm(number);
      for (const w of withdrawals) {
        if (norm(w.batch_number) === n) {
          addMatch('InternalWithdrawal', w.id, `Uttag: ${w.batch_number}`, 'batch_number', number, {});
        }
      }
    }
  } catch (_e) {}

  // RepairLog: batch_number
  try {
    const repairs = await base44.asServiceRole.entities.RepairLog.list('-updated_date', 200);
    for (const number of numbers) {
      const n = norm(number);
      for (const r of repairs) {
        if (norm(r.batch_number) === n || norm(r.article_batch_number) === n) {
          addMatch('RepairLog', r.id, `Reparation: ${r.article_name || r.id}`, 'batch_number', number, {
            article_name: r.article_name || null
          });
        }
      }
    }
  } catch (_e) {}

  return results;
}

async function applyPatternRulesBackground(base44, identifiers) {
  const activeRules = await base44.asServiceRole.entities.BatchPatternRule.filter({ status: 'active' }, '-confidence', 50);
  for (const rule of activeRules) {
    for (const id of identifiers) {
      const n = norm(id);
      const p = norm(rule.pattern_value || '');
      let hit = false;
      if (rule.pattern_type === 'prefix' && n.startsWith(p)) hit = true;
      else if (rule.pattern_type === 'suffix' && n.endsWith(p)) hit = true;
      else if (rule.pattern_type === 'length' && n.length === parseInt(p)) hit = true;
      else if (rule.pattern_type === 'regex') { try { if (new RegExp(rule.pattern_value, 'i').test(id)) hit = true; } catch (_e) {} }
      if (hit) return; // found at least one match, enough for background logging
    }
  }
}