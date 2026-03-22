import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fileUrls } = body;

    if (!fileUrls || fileUrls.length === 0) {
      return Response.json({ error: 'No files provided' }, { status: 400 });
    }

    const schema = {
      type: "object",
      properties: {
        raw_text: { 
          type: "string",
          description: "All raw text found on the document"
        },
        article_numbers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              confidence: { type: "number" },
              field_type: { type: "string" }
            }
          }
        },
        product_name: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              confidence: { type: "number" }
            }
          }
        },
        supplier: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              confidence: { type: "number" }
            }
          }
        },
        ean_gtin: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              type: { type: "string" },
              confidence: { type: "number" }
            }
          }
        },
        batch_lot: {
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
        unit: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              confidence: { type: "number" }
            }
          }
        },
        quantity: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "number" },
              context: { type: "string" },
              confidence: { type: "number" }
            }
          }
        },
        dates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              type: { type: "string" },
              confidence: { type: "number" }
            }
          }
        },
        weight_volume: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              unit: { type: "string" },
              confidence: { type: "number" }
            }
          }
        }
      }
    };

    const prompt = `Analysera detta dokument (faktura, följesedel, eller etikett) och extrahera ALL information du kan hitta.

För varje typ av information, returnera en array med alla möjliga värden du hittar, tillsammans med:
- value: Det identifierade värdet
- confidence: Din säkerhet (0-1) på att detta är korrekt
- För vissa typer: field_type, context, type, eller unit

Titta efter:
1. Artikelnummer (leverantörens nummer, SKU, etc)
2. Produktnamn/Benämning
3. Leverantör/Tillverkare/Avsändare
4. EAN/GTIN/SSCC streckkoder
5. Batch/Lot-nummer
6. Serienummer (SN)
7. Enhet (st, pcs, pack, kg, etc)
8. Antal/Kvantitet (i olika kontexter)
9. Datum (tillverkning, utgång, leverans, etc)
10. Vikt eller Volym

Returnera ALLT du hittar. Jag vill inte att du filtrerar bort osäkra värden - alla ska med.
Inkludera även rå text av allt du ser.`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrls,
      response_json_schema: schema
    });

    return Response.json({
      success: true,
      extracted: analysis
    });
  } catch (error) {
    console.error('Error parsing document:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});