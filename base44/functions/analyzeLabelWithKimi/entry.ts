import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MOONSHOT_API_KEY = Deno.env.get("KIMI_API_KEY");

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

// Rate limiting: simple in-memory store per isolate
const rateLimitStore = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 60/min per user
    const now = Date.now();
    const userKey = user.email;
    const windowStart = now - 60000;
    const calls = (rateLimitStore.get(userKey) || []).filter(t => t > windowStart);
    if (calls.length >= 60) {
      return Response.json({ error: 'Rate limit exceeded: max 60 calls/min' }, { status: 429 });
    }
    calls.push(now);
    rateLimitStore.set(userKey, calls);

    const body = await req.json();
    const { image_url, context, context_reference_id } = body;

    if (!image_url) return Response.json({ error: 'image_url required' }, { status: 400 });
    if (!MOONSHOT_API_KEY) return Response.json({ error: 'MOONSHOT_API_KEY not configured' }, { status: 500 });

    // Get KimiConfig
    let config = {
      model_name: 'kimi-k2.5',
      api_base_url: 'https://api.moonshot.ai/v1',
      thinking_mode: false,
      prompt_version: 'v1',
      timeout_ms: 30000,
      confidence_threshold_auto_approve: 0.85,
      confidence_threshold_manual_review: 0.60
    };
    let configId = null;
    try {
      const configs = await base44.asServiceRole.entities.KimiConfig.filter({ is_active: true }, '-created_date', 1);
      if (configs.length > 0) {
        config = { ...config, ...configs[0] };
        configId = configs[0].id;
      }
    } catch (e) { /* use defaults */ }

    const apiUrl = `${config.api_base_url}/chat/completions`;
    const startTime = Date.now();

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

    const promptVersion = config.prompt_version || 'v1';
    const activePrompt = promptVersion === 'v2' ? PROMPT_V2 : PROMPT_V1;
    const userText = promptVersion === 'v2'
      ? "Analysera denna etikett noggrant. Prioritera barkod/Data Matrix-värden framför OCR för batch_number och article_sku. Skilj tydligt på batch_number, article_sku och serienummer. Returnera JSON enligt angiven struktur."
      : "Extrahera batch-info från denna etikett som JSON med fälten: batch_number, article_sku, article_name, supplier_name, manufacturing_date, expiry_date, production_date, quantity, series, pixel_pitch, other_text[]. För varje fält även confidence 0-1. Lägg även overall_confidence 0-1.";

    const kimiPayload = {
      model: config.model_name,
      temperature: 0.0,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      chat_template_kwargs: { thinking: config.thinking_mode || false },
      messages: [
        { role: "system", content: activePrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: image_url } }
          ]
        }
      ]
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout_ms || 30000);

    let kimiData;
    try {
      const kimiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOONSHOT_API_KEY}`
        },
        body: JSON.stringify(kimiPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!kimiResponse.ok) {
        const errText = await kimiResponse.text();
        await base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
          status: 'failed',
          error_message: `Kimi API error ${kimiResponse.status}: ${errText}`
        });
        return Response.json({ error: `Kimi API error: ${kimiResponse.status}`, detail: errText }, { status: 500 });
      }
      kimiData = await kimiResponse.json();
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      await base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
        status: 'failed',
        error_message: fetchErr.message
      });
      return Response.json({ error: fetchErr.message }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    const rawContent = kimiData.choices?.[0]?.message?.content;
    const tokensUsed = kimiData.usage?.total_tokens || 0;
    // Kimi K2.5 pricing placeholder: $0.0000012 per token
    const costUsd = tokensUsed * 0.0000012;

    let parsed;
    try {
      parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
    } catch (e) {
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

    // ── Barcode authority: if barcode_values present, override OCR fields ──
    let extractedFields = { ...(parsed.fields || {}) };
    const barcodeValues = parsed.barcode_values || extractedFields.barcode_values || [];
    const fieldConfidence = { ...(parsed.confidence || {}) };

    if (barcodeValues.length > 0) {
      const topBarcode = barcodeValues[0];
      // Override batch_number from barcode canonical_core if available
      if (topBarcode.canonical_core && !extractedFields._barcode_batch_set) {
        extractedFields.batch_number = topBarcode.canonical_core;
        fieldConfidence.batch_number = 0.98;
      }
      // If segments contain a SKU-like value (short alphanumeric), use as article_sku
      for (const seg of (topBarcode.parsed_segments || [])) {
        if (seg && /^[A-Z0-9\-\.]{3,20}$/.test(seg) && !extractedFields.article_sku) {
          extractedFields.article_sku = seg;
          fieldConfidence.article_sku = 0.98;
          break;
        }
      }
      // Include barcode_values in extracted_fields for downstream use
      extractedFields.barcode_values = barcodeValues;
    }

    // ── v2 date normalization: map single date object back to legacy fields ──
    if (promptVersion === 'v2' && extractedFields.date?.value) {
      const { value, type } = extractedFields.date;
      if (type === 'manufacturing') extractedFields.manufacturing_date = value;
      else if (type === 'production') extractedFields.production_date = value;
      else if (type === 'expiry') extractedFields.expiry_date = value;
      else extractedFields.manufacturing_date = value; // fallback
      fieldConfidence.manufacturing_date = fieldConfidence.date || 0;
    }

    // Update LabelScan
    await base44.asServiceRole.entities.LabelScan.update(labelScan.id, {
      ai_raw_response: kimiData,
      ai_processing_duration_ms: duration,
      ai_tokens_used: tokensUsed,
      ai_cost_usd: costUsd,
      extracted_fields: extractedFields,
      field_confidence: fieldConfidence,
      status: scanStatus
    });

    // Update monthly spend on KimiConfig
    if (configId && costUsd > 0) {
      const newSpend = (config.current_month_spend || 0) + costUsd;
      await base44.asServiceRole.entities.KimiConfig.update(configId, {
        current_month_spend: newSpend
      });
    }

    return Response.json({
      success: true,
      label_scan_id: labelScan.id,
      extracted_fields: extractedFields,
      confidence: fieldConfidence,
      label_layout_description: parsed.label_layout_description || '',
      warnings: parsed.warnings || [],
      processing_duration_ms: duration,
      tokens_used: tokensUsed,
      cost_usd: costUsd,
      status: scanStatus,
      model_used: config.model_name,
      prompt_version: promptVersion
    });

  } catch (error) {
    console.error('analyzeLabelWithKimi error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});