import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createHash } from 'node:crypto';

const MOONSHOT_API_KEY = Deno.env.get("KIMI_API_KEY");
const KIMI_MODEL = 'moonshot-v1-8k-vision-preview';
const KIMI_PROMPT = `You are a specialized OCR and barcode analysis system for warehouse management of LED display products.
Analyze the provided label/product image and extract ALL visible text and identifiers with high precision.
batch_number is ANY alphanumeric identifier on the label that looks like a production/batch/lot code (e.g. "JC22-2009-262", "APP20240115", "EBBC0301K-1", "1963", "EMC-123"). Extract it even if the format is unusual.
also extract ALL other alphanumeric codes, numbers, and text you see into other_text array - this is critical for matching.
Return ONLY valid JSON with this structure:
{
  "fields": { "batch_number": "string or null", "article_sku": "string or null", "article_name": "string or null", "supplier_name": "string or null", "other_text": ["all", "other", "visible", "codes", "and", "numbers"] },
  "confidence": { "batch_number": 0.0, "overall": 0.0 }
}`;

async function kimiAnalyze(imageUrl) {
  // Fetch image and encode as base64
  const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
  if (!imgResp.ok) throw new Error(`Image fetch ${imgResp.status}`);
  const buf = await imgResp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const CHUNK = 32768;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  const b64 = btoa(binary);
  // Detect MIME
  let mime = 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50) mime = 'image/png';
  else if (bytes[0] === 0xFF && bytes[1] === 0xD8) mime = 'image/jpeg';
  const dataUri = `data:${mime};base64,${b64}`;

  const resp = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MOONSHOT_API_KEY}` },
    body: JSON.stringify({
      model: KIMI_MODEL,
      temperature: 1,
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: KIMI_PROMPT },
        { role: "user", content: [
          { type: "image_url", image_url: { url: dataUri } },
          { type: "text", text: "Extract batch number and other fields from this label. Return JSON." }
        ]}
      ]
    }),
    signal: AbortSignal.timeout(45000)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Kimi ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return parsed?.fields || {};
}

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
    let imgHash = null;
    try {
      const imgResp = await fetch(firstUrl, { signal: AbortSignal.timeout(5000) });
      const imgBuffer = await imgResp.arrayBuffer();
      imgHash = createHash('sha256').update(new Uint8Array(imgBuffer)).digest('hex');

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
    } catch (_e) {
      // Hash failed — continue without dedup
    }

    // ── 2. Create LabelScan stub immediately ──
    let labelScan = null;
    try {
      labelScan = await base44.asServiceRole.entities.LabelScan.create({
        image_url: firstUrl,
        image_hash: imgHash,
        image_uploaded_by: user.email,
        image_uploaded_at: new Date().toISOString(),
        ai_provider: 'moonshot',
        status: 'processing',
        context: context || 'manual_scan',
        context_reference_id
      });
    } catch (_e) {}

    // ── 3. AI analysis — direct Kimi API call ──
    let extracted = {};
    let kimiError = null;
    if (MOONSHOT_API_KEY) {
      try {
        extracted = await kimiAnalyze(firstUrl);
      } catch (e) {
        kimiError = e.message;
        console.warn('[mobileScan] Kimi failed:', e.message, '— continuing with barcode-only fallback');
      }
    } else {
      kimiError = 'KIMI_API_KEY not configured';
    }

    // ── 4. Collect ALL numbers — barcode always first, OCR if available ──
    const allNumbers = collectAllNumbers(extracted);

    // ── 5. Search across all entities ──
    const t0 = Date.now();
    const allMatches = await searchAllEntities(base44, allNumbers);
    const duration = Date.now() - t0;

    // ── 6. Visual AI fallback — if zero text matches, try image similarity ──
    let visualSuggestions = [];
    if (allMatches.length === 0 && firstUrl) {
      try {
        visualSuggestions = await visualMatchFallback(base44, firstUrl);
      } catch (e) {
        console.warn('[mobileScan] visual fallback failed:', e.message);
      }
    }

    // ── 7. Update LabelScan with results (non-blocking, never fails user) ──
    if (labelScan) {
      base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
        ai_model_used: kimiError ? 'barcode_only' : KIMI_MODEL,
        ai_prompt_version: 'v2',
        extracted_fields: extracted,
        field_confidence: {},
        status: 'completed',
        error_message: kimiError || null,
        match_results: {
          review_queued: false,
          all_identifiers_searched: allNumbers,
          all_matches: allMatches,
          visual_suggestions: visualSuggestions
        }
      }).catch(() => {});

      // Log audit in background
      base44.asServiceRole.entities.ScanMatchAudit.create({
        label_scan_id: labelScan.id,
        identifiers_searched: allNumbers,
        matches_found: allMatches.map(m => ({ entity: m.entity_type, id: m.entity_id, matched_on: m.matched_field, confidence: 1.0 })),
        decision: allMatches.length > 0 ? 'auto_link' : visualSuggestions.length > 0 ? 'review_queue' : 'no_match_prompt_create',
        confidence: allMatches.length > 0 ? 1.0 : visualSuggestions.length > 0 ? (visualSuggestions[0]?.confidence || 0.5) : 0.0,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        actor: user.email
      }).catch(() => {});
    }

    // ── 8. Send push notification in background ──
    sendScanPush(base44, user, allMatches, labelScan?.id, kimiError).catch(() => {});

    // ── 8. Apply pattern rules in background (admin use only) ──
    applyPatternRulesBackground(base44, allNumbers).catch(() => {});

    return Response.json({
      label_scan_id: labelScan?.id || null,
      all_numbers: allNumbers,
      all_matches: allMatches,
      visual_suggestions: visualSuggestions,
      image_url: firstUrl,
      extracted_summary: extracted,
      kimi_error: kimiError || null
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
  const add = (v) => { if (v && v.toString().trim().length > 1) seen.add(v.toString().trim()); };

  for (const bc of (extracted.barcode_values || [])) {
    if (bc.raw_value) add(bc.raw_value);
    if (bc.canonical_core) add(bc.canonical_core);
    for (const seg of (bc.parsed_segments || [])) { if (seg && seg.length > 2) add(seg); }
  }

  add(extracted.batch_number);
  add(extracted.article_sku);
  add(extracted.series);

  for (const txt of (extracted.other_text || [])) {
    if (txt && txt.length > 1) add(txt.trim());
  }

  for (const r of (extracted.ocr_regions || [])) {
    if (r.text && r.text.length > 2) add(r.text.trim());
  }

  return [...seen].filter(v => v.length <= 60 && !/\s{2,}/.test(v));
}

async function searchAllEntities(base44, numbers) {
  if (numbers.length === 0) return [];
  const results = [];
  const seenKey = new Set();

  const addMatch = (entityType, entityId, entityName, matchedField, matchedValue, extraInfo = {}) => {
    const key = `${entityType}:${entityId}`;
    if (seenKey.has(key)) return;
    seenKey.add(key);
    results.push({ entity_type: entityType, entity_id: entityId, entity_name: entityName, matched_field: matchedField, matched_value: matchedValue, ...extraInfo });
  };

  const [batches, articles] = await Promise.all([
    base44.asServiceRole.entities.Batch.list('-updated_date', 2000),
    base44.asServiceRole.entities.Article.list('-updated_date', 1000)
  ]);

  const articleMap = new Map(articles.map(a => [a.id, a]));

  for (const number of numbers) {
    const n = norm(number);
    if (!n || n.length < 2) continue;

    for (const batch of batches) {
      const article = articleMap.get(batch.article_id);

      const normBatch = norm(batch.batch_number);
      const normRaw = norm(batch.raw_batch_number);

      if (normBatch && normBatch === n) {
        addMatch('Batch', batch.id, batch.batch_number, 'batch_number', number, {
          article_name: article?.name || batch.article_name || null,
          article_sku: article?.sku || batch.article_sku || null,
          article_id: batch.article_id || null,
          article_image_url: article?.image_urls?.[0] || null,
          shelf_address: article?.shelf_address || null,
          stock_qty: article?.stock_qty ?? null,
          supplier_name: batch.supplier_name || null
        });
      } else if (normRaw && normRaw === n) {
        addMatch('Batch', batch.id, batch.batch_number, 'raw_batch_number', number, {
          article_name: article?.name || batch.article_name || null,
          article_sku: article?.sku || batch.article_sku || null,
          article_id: batch.article_id || null,
          article_image_url: article?.image_urls?.[0] || null,
          shelf_address: article?.shelf_address || null,
          stock_qty: article?.stock_qty ?? null,
          supplier_name: batch.supplier_name || null
        });
      } else if ((batch.aliases || []).some(a => norm(a) === n)) {
        addMatch('Batch', batch.id, batch.batch_number, 'alias', number, {
          article_name: article?.name || batch.article_name || null,
          article_sku: article?.sku || batch.article_sku || null,
          article_id: batch.article_id || null,
          article_image_url: article?.image_urls?.[0] || null,
          shelf_address: article?.shelf_address || null,
          stock_qty: article?.stock_qty ?? null
        });
      } else if (batch.batch_pattern?.canonical_core && norm(batch.batch_pattern.canonical_core) === n) {
        addMatch('Batch', batch.id, batch.batch_number, 'canonical_core', number, {
          article_name: article?.name || batch.article_name || null,
          article_sku: article?.sku || batch.article_sku || null,
          article_id: batch.article_id || null,
          article_image_url: article?.image_urls?.[0] || null,
          shelf_address: article?.shelf_address || null,
          stock_qty: article?.stock_qty ?? null
        });
      } else if (normBatch && n.length >= 3 && normBatch.length >= 3 && (normBatch.includes(n) || n.includes(normBatch))) {
        // Partial/substring match — lower priority
        addMatch('Batch', batch.id, batch.batch_number, 'partial_match', number, {
          article_name: article?.name || batch.article_name || null,
          article_sku: article?.sku || batch.article_sku || null,
          article_id: batch.article_id || null,
          article_image_url: article?.image_urls?.[0] || null,
          shelf_address: article?.shelf_address || null,
          stock_qty: article?.stock_qty ?? null,
          supplier_name: batch.supplier_name || null,
          partial: true
        });
      }
    }

    for (const article of articles) {
      const normSku = norm(article.sku);
      const normLegacy = norm(article.batch_number);

      if (normSku && normSku === n) {
        addMatch('Article', article.id, article.name, 'sku', number, {
          article_sku: article.sku,
          article_image_url: article.image_urls?.[0] || null,
          shelf_address: article.shelf_address,
          stock_qty: article.stock_qty ?? null,
          supplier_name: article.supplier_name || null
        });
      } else if (normLegacy && normLegacy === n) {
        addMatch('Article', article.id, article.name, 'legacy_batch_number', number, {
          article_sku: article.sku,
          article_image_url: article.image_urls?.[0] || null,
          shelf_address: article.shelf_address,
          stock_qty: article.stock_qty ?? null
        });
      }
    }
  }

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

  return results;
}

async function sendScanPush(base44, user, allMatches, labelScanId, kimiError) {
  // Build notification
  let title, message, linkPage, linkTo;

  if (kimiError && allMatches.length === 0) {
    title = '⚠️ Scan-analys misslyckades';
    message = 'Kimi kunde inte analysera bilden. Inga barcodes hittades.';
    linkPage = 'Scan';
  } else if (allMatches.length > 0) {
    const topMatch = allMatches[0];
    title = '✅ Match hittad';
    message = `${allMatches.length} match${allMatches.length > 1 ? 'es' : ''}: ${topMatch.article_name || topMatch.entity_name || topMatch.entity_id}`;
    linkPage = 'BatchDetail';
    linkTo = topMatch.entity_type === 'Batch' ? topMatch.entity_id : (topMatch.article_id || null);
  } else {
    title = '🔍 Ingen match';
    message = 'Etiketten finns inte i systemet. Skapa ny artikel eller batch.';
    linkPage = 'Scan';
  }

  await base44.asServiceRole.functions.invoke('sendPushToUser', {
    user_email: user.email,
    title,
    message,
    link_page: linkPage,
    link_to: linkTo || labelScanId,
    type: 'scan_result'
  });
}

// ── Visual AI match fallback ──
// Called when text-based matching returns zero results.
// Fetches up to 20 articles with images, sends them + the scan image to Kimi vision,
// asks which label looks most similar.
async function visualMatchFallback(base44, scanImageUrl) {
  // Get articles with images, most recently updated first
  const articlesWithImages = await base44.asServiceRole.entities.Article.list('-updated_date', 200);
  const candidates = articlesWithImages
    .filter(a => a.image_urls && a.image_urls.length > 0)
    .slice(0, 20);

  if (candidates.length === 0) return [];

  // Build prompt with candidate list
  const candidateList = candidates.map((a, i) =>
    `${i + 1}. article_id="${a.id}" name="${a.name}" sku="${a.sku || ''}" image="${a.image_urls[0]}"`
  ).join('\n');

  const prompt = `Du är ett system för visuell matchning av lagretiketter.

Du fick en nyscannad etikett (bilden bifogad) och ${candidates.length} befintliga artiklar.
Vilken av de befintliga artiklarna liknar den scannrade etiketten mest, baserat på synlig text, mönster och layout?

Befintliga artiklar:
${candidateList}

Svara ENDAST med JSON. Om ingen liknar, sätt confidence till 0.
Returnera top 3 kandidater (eller färre om inga liknar).`;

  const imageUrls = [scanImageUrl];

  let result;
  try {
    result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: imageUrls,
      response_json_schema: {
        type: 'object',
        properties: {
          matches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                article_id: { type: 'string' },
                confidence: { type: 'number' },
                reason: { type: 'string' }
              }
            }
          }
        }
      }
    });
  } catch (e) {
    console.warn('[visualMatchFallback] LLM call failed:', e.message);
    return [];
  }

  const matches = result?.matches || [];
  // Enrich with article data and filter confidence >= 0.3
  return matches
    .filter(m => m.confidence >= 0.3)
    .map(m => {
      const article = candidates.find(a => a.id === m.article_id);
      if (!article) return null;
      return {
        entity_type: 'Article',
        entity_id: article.id,
        entity_name: article.name,
        matched_field: 'visual_ai',
        matched_value: 'image_similarity',
        article_name: article.name,
        article_sku: article.sku || null,
        article_image_url: article.image_urls?.[0] || null,
        shelf_address: article.shelf_address || null,
        stock_qty: article.stock_qty ?? null,
        supplier_name: article.supplier_name || null,
        confidence: m.confidence,
        visual_reason: m.reason || null,
        is_visual_suggestion: true
      };
    })
    .filter(Boolean);
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
      if (hit) return;
    }
  }
}