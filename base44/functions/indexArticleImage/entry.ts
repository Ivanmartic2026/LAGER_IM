import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { article_id, image_url } = await req.json();

    if (!article_id || !image_url) {
      return Response.json({ error: 'article_id and image_url required' }, { status: 400 });
    }

    // Hämta artikel för att avgöra kategori
    const article = await base44.entities.Article.get(article_id);
    if (!article) {
      return Response.json({ error: 'Article not found' }, { status: 404 });
    }

    // Generera visuell beskrivning med AI
    const description = await base44.integrations.Core.InvokeLLM({
      prompt: `Analysera denna bild av en LED-reservdel mycket detaljerat. Beskriv:
- Exakt vad du ser (form, färg, text, knappar, portar, LED-mönster)
- Alla synliga etiketter, siffror eller märkningar
- Tekniska detaljer som är synliga
- Kontakter och anslutningar
- Storlek och proportioner relativt andra komponenter
Var extremt specifik och detaljerad.`,
      file_urls: [image_url],
      add_context_from_internet: false
    });

    // Avgör formulärtyp baserat på kategori
    let form_template = 'other';
    if (article.category === 'LED Module') form_template = 'led_module';
    else if (article.category === 'Power Supply') form_template = 'power_supply';
    else if (article.category === 'Cable') form_template = 'cable';
    else if (article.category === 'Control Processor' || article.category === 'Receiving Card') form_template = 'controller';
    else if (article.category === 'Cabinet') form_template = 'cabinet';

    // Skapa embedding-post
    const embedding = await base44.asServiceRole.entities.ArticleEmbedding.create({
      article_id,
      image_url,
      description,
      form_template,
      indexed_date: new Date().toISOString()
    });

    return Response.json({ 
      success: true, 
      embedding_id: embedding.id,
      description: description.substring(0, 200) + '...'
    });

  } catch (error) {
    console.error('Index error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});