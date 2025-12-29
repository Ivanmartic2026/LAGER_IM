import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { articles } = await req.json();

    if (!articles || !Array.isArray(articles)) {
      return Response.json({ error: 'Ingen artikeldata angiven' }, { status: 400 });
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Process each confirmed article
    for (let i = 0; i < articles.length; i++) {
      const item = articles[i];
      
      try {
        if (item.action === 'update' && item.existingArticle?.id) {
          // Update existing article
          await base44.asServiceRole.entities.Article.update(item.existingArticle.id, item.data);
          results.updated++;
        } else if (item.action === 'create') {
          // Create new article
          await base44.asServiceRole.entities.Article.create(item.data);
          results.created++;
        }
      } catch (error) {
        results.errors.push(`Rad ${item.rowNumber}: ${error.message}`);
        results.skipped++;
      }
    }

    return Response.json({
      success: true,
      message: `Import klar: ${results.created} skapade, ${results.updated} uppdaterade, ${results.skipped} överhoppade`,
      results
    });

  } catch (error) {
    console.error('Error confirming import:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});