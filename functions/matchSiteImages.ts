import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { site_report_id } = await req.json();

    if (!site_report_id) {
      return Response.json({ error: 'site_report_id required' }, { status: 400 });
    }

    // Hämta alla bilder från site-rapporten
    const siteImages = await base44.asServiceRole.entities.SiteReportImage.filter({
      site_report_id,
      match_status: 'pending'
    });

    if (siteImages.length === 0) {
      return Response.json({ success: true, message: 'No images to match' });
    }

    // Hämta alla artiklar med bilder
    const allArticles = await base44.asServiceRole.entities.Article.list();
    const articlesWithImages = allArticles.filter(a => a.image_urls && a.image_urls.length > 0);

    const matchResults = [];

    // För varje site-bild
    for (const siteImage of siteImages) {
      // Ta max 100 artiklar för att undvika timeout
      const articlesToCompare = articlesWithImages.slice(0, 100);
      
      if (articlesToCompare.length === 0) {
        continue;
      }

      // Bygg artikel-referenslista
      const articleReferences = articlesToCompare.map((a, idx) => ({
        index: idx + 1,
        article_id: a.id,
        name: a.name,
        batch_number: a.batch_number,
        sku: a.sku,
        manufacturer: a.manufacturer,
        category: a.category
      }));

      // Direkt visuell jämförelse
      const visualComparison = await base44.integrations.Core.InvokeLLM({
        prompt: `Du ska jämföra den FÖRSTA bilden (site-bild) med alla produktbilder från lagret.

VIKTIGT: Site-bilden är bild nummer 0. Resten av bilderna (1-${articlesToCompare.length}) är från vårt lager.

Artikelreferenser:
${articleReferences.map(ref => `Bild ${ref.index}: ${ref.name || 'Okänd'} (ID: ${ref.article_id}, Batch: ${ref.batch_number || 'N/A'}, SKU: ${ref.sku || 'N/A'}, Tillverkare: ${ref.manufacturer || 'N/A'}, Kategori: ${ref.category || 'N/A'})`).join('\n')}

Analysera om site-bilden (bild 0) visar SAMMA produkt/produktmodell som någon av lagerbilderna.
En matchning betyder att det är exakt samma produktmodell - samma utseende, design, kabinett, LED-panel typ, kontakter, etc.
Det spelar ingen roll om vinkeln är annorlunda eller om färgen på bakgrunden skiljer sig.

Returnera TOP 3 BÄSTA matchningar (även om de är osäkra). För varje matchning, returnera:
- article_id: ID för den matchande artikeln
- confidence: 0-1 (hur säker du är på matchningen)
- reasoning: Detaljerad förklaring av varför det är en matchning (eller varför det INTE är en matchning om confidence är låg)

Returnera alla 3 matchningar, även om confidence är låg (t.ex. 0.3).`,
        file_urls: [
          siteImage.image_url,
          ...articlesToCompare.flatMap(a => a.image_urls.slice(0, 1))
        ],
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  article_id: { type: "string" },
                  confidence: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Generera också textbeskrivning av site-bilden för framtida bruk
      const siteDescription = await base44.integrations.Core.InvokeLLM({
        prompt: `Analysera denna bild mycket detaljerat. Beskriv:
- Exakt vad du ser (form, färg, text, knappar, portar, LED-mönster)
- Alla synliga etiketter, siffror eller märkningar
- Tekniska detaljer som är synliga
- Kontakter och anslutningar
- Storlek och proportioner
Var extremt specifik och detaljerad.`,
        file_urls: [siteImage.image_url],
        add_context_from_internet: false
      });

      // Uppdatera site-bilden med beskrivning
      await base44.asServiceRole.entities.SiteReportImage.update(siteImage.id, {
        image_description: siteDescription
      });

      // Hitta bästa matchningen från resultaten
      if (visualComparison.matches && visualComparison.matches.length > 0) {
        const bestMatch = visualComparison.matches.sort((a, b) => b.confidence - a.confidence)[0];

        // Spara matchning om confidence är minst 0.5
        if (bestMatch && bestMatch.confidence >= 0.5) {
          await base44.asServiceRole.entities.SiteReportImage.update(siteImage.id, {
            matched_article_id: bestMatch.article_id,
            match_confidence: bestMatch.confidence,
            match_status: 'matched'
          });

          matchResults.push({
            site_image_id: siteImage.id,
            matched_article_id: bestMatch.article_id,
            confidence: bestMatch.confidence,
            reasoning: bestMatch.reasoning,
            all_matches: visualComparison.matches
          });
        }
      }
    }

    return Response.json({ 
      success: true, 
      matches: matchResults,
      total_processed: siteImages.length
    });

  } catch (error) {
    console.error('Matching error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});