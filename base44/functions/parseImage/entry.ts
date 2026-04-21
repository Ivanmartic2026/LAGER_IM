import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const KIMI_API_KEY = Deno.env.get("KIMI_API_KEY");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const IMAGE_FETCH_TIMEOUT_MS = 10_000;

// Safe base64 — no stack overflow for large images
function uint8ToBase64(bytes) {
  const CHUNK = 32768;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

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

async function fetchImageDataUri(imageUrl) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), IMAGE_FETCH_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(imageUrl, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`Image fetch HTTP ${resp.status}`);

  const ctHeader = resp.headers.get('content-type') || '';
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);

  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image too large: ${(bytes.length / 1024 / 1024).toFixed(1)} MB (max 5 MB)`);
  }

  const mime = detectMime(bytes, ctHeader);
  const b64 = uint8ToBase64(bytes);
  return `data:${mime};base64,${b64}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!KIMI_API_KEY) return Response.json({ error: 'KIMI_API_KEY not configured' }, { status: 500 });

    const body = await req.json();
    const { fileUrls, articleContext = null } = body;

    if (!fileUrls || fileUrls.length === 0) {
      return Response.json({ error: 'No files provided' }, { status: 400 });
    }

    // Get sample articles for context
    let articleExamples = [];
    try {
      const articles = await base44.asServiceRole.entities.Article.list('-updated_date', 20);
      articleExamples = articles
        .filter(a => a.name)
        .map(a => ({ name: a.name, sku: a.sku, batch_number: a.batch_number, manufacturer: a.manufacturer, category: a.category }))
        .slice(0, 15);
    } catch (_e) { /* ignore */ }

    let contextPrompt = '';
    if (articleExamples.length > 0) {
      contextPrompt = '\n\nEXEMPEL PÅ PRODUKTER I LAGRET (använd för referens):\n';
      articleExamples.forEach((a, idx) => {
        contextPrompt += `\n${idx + 1}. ${a.name}`;
        if (a.sku) contextPrompt += ` | SKU: ${a.sku}`;
        if (a.batch_number) contextPrompt += ` | Batch: ${a.batch_number}`;
        if (a.manufacturer) contextPrompt += ` | Tillverkare: ${a.manufacturer}`;
        if (a.category) contextPrompt += ` | Kategori: ${a.category}`;
      });
    }

    const systemPrompt = `Du är ett avancerat OCR- och bildanalyssystem för lagerhantering av LED-skärmar och AV-utrustning.
Din uppgift är att extrahera ALL synlig text och information från bilder av produktetiketter, följesedlar, fakturor och produkter.
Returnera ALLTID ett JSON-objekt med exakt den struktur som begärs. Gissa aldrig — skriv exakt vad du ser.
Du har djup förståelse för LED-produkter, batch-koder, pixelpitchar och tillverkningsdatum.`;

    const userPrompt = `Analysera denna/dessa bilder och extrahera all synlig information med hög precision. Returnera ett JSON-objekt med följande struktur:

{
  "raw_text": "ALL text du ser på bilden, exakt som den visas",
  "image_type_detected": "label|packing_slip|invoice|site_photo|product_photo|unknown",
  "article_numbers": [{"value": "...", "confidence": 0.9, "field_type": "sku|supplier_code|internal_code"}],
  "product_names": [{"value": "...", "confidence": 0.9}],
  "suppliers": [{"value": "...", "confidence": 0.9}],
  "barcodes": [{"value": "...", "type": "EAN|GTIN|SSCC|Code128|QR|unknown", "confidence": 0.9}],
  "batch_numbers": [{"value": "...", "confidence": 0.9}],
  "serial_numbers": [{"value": "...", "confidence": 0.9}],
  "units": [{"value": "...", "confidence": 0.9}],
  "quantities": [{"value": 0, "context": "...", "confidence": 0.9}],
  "dates": [{"value": "...", "type": "manufacturing|expiration|delivery|unknown", "confidence": 0.9}],
  "dimensions": [{"dimension": "width|height|depth|diagonal", "value": 0, "unit": "mm", "confidence": 0.9}],
  "weight_volume": [{"value": 0, "unit": "kg", "confidence": 0.9}],
  "technical_specs": [{"spec_name": "...", "value": "...", "confidence": 0.9}],
  "visual_features": [{"feature": "...", "description": "..."}]
}

KRITISKT:
- Skriv EXAKT vad du ser - aldrig gissa eller normalisera koder
- Returnera raw_text med absolut all text på bilden
- Sätt confidence 0-1 baserat på hur tydlig texten är
${contextPrompt}`;

    // Fetch all images as base64 data URIs — handles Base44 storage URLs
    const imageMessages = await Promise.all(fileUrls.map(async (url) => {
      try {
        const dataUri = await fetchImageDataUri(url);
        return { type: "image_url", image_url: { url: dataUri } };
      } catch (e) {
        console.error("Failed to fetch/encode image:", url, e.message);
        // Fall back to direct URL (may fail with Moonshot but we tried)
        return { type: "image_url", image_url: { url } };
      }
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: [...imageMessages, { type: "text", text: userPrompt }] }
    ];

    const startTime = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);

    let kimiResponse;
    try {
      kimiResponse = await fetch("https://api.moonshot.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KIMI_API_KEY}` },
        body: JSON.stringify({ model: "kimi-k2.5", messages, temperature: 1, response_format: { type: "json_object" } }),
        signal: ctrl.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (!kimiResponse.ok) {
      const errText = await kimiResponse.text();
      return Response.json({ error: `Kimi API error: ${kimiResponse.status} - ${errText}` }, { status: 500 });
    }

    const kimiData = await kimiResponse.json();
    const content = kimiData.choices?.[0]?.message?.content;
    const durationMs = Date.now() - startTime;

    if (!content) return Response.json({ error: 'No response from Kimi' }, { status: 500 });

    let analysis;
    try {
      analysis = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (_e) {
      return Response.json({ error: 'Failed to parse Kimi response as JSON' }, { status: 500 });
    }

    return Response.json({ success: true, extracted: analysis, model_used: "kimi-k2.5", duration_ms: durationMs });

  } catch (error) {
    console.error('parseImage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});