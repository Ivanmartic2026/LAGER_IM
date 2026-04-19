import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    let migratedCount = 0;
    let skippedCount = 0;
    const articleIds = [];

    // Get all articles
    const articles = await base44.asServiceRole.entities.Article.list('-updated_date', 1000);

    for (const article of articles) {
      const batchNum = article.batch_number;
      
      // Skip if empty or AUTO-prefix (systemgenerated)
      if (!batchNum || batchNum.startsWith('AUTO-1767')) {
        skippedCount++;
        continue;
      }

      // Check if Batch already exists with same article_id + batch_number
      const existingBatches = await base44.asServiceRole.entities.Batch.filter({
        article_id: article.id,
        batch_number: normalizeBatchNumber(batchNum)
      }, '-updated_date', 1);

      if (existingBatches.length === 0) {
        // Create new Batch
        const newBatch = await base44.asServiceRole.entities.Batch.create({
          article_id: article.id,
          batch_number: normalizeBatchNumber(batchNum),
          raw_batch_number: batchNum,
          article_sku: article.sku,
          article_name: article.name,
          status: 'verified',
          source_context: 'migrated_from_article',
          quantity: article.stock_qty || 0
        });

        // Update article.primary_batch_id
        await base44.asServiceRole.entities.Article.update(article.id, {
          primary_batch_id: newBatch.id,
          legacy_batch_number: batchNum
        });

        migratedCount++;
        articleIds.push(article.id);
      } else {
        // Batch exists — just update article.primary_batch_id if empty
        const batch = existingBatches[0];
        if (!article.primary_batch_id) {
          await base44.asServiceRole.entities.Article.update(article.id, {
            primary_batch_id: batch.id,
            legacy_batch_number: batchNum
          });
          migratedCount++;
          articleIds.push(article.id);
        }
      }
    }

    return Response.json({
      success: true,
      migrated_count: migratedCount,
      skipped_count: skippedCount,
      article_ids_migrated: articleIds
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function normalizeBatchNumber(raw) {
  return (raw || '').toUpperCase().replace(/\s+/g, '').trim();
}