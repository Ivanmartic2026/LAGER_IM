import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MOONSHOT_API_KEY = Deno.env.get("KIMI_API_KEY");

// ── Image fetch limits ──────────────────────────────────────────────────────
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB hard limit (Moonshot)
const IMAGE_FETCH_TIMEOUT_MS = 10_000;   // 10s for image download
const KIMI_TIMEOUT_MS = 90_000;          // 90s for Kimi API call

// ── Safe base64 encoding (no stack overflow) ────────────────────────────────
// btoa(String.fromCharCode.apply(null, bigArray)) overflows the stack for
// large images. Use small fixed chunks instead.
function uint8ToBase64(bytes) {
  const CHUNK = 32768; // 0x8000 — safe chunk size for apply()
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// ── MIME detection from magic bytes ─────────────────────────────────────────
function detectMime(bytes, headerContentType) {
  if (bytes.length >= 4) {
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png';
    if (bytes.length >= 12 &&
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  }
  if (headerContentType) {
    const ct = headerContentType.split(';')[0].trim().toLowerCase();
    if (ct.startsWith('image/')) return ct;
  }
  return 'image/jpeg';
}

// ── Fetch image → base64 data URI ───────────────────────────────────────────
// Works for Base44 private storage URLs and any public URL.
// Enforces size limit and timeout.
async function fetchImageDataUri(imageUrl) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), IMAGE_FETCH_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(imageUrl, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`Image fetch HTTP ${resp.status} for URL: ${imageUrl}`);

  const ctHeader = resp.headers.get('content-type') || '';
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);

  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image too large: ${(bytes.length / 1024 / 1024).toFixed(1)} MB (max 5 MB). Please use a smaller image.`);
  }

  const mime = detectMime(bytes, ctHeader);
  const b64 = uint8ToBase64(bytes);
  return { dataUri: `data:${mime};base64,${b64}`, sizeBytes: bytes.length, mime };
}

// ── Prompts ──────────────────────────────────────────────────────────────────
const PROMPT_V1 = `You are a specialized OCR and label analysis system for warehouse management.
Analyze the provided label/product image and extract all information.
Return ONLY valid JSON (no markdown, no prose explanations) with this exact structure:
{
  "fields": {
    "batch_number": "string or null",
    "article_sku": "string or null",
    "article_name": "string or null",
    "supplier_name": "string or null",
    "manufacturing_date": "YYYY-MM-DD or null",
    "production_date": "YYYY-MM-DD or null",
    "expiry_date": "YYYY-MM-DD or null",
    "quantity": "number or null",
    "series": "string or null",
    "pixel_pitch": "string or null",
    "other_text": ["array of other visible text strings"]
  },
  "confidence": {
    "batch_number": 0.0,
    "article_sku": 0.0,
    "article_name": 0.0,
    "supplier_name": 0.0,
    "manufacturing_date": 0.0,
    "production_date": 0.0,
    "expiry_date": 0.0,
    "quantity": 0.0,
    "series": 0.0,
    "pixel_pitch": 0.0,
    "overall": 0.0
  },
  "label_layout_description": "brief description of label layout and format",
  "warnings": ["array of observations about illegibility, damage, or unusual format"]
}`;

const PROMPT_V2 = `You are a specialized OCR and barcode analysis system for warehouse management of LED display products.
Analyze the provided label/product image and extract all information with high precision.

CRITICAL FIELD RULES:
1. batch_number: A production/manufacturing batch identifier. Format examples: "P2.5250721228", "APP20240115", "2024-07-21-001". Usually found on stickers or printed directly on the product. NOT the same as serial number or article SKU.
2. article_sku: The product article number or model code. Examples: "P2.5-GOB", "S-P1.95-GOB", "QP4-P2.6". Usually shorter and more structured than batch_number. May appear as "Art.nr", "Model", "Item No", "Artikelnummer".
3. serial_number: Individual unit identifier (if present). Usually starts with "SN:", "S/N:", or "Serial:". Do NOT confuse with batch_number.
4. DO NOT confuse batch_number, article_sku, and serial_number — they are separate fields.

BARCODE/DATA MATRIX PRIORITY RULE:
- If a barcode or Data Matrix code is present and readable, its decoded value is the AUTHORITATIVE source.
- Barcode values override OCR text for batch_number and article_sku.
- Report all decoded barcodes in barcode_values[].

DATE HANDLING:
- Only ONE date field will be populated. Determine the type from context clues (label text, field name in Swedish/English).
- Swedish labels: "Tillverkningsdatum"/"Tillv.datum" = manufacturing_date, "Produktionsdatum"/"Prod.datum" = production_date, "Utgångsdatum"/"Bäst före" = expiry_date.
- English labels: "Mfg Date"/"Manufacturing Date" = manufacturing_date, "Production Date" = production_date, "Expiry"/"Best Before" = expiry_date.
- Format all dates as YYYY-MM-DD.

LANGUAGE: Labels may be in Swedish or English. Handle both.

Return ONLY valid JSON (no markdown, no prose) with this exact structure:
{
  "fields": {
    "batch_number": "string or null",
    "article_sku": "string or null",
    "article_name": "string or null",
    "supplier_name": "string or null",
    "date": { "value": "YYYY-MM-DD or null", "type": "manufacturing|production|expiry|null" },
    "quantity": "number or null",
    "series": "string or null",
    "pixel_pitch": "string or null",
    "other_text": ["array of other visible text strings"]
  },
  "barcode_values": [
    { "type": "data_matrix|qr|code128|code39|ean13|other", "raw_value": "string", "parsed_segments": ["array"], "canonical_core": "string" }
  ],
  "confidence": {
    "batch_number": 0.0,
    "article_sku": 0.0,
    "article_name": 0.0,
    "supplier_name": 0.0,
    "date": 0.0,
    "quantity": 0.0,
    "series": 0.0,
    "pixel_pitch": 0.0,
    "overall": 0.0
  },
  "label_layout_description": "brief description",
  "warnings": ["array of observations about illegibility, damage, or unusual format"]
}`;

// ── Rate limit store ─────────────────────────────────────────────────────────
const rateLimitStore = new Map();

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const overallStart = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 60/min per user
    const now = Date.now();
    const windowStart = now - 60000;
    const calls = (rateLimitStore.get(user.email) || []).filter(t => t > windowStart);
    if (calls.length >= 60) {
      return Response.json({ error: 'Rate limit exceeded: max 60 calls/min' }, { status: 429 });
    }
    calls.push(now);
    rateLimitStore.set(user.email, calls);

    const body = await req.json();
    const { image_url, context, context_reference_id } = body;

    if (!image_url) return Response.json({ error: 'image_url required' }, { status: 400 });
    if (!MOONSHOT_API_KEY) return Response.json({ error: 'KIMI_API_KEY not configured' }, { status: 500 });

    // Load KimiConfig
    let config = {
      model_name: 'moonshot-v1-8k',
      api_base_url: 'https://api.moonshot.ai/v1',
      prompt_version: 'v1',
      confidence_threshold_auto_approve: 0.85,
      confidence_threshold_manual_review: 0.60
    };
    let configId = null;
    try {
      const configs = await base44.asServiceRole.entities.KimiConfig.list('-created_date', 1);
      if (configs.length > 0) {
        config = { ...config, ...configs[0] };
        configId = configs[0].id;
      }
    } catch (_e) { /* use defaults */ }

    // Create LabelScan record
    const labelScan = await base44.asServiceRole.entities.LabelScan.create({
      image_url,
      image_uploaded_by: user.email,
      image_uploaded_at: new Date().toISOString(),
      ai_provider: 'moonshot',
      ai_model_used: config.model_name,
      ai_prompt_version: config.prompt_version || 'v1',
      status: 'processing',
      context: context || 'manual_scan',
      context_reference_id: context_reference_id || null
    });

    // ── Step 1: Fetch + encode image (10s timeout) ───────────────────────────
    let imageContent;
    let imageSizeBytes = 0;
    try {
      const { dataUri, sizeBytes } = await fetchImageDataUri(image_url);
      imageSizeBytes = sizeBytes;
      imageContent = { type: "image_url", image_url: { url: dataUri } };
    } catch (imgErr) {
      // Fallback: barcode-only mode — image could not be fetched/encoded
      const errMsg = imgErr.name === 'AbortError'
        ? 'Image fetch timeout (>10s)'
        : `Image fetch error: ${imgErr.message}`;

      await base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
        status: 'failed',
        error_message: errMsg
      });

      // Log to SyncLog
      await base44.asServiceRole.entities.SyncLog.create({
        sync_type: 'kimi_label_scan',
        status: 'error',
        entity_type: 'LabelScan',
        entity_id: labelScan.id,
        direction: 'internal',
        error_message: 'Image fetch failed — AI-läsning misslyckades, använder streckkod',
        error_detail: errMsg,
        triggered_by: user.email,
        duration_ms: Date.now() - overallStart
      }).catch(() => {});

      return Response.json({
        success: false,
        label_scan_id: labelScan.id,
        error: 'AI-läsning misslyckades, använder streckkod',
        error_detail: errMsg,
        barcode_only: true
      }, { status: 200 }); // 200 so the frontend can handle gracefully
    }

    // ── Step 2: Call Kimi API (30s timeout) ──────────────────────────────────
    const promptVersion = config.prompt_version || 'v1';
    const activePrompt = promptVersion === 'v2' ? PROMPT_V2 : PROMPT_V1;
    const userText = promptVersion === 'v2'
      ? "Analysera denna etikett noggrant. Prioritera barkod/Data Matrix-värden framför OCR för batch_number och article_sku. Skilj tydligt på batch_number, article_sku och serienummer. Returnera JSON enligt angiven struktur."
      : "Extrahera batch-info från denna etikett som JSON med fälten: batch_number, article_sku, article_name, supplier_name, manufacturing_date, expiry_date, production_date, quantity, series, pixel_pitch, other_text[]. För varje fält även confidence 0-1. Lägg även overall_confidence 0-1.";

    // Use Kimi vision-preview model for image understanding
    const modelName = 'moonshot-v1-8k-vision-preview';

    // Bugg 3: Minimum 60s timeout regardless of config
    const effectiveTimeout = Math.max(KIMI_TIMEOUT_MS, config.timeout_ms || 0);

    const apiUrl = `${config.api_base_url}/chat/completions`;
    // Bugg 2: Never send thinking params for vision calls
    const kimiPayload = {
      model: modelName,
      temperature: 1,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: activePrompt },
        { role: "user", content: [{ type: "text", text: userText }, imageContent] }
      ]
      // NOTE: thinking/reasoning params intentionally omitted — not supported for vision
    };

    const kimiCtrl = new AbortController();
    const kimiTimer = setTimeout(() => kimiCtrl.abort(), effectiveTimeout);

    let kimiData;
    const kimiStart = Date.now();
    try {
      const kimiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOONSHOT_API_KEY}`
        },
        body: JSON.stringify(kimiPayload),
        signal: kimiCtrl.signal
      });
      clearTimeout(kimiTimer);

      if (!kimiResponse.ok) {
        const errText = await kimiResponse.text();
        const errMsg = `Kimi API error ${kimiResponse.status}: ${errText}`;
        await base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
          status: 'failed',
          error_message: errMsg
        });
        await base44.asServiceRole.entities.SyncLog.create({
          sync_type: 'kimi_label_scan', status: 'error',
          entity_type: 'LabelScan', entity_id: labelScan.id,
          direction: 'internal',
          error_message: 'Kimi API returned error',
          error_detail: errMsg,
          triggered_by: user.email,
          duration_ms: Date.now() - overallStart
        }).catch(() => {});
        return Response.json({ error: `Kimi API error: ${kimiResponse.status}`, detail: errText }, { status: 500 });
      }
      kimiData = await kimiResponse.json();
    } catch (kimiErr) {
      clearTimeout(kimiTimer);
      const errMsg = kimiErr.name === 'AbortError'
        ? `Kimi API timeout (>${KIMI_TIMEOUT_MS / 1000}s) med modell '${config.model_name}' — AI-läsning misslyckades, använder streckkod`
        : `Kimi API fel (modell: ${config.model_name}): ${kimiErr.message}`;

      await base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
        status: 'failed',
        error_message: errMsg
      });
      await base44.asServiceRole.entities.SyncLog.create({
        sync_type: 'kimi_label_scan', status: 'error',
        entity_type: 'LabelScan', entity_id: labelScan.id,
        direction: 'internal',
        error_message: 'Kimi API call failed',
        error_detail: errMsg,
        triggered_by: user.email,
        duration_ms: Date.now() - overallStart
      }).catch(() => {});

      return Response.json({
        success: false,
        label_scan_id: labelScan.id,
        error: 'AI-läsning misslyckades, använder streckkod',
        error_detail: errMsg,
        barcode_only: true
      }, { status: 200 });
    }

    const duration = Date.now() - kimiStart;
    const rawContent = kimiData.choices?.[0]?.message?.content;
    const tokensUsed = kimiData.usage?.total_tokens || 0;
    const costUsd = tokensUsed * 0.0000012;

    let parsed;
    try {
      parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
    } catch (_e) {
      await base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
        status: 'failed',
        error_message: 'Failed to parse Kimi JSON response',
        ai_raw_response: { raw: rawContent }
      });
      return Response.json({ error: 'Failed to parse response' }, { status: 500 });
    }

    const overallConfidence = parsed.confidence?.overall || 0;
    const scanStatus = overallConfidence >= (config.confidence_threshold_manual_review || 0.60)
      ? 'completed'
      : 'manual_review';

    // Barcode authority
    let extractedFields = { ...(parsed.fields || {}) };
    const barcodeValues = parsed.barcode_values || extractedFields.barcode_values || [];
    const fieldConfidence = { ...(parsed.confidence || {}) };

    if (barcodeValues.length > 0) {
      const topBarcode = barcodeValues[0];
      if (topBarcode.canonical_core && !extractedFields._barcode_batch_set) {
        extractedFields.batch_number = topBarcode.canonical_core;
        fieldConfidence.batch_number = 0.98;
      }
      for (const seg of (topBarcode.parsed_segments || [])) {
        if (seg && /^[A-Z0-9\-\.]{3,20}$/.test(seg) && !extractedFields.article_sku) {
          extractedFields.article_sku = seg;
          fieldConfidence.article_sku = 0.98;
          break;
        }
      }
      extractedFields.barcode_values = barcodeValues;
    }

    // v2 date normalization
    if (promptVersion === 'v2' && extractedFields.date?.value) {
      const { value, type } = extractedFields.date;
      if (type === 'manufacturing') extractedFields.manufacturing_date = value;
      else if (type === 'production') extractedFields.production_date = value;
      else if (type === 'expiry') extractedFields.expiry_date = value;
      else extractedFields.manufacturing_date = value;
      fieldConfidence.manufacturing_date = fieldConfidence.date || 0;
    }

    const totalDuration = Date.now() - overallStart;

    // ── Match against existing Batch / Article records ───────────────────────
    const matchResults = {};

    // Normalize: uppercase, O→0, strip spaces/hyphens/underscores
    const normalize = (s) => (s || '').toUpperCase().replace(/O/g, '0').replace(/[\s\-_]/g, '').trim();

    // Simple fuzzy similarity (0–1) using longest common substring ratio
    function similarity(a, b) {
      if (!a || !b) return 0;
      const na = normalize(a);
      const nb = normalize(b);
      if (na === nb) return 1.0;
      if (na.includes(nb) || nb.includes(na)) return 0.85;
      // Count matching chars in order
      let matches = 0, j = 0;
      for (let i = 0; i < na.length && j < nb.length; i++) {
        if (na[i] === nb[j]) { matches++; j++; }
      }
      return (2 * matches) / (na.length + nb.length);
    }

    const rawBatch = extractedFields.batch_number || null;
    const articleSku = extractedFields.article_sku ? extractedFields.article_sku.trim().toLowerCase() : null;

    // Fetch all articles and batches in parallel
    const [allArticles, allBatches] = await Promise.all([
      base44.asServiceRole.entities.Article.list('-updated_date', 2000).catch(() => []),
      base44.asServiceRole.entities.Batch.list('-updated_date', 2000).catch(() => [])
    ]);

    if (rawBatch) {
      // Step A — Exact match on Article.batch_number (case-insensitive, before normalize)
      const exactArticle = allArticles.find(a =>
        a.batch_number && a.batch_number.trim().toLowerCase() === rawBatch.trim().toLowerCase()
      );
      if (exactArticle) {
        matchResults.article_match_id = exactArticle.id;
        matchResults.article_match_confidence = 0.98;
        matchResults.article_match_method = 'exact';
        matchResults.article_match_name = exactArticle.name;
      }

      // Step B — Fuzzy match on Article.batch_number (O→0, > 80%)
      if (!matchResults.article_match_id) {
        let bestScore = 0, bestArticle = null;
        for (const a of allArticles) {
          if (!a.batch_number) continue;
          const score = similarity(a.batch_number, rawBatch);
          if (score > bestScore) { bestScore = score; bestArticle = a; }
        }
        if (bestScore >= 0.80 && bestArticle) {
          matchResults.article_match_id = bestArticle.id;
          matchResults.article_match_confidence = Math.round(bestScore * 100) / 100;
          matchResults.article_match_method = bestScore === 1.0 ? 'exact' : 'fuzzy';
          matchResults.article_match_name = bestArticle.name;
        }
      }

      // Step C — Batch entity: exact match or alias match
      const batchExact = allBatches.find(b => {
        if (normalize(b.batch_number) === normalize(rawBatch)) return true;
        if (Array.isArray(b.aliases) && b.aliases.some(a => normalize(a) === normalize(rawBatch))) return true;
        return false;
      });
      if (batchExact) {
        matchResults.batch_match_id = batchExact.id;
        matchResults.batch_match_confidence = 0.98;
        matchResults.batch_match_method = 'exact';
        matchResults.batch_match_name = batchExact.batch_number;
        // If batch links to article and we haven't matched yet
        if (!matchResults.article_match_id && batchExact.article_id) {
          matchResults.article_match_id = batchExact.article_id;
          matchResults.article_match_confidence = 0.90;
          matchResults.article_match_method = 'via_batch';
          matchResults.article_match_name = batchExact.article_name || null;
        }
      }

      // Step D — Fuzzy match on Batch.batch_number
      if (!matchResults.batch_match_id) {
        let bestBatchScore = 0, bestBatch = null;
        for (const b of allBatches) {
          const score = similarity(b.batch_number, rawBatch);
          if (score > bestBatchScore) { bestBatchScore = score; bestBatch = b; }
        }
        if (bestBatchScore >= 0.80 && bestBatch) {
          matchResults.batch_match_id = bestBatch.id;
          matchResults.batch_match_confidence = Math.round(bestBatchScore * 100) / 100;
          matchResults.batch_match_method = bestBatchScore === 1.0 ? 'exact' : 'fuzzy';
          matchResults.batch_match_name = bestBatch.batch_number;
        }
      }
    }

    // Step E — SKU exact match (if no article matched yet)
    if (articleSku && !matchResults.article_match_id) {
      const artBySku = allArticles.find(a => a.sku && a.sku.trim().toLowerCase() === articleSku);
      if (artBySku) {
        matchResults.article_match_id = artBySku.id;
        matchResults.article_match_confidence = 0.95;
        matchResults.article_match_method = 'sku_exact';
        matchResults.article_match_name = artBySku.name;
      }
    }

    // Update LabelScan
    await base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
      ai_raw_response: kimiData,
      ai_processing_duration_ms: duration,
      ai_tokens_used: tokensUsed,
      ai_cost_usd: costUsd,
      extracted_fields: extractedFields,
      field_confidence: fieldConfidence,
      match_results: Object.keys(matchResults).length > 0 ? matchResults : undefined,
      status: scanStatus
    });

    // Update monthly spend
    if (configId && costUsd > 0) {
      await base44.asServiceRole.entities.KimiConfig.update(configId, {
        current_month_spend: (config.current_month_spend || 0) + costUsd
      }).catch(() => {});
    }

    // Log success to SyncLog
    await base44.asServiceRole.entities.SyncLog.create({
      sync_type: 'kimi_label_scan',
      status: 'success',
      entity_type: 'LabelScan',
      entity_id: labelScan.id,
      direction: 'internal',
      records_processed: 1,
      duration_ms: totalDuration,
      details: {
        image_size_bytes: imageSizeBytes,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
        overall_confidence: overallConfidence,
        scan_status: scanStatus,
        prompt_version: promptVersion,
        model: config.model_name
      },
      triggered_by: user.email
    }).catch(() => {});

    return Response.json({
      success: true,
      label_scan_id: labelScan.id,
      extracted_fields: extractedFields,
      confidence: fieldConfidence,
      label_layout_description: parsed.label_layout_description || '',
      warnings: parsed.warnings || [],
      processing_duration_ms: duration,
      total_duration_ms: totalDuration,
      tokens_used: tokensUsed,
      cost_usd: costUsd,
      status: scanStatus,
      model_used: modelName,
      prompt_version: promptVersion,
      match_results: matchResults
    });

  } catch (error) {
    console.error('analyzeLabelWithKimi error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});