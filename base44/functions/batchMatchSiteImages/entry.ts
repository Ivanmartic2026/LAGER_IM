import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Batch-baserad AI-matchning för site-rapporter
 * Optimerad för att hantera stora volymer av rapporter och bilder
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { site_report_ids, auto_confirm_threshold = 0.85 } = await req.json();

    if (!site_report_ids || site_report_ids.length === 0) {
      return Response.json({ error: 'site_report_ids required' }, { status: 400 });
    }

    const results = {
      total_reports: site_report_ids.length,
      total_images: 0,
      auto_confirmed: 0,
      needs_review: 0,
      no_match: 0,
      processing_time_ms: 0,
      reports: []
    };

    const startTime = Date.now();

    // Hämta alla artiklar med embeddings en gång (cache)
    const articleEmbeddings = await base44.asServiceRole.entities.ArticleEmbedding.list();
    const embedMap = new Map(articleEmbeddings.map(e => [e.article_id, e]));

    console.log(`Cached ${articleEmbeddings.length} article embeddings`);

    // Bearbeta varje rapport
    for (const reportId of site_report_ids) {
      const reportResult = {
        report_id: reportId,
        images_processed: 0,
        auto_confirmed: 0,
        needs_review: 0,
        no_match: 0
      };

      // Hämta obearbetade bilder för denna rapport
      const siteImages = await base44.asServiceRole.entities.SiteReportImage.filter({
        site_report_id: reportId,
        match_status: 'pending'
      });

      reportResult.images_processed = siteImages.length;
      results.total_images += siteImages.length;

      // Gruppera bilder för batch-bearbetning (max 5 åt gången)
      const batchSize = 5;
      for (let i = 0; i < siteImages.length; i += batchSize) {
        const batch = siteImages.slice(i, i + batchSize);
        
        // Parallell bearbetning inom batch
        await Promise.all(batch.map(async (siteImage) => {
          try {
            // Snabb embedding-baserad matchning först
            const topMatches = await findTopMatchesViaEmbedding(
              base44, 
              siteImage, 
              articleEmbeddings, 
              5
            );

            if (topMatches.length === 0) {
              reportResult.no_match++;
              return;
            }

            // Visuell bekräftelse för top 3
            const visualMatch = await verifyTopMatches(
              base44,
              siteImage,
              topMatches.slice(0, 3)
            );

            if (visualMatch && visualMatch.confidence >= auto_confirm_threshold) {
              // Auto-bekräfta högsäkra matchningar
              await base44.asServiceRole.entities.SiteReportImage.update(siteImage.id, {
                matched_article_id: visualMatch.article_id,
                match_confidence: visualMatch.confidence,
                match_status: 'confirmed',
                confirmed_by: 'auto',
                component_status: 'documented',
                form_data: {
                  auto_confirmed: true,
                  confidence: visualMatch.confidence,
                  reasoning: visualMatch.reasoning
                }
              });
              reportResult.auto_confirmed++;
              results.auto_confirmed++;
            } else if (visualMatch && visualMatch.confidence >= 0.5) {
              // Kräver manuell granskning
              await base44.asServiceRole.entities.SiteReportImage.update(siteImage.id, {
                matched_article_id: visualMatch.article_id,
                match_confidence: visualMatch.confidence,
                match_status: 'matched'
              });
              reportResult.needs_review++;
              results.needs_review++;
            } else {
              reportResult.no_match++;
              results.no_match++;
            }

          } catch (error) {
            console.error(`Error processing image ${siteImage.id}:`, error);
            reportResult.no_match++;
          }
        }));
      }

      results.reports.push(reportResult);
    }

    results.processing_time_ms = Date.now() - startTime;

    // Skicka notifikation till användare
    await base44.asServiceRole.functions.invoke('createNotification', {
      user_email: user.email,
      title: 'Batch-matchning klar',
      message: `Bearbetade ${results.total_images} bilder från ${results.total_reports} rapporter. ${results.auto_confirmed} auto-bekräftade, ${results.needs_review} kräver granskning.`,
      type: 'system',
      priority: 'normal'
    });

    return Response.json({ 
      success: true, 
      ...results,
      processing_speed_images_per_sec: (results.total_images / (results.processing_time_ms / 1000)).toFixed(2)
    });

  } catch (error) {
    console.error('Batch matching error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Hjälpfunktioner

async function findTopMatchesViaEmbedding(base44, siteImage, articleEmbeddings, topN = 5) {
  // Generera embedding-beskrivning för site-bilden
  const description = await base44.integrations.Core.InvokeLLM({
    prompt: `Beskriv denna komponent/produkt mycket kortfattat och tekniskt. 
Fokusera på: typ av produkt, synliga features, storlek, färg, anslutningar.
Max 50 ord.`,
    file_urls: [siteImage.image_url]
  });

  // Semantisk sökning baserad på text-likhet
  const matches = articleEmbeddings
    .map(emb => ({
      article_id: emb.article_id,
      similarity: calculateTextSimilarity(description, emb.description),
      embedding: emb
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);

  return matches;
}

async function verifyTopMatches(base44, siteImage, topMatches) {
  if (topMatches.length === 0) return null;

  // Hämta artiklar för att få bilder
  const articleIds = topMatches.map(m => m.article_id);
  const articles = await Promise.all(
    articleIds.map(id => base44.asServiceRole.entities.Article.filter({ id }))
  );

  const articlesFlat = articles.flat().filter(a => a.image_urls && a.image_urls.length > 0);

  if (articlesFlat.length === 0) return null;

  // Visuell jämförelse med top matches
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Jämför bild 0 (site-bild) med bilderna 1-${articlesFlat.length} (lagerbilder).

Artiklar:
${articlesFlat.map((a, idx) => `Bild ${idx + 1}: ${a.name} (Batch: ${a.batch_number || 'N/A'})`).join('\n')}

Returnera den BÄSTA matchningen med confidence 0-1.`,
    file_urls: [
      siteImage.image_url,
      ...articlesFlat.flatMap(a => a.image_urls.slice(0, 1))
    ],
    response_json_schema: {
      type: "object",
      properties: {
        article_id: { type: "string" },
        confidence: { type: "number" },
        reasoning: { type: "string" }
      }
    }
  });

  return result;
}

function calculateTextSimilarity(text1, text2) {
  // Enkel cosine similarity baserad på ord
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}