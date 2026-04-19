import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fileUrls, articleContext = null, imageType = 'auto' } = body;

    if (!fileUrls || fileUrls.length === 0) {
      return Response.json({ error: 'No files provided' }, { status: 400 });
    }

    // Get sample articles for learning (top 20 by recency)
    let articleExamples = [];
    try {
      const articles = await base44.asServiceRole.entities.Article.list('-updated_date', 20);
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.bmp'];
      articleExamples = articles
      .filter(a => a.image_urls && a.image_urls.length > 0)
      .map(a => ({
        id: a.id,
        name: a.name,
        sku: a.sku,
        batch_number: a.batch_number,
        manufacturer: a.manufacturer,
        supplier_name: a.supplier_name,
        category: a.category,
        pixel_pitch_mm: a.pixel_pitch_mm,
        image_urls: a.image_urls.filter(url => imageExtensions.some(ext => url.toLowerCase().includes(ext))).slice(0, 1)
      }))
      .filter(a => a.image_urls.length > 0)
      .slice(0, 10);
    } catch (e) {
      console.log("Could not fetch articles for context");
    }

    // Build article learning context
    let contextPrompt = '';
    if (articleExamples.length > 0) {
      contextPrompt = `\n\nHÄR ÄR EXEMPEL PÅ PRODUKTER I LAGRET (lär dig av dessa bilder):\n`;
      articleExamples.forEach((article, idx) => {
        contextPrompt += `\nProdukt ${idx + 1}: ${article.name}`;
        if (article.sku) contextPrompt += ` | SKU: ${article.sku}`;
        if (article.batch_number) contextPrompt += ` | Batch: ${article.batch_number}`;
        if (article.manufacturer) contextPrompt += ` | Tillverkare: ${article.manufacturer}`;
        if (article.category) contextPrompt += ` | Kategori: ${article.category}`;
      });
    }

    const schema = {
      type: "object",
      properties: {
        raw_text: { 
          type: "string",
          description: "All raw text found on the image"
        },
        image_type_detected: {
          type: "string",
          enum: ["label", "packing_slip", "invoice", "site_photo", "product_photo", "unknown"],
          description: "What type of image this is"
        },
        article_numbers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              confidence: { type: "number" },
              field_type: { type: "string", enum: ["sku", "supplier_code", "internal_code"] }
            }
          },
          description: "All article/product numbers found"
        },
        product_names: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              confidence: { type: "number" }
            }
          },
          description: "Product/article names or descriptions"
        },
        suppliers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              confidence: { type: "number" }
            }
          },
          description: "Supplier/manufacturer names"
        },
        barcodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              type: { type: "string", enum: ["EAN", "GTIN", "SSCC", "Code128", "QR", "unknown"] },
              confidence: { type: "number" }
            }
          },
          description: "All detected barcodes"
        },
        batch_numbers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              confidence: { type: "number" }
            }
          }
        },
        serial_numbers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              confidence: { type: "number" }
            }
          }
        },
        units: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              confidence: { type: "number" }
            }
          },
          description: "Unit of measurement (st, pcs, pack, kg, etc)"
        },
        quantities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "number" },
              context: { type: "string" },
              confidence: { type: "number" }
            }
          },
          description: "Quantities found in different contexts"
        },
        dates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              type: { type: "string", enum: ["manufacturing", "expiration", "delivery", "unknown"] },
              confidence: { type: "number" }
            }
          }
        },
        dimensions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              dimension: { type: "string", enum: ["width", "height", "depth", "diagonal"] },
              value: { type: "number" },
              unit: { type: "string" },
              confidence: { type: "number" }
            }
          },
          description: "Physical dimensions"
        },
        weight_volume: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "number" },
              unit: { type: "string" },
              confidence: { type: "number" }
            }
          }
        },
        technical_specs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              spec_name: { type: "string" },
              value: { type: "string" },
              confidence: { type: "number" }
            }
          },
          description: "Technical specifications (pixel pitch, brightness, etc)"
        },
        visual_features: {
          type: "array",
          items: {
            type: "object",
            properties: {
              feature: { type: "string" },
              description: { type: "string" }
            }
          },
          description: "Visual features visible in the image for matching"
        }
      }
    };

    const prompt = `Du ska analysera denna/dessa bildar och EXAKT extrahera all synlig information.
Detta kan vara: etiketter, följesedlar, fakturabilder, site-foton, eller produktfoton.

KRITISKT VIKTIGT - LÄSA AV TEXTER:
- Läs EXAKT alla siffror, bokstäver och koder som syns på etiketter
- Gissa ALDRIG eller "normalisera" koderna - skriva exakt som de syns
- Om du ser "VCP186", skriv "VCP186" - inte varianter
- Om du ser "D/C 2443:001", skriv detta exakt - inte gissa betydelse
- Returnera raw_text med allt du ser för verifiering

För varje typ av information, returnera en array med alla möjliga värden tillsammans med:
- value: Det identifierade värdet (EXAKT som det syns)
- confidence: Din säkerhet (0-1) - låg confidence om texten är suddig/svårtolkad
- Andra relevanta fält (field_type, type, context, unit, etc)

Titta efter:
1. Artikelnummer/Produktkoder (SKU, leverantörskod, interna koder, D/C-nummer)
2. Produktnamn/Benämning
3. Leverantörer/Tillverkare
4. Streckkoder (EAN, GTIN, SSCC, QR, etc)
5. Batch/Lot-nummer
6. Serienummer (SN)
7. Enheter (st, pcs, pack, kg, etc)
8. Antal/Kvantiteter
9. Datum (tillverkning, utgång, leverans)
10. Dimensioner (bredd, höjd, djup)
11. Vikt/Volym
12. Tekniska specifikationer (pixel pitch, ljusstyrka, resolution, etc)
13. Visuella drag för matchning (design, kabinett-typ, LED-panel, färg, anslutningar, etc)

RETURNERA ALLT du hittar, även låga confidence-värden. Bättre att ge all info än att gissa.

Inkludera även:
- raw_text: EXAKT all text du ser på bilden (dump av allt)
- image_type_detected: Vad är denna bild (etikett, följesedel, etc)
- visual_features: Fysiska egenskaper du kan se för matchning med andra bilder
${contextPrompt}`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrls,
      response_json_schema: schema,
      model: "gpt_5"
    });

    return Response.json({
      success: true,
      extracted: analysis
    });
  } catch (error) {
    console.error('Error parsing image:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});