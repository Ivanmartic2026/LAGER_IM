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

    // Hämta alla indexerade artikelbilder
    const embeddings = await base44.asServiceRole.entities.ArticleEmbedding.list();

    const matchResults = [];

    // För varje site-bild
    for (const siteImage of siteImages) {
      // Generera beskrivning av site-bilden
      const siteDescription = await base44.integrations.Core.InvokeLLM({
        prompt: `Analysera denna bild av en LED-reservdel mycket detaljerat. Beskriv:
- Exakt vad du ser (form, färg, text, knappar, portar, LED-mönster)
- Alla synliga etiketter, siffror eller märkningar
- Tekniska detaljer som är synliga
- Kontakter och anslutningar
- Storlek och proportioner relativt andra komponenter
Var extremt specifik och detaljerad.`,
        file_urls: [siteImage.image_url],
        add_context_from_internet: false
      });

      // Uppdatera site-bilden med beskrivning
      await base44.asServiceRole.entities.SiteReportImage.update(siteImage.id, {
        image_description: siteDescription
      });

      // Hitta bästa matchningen genom att jämföra beskrivningar
      let bestMatch = null;
      let bestScore = 0;

      for (const embedding of embeddings) {
        // Använd AI för att jämföra likheten
        const comparisonResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Jämför dessa två beskrivningar av LED-reservdelar och ge en likhetsscore mellan 0 och 1.
          
Bild 1 (från site): ${siteDescription}

Bild 2 (från lager): ${embedding.description}

Svara ENDAST med ett JSON-objekt i följande format:
{
  "similarity_score": 0.X,
  "reasoning": "kort förklaring"
}`,
          response_json_schema: {
            type: "object",
            properties: {
              similarity_score: { type: "number" },
              reasoning: { type: "string" }
            }
          }
        });

        if (comparisonResult.similarity_score > bestScore) {
          bestScore = comparisonResult.similarity_score;
          bestMatch = {
            embedding,
            score: comparisonResult.similarity_score,
            reasoning: comparisonResult.reasoning
          };
        }
      }

      // Uppdatera site-bilden med matchning
      if (bestMatch && bestMatch.score > 0.5) {
        await base44.asServiceRole.entities.SiteReportImage.update(siteImage.id, {
          matched_article_id: bestMatch.embedding.article_id,
          match_confidence: bestMatch.score,
          match_status: 'matched'
        });

        matchResults.push({
          site_image_id: siteImage.id,
          matched_article_id: bestMatch.embedding.article_id,
          confidence: bestMatch.score,
          reasoning: bestMatch.reasoning
        });
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