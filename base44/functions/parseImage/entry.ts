import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const KIMI_API_KEY = Deno.env.get("KIMI_API_KEY");
    if (!KIMI_API_KEY) {
      return Response.json({ error: 'KIMI_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { fileUrls, articleContext = null, imageType = 'auto' } = body;

    if (!fileUrls || fileUrls.length === 0) {
      return Response.json({ error: 'No files provided' }, { status: 400 });
    }

    // Get sample articles for context
    let articleExamples = [];
    try {
      const articles = await base44.asServiceRole.entities.Article.list('-updated_date', 20);
      articleExamples = articles
        .filter(a => a.name)
        .map(a => ({
          name: a.name,
          sku: a.sku,
          batch_number: a.batch_number,
          manufacturer: a.manufacturer,
          supplier_name: a.supplier_name,
          category: a.category,
        }))
        .slice(0, 15);
    } catch (e) {
      console.log("Could not fetch articles for context");
    }

    let contextPrompt = '';
    if (articleExamples.length > 0) {
      contextPrompt = `\n\nEXEMPEL PÅ PRODUKTER I LAGRET (använd för referens):\n`;
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
- Om du ser "VCP186" skriv "VCP186", om du ser "D/C 2443:001" skriv det exakt
- Returnera raw_text med absolut all text på bilden
- Sätt confidence 0-1 baserat på hur tydlig texten är
- Använd din förståelse för LED-produkter och batchnummer för att identifiera fält korrekt
${contextPrompt}`;

    // Build messages with image URLs
    const imageMessages = fileUrls.map(url => ({
      type: "image_url",
      image_url: { url }
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          ...imageMessages,
          { type: "text", text: userPrompt }
        ]
      }
    ];

    const startTime = Date.now();

    const kimiResponse = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${KIMI_API_KEY}`
      },
      body: JSON.stringify({
        model: "kimi-k2-5",
        messages,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!kimiResponse.ok) {
      const errText = await kimiResponse.text();
      console.error("Kimi API error:", errText);
      return Response.json({ error: `Kimi API error: ${kimiResponse.status} - ${errText}` }, { status: 500 });
    }

    const kimiData = await kimiResponse.json();
    const content = kimiData.choices?.[0]?.message?.content;
    const durationMs = Date.now() - startTime;

    console.log(`Kimi K2.5 vision analysis completed in ${durationMs}ms`);

    if (!content) {
      return Response.json({ error: 'No response from Kimi' }, { status: 500 });
    }

    let analysis;
    try {
      analysis = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (e) {
      console.error("Failed to parse Kimi JSON response:", content);
      return Response.json({ error: 'Failed to parse Kimi response as JSON' }, { status: 500 });
    }

    return Response.json({
      success: true,
      extracted: analysis,
      model_used: "kimi-k2-5",
      duration_ms: durationMs
    });

  } catch (error) {
    console.error('Error parsing image:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});