import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    let updatedCount = 0;
    const siteReportImages = await base44.asServiceRole.entities.SiteReportImage.list('-updated_date', 500);

    for (const image of siteReportImages) {
      if (image.batch_id || !image.matched_article_id) continue;

      // Find article + get primary batch
      const article = await base44.asServiceRole.entities.Article.get(image.matched_article_id);
      if (!article || !article.primary_batch_id) continue;

      await base44.asServiceRole.entities.SiteReportImage.update(image.id, {
        batch_id: article.primary_batch_id
      });

      // Update SiteReport.batch_ids[]
      if (image.site_report_id) {
        const report = await base44.asServiceRole.entities.SiteReport.get(image.site_report_id);
        if (report) {
          const batchIds = report.batch_ids || [];
          if (!batchIds.includes(article.primary_batch_id)) {
            batchIds.push(article.primary_batch_id);
            await base44.asServiceRole.entities.SiteReport.update(image.site_report_id, {
              batch_ids: batchIds
            });
          }
        }
      }

      updatedCount++;
    }

    return Response.json({
      success: true,
      updated_count: updatedCount
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});