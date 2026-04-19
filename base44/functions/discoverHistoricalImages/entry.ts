import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'lager') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { source_filter } = body; // optional: array of source types to filter

    const imageRefs = [];

    const shouldInclude = (source) => !source_filter || source_filter.includes(source);

    // 1. Article.image_urls
    if (shouldInclude('article')) {
      const articles = await base44.asServiceRole.entities.Article.list('-updated_date', 500);
      articles.forEach(a => {
        (a.image_urls || []).forEach(url => {
          if (url) imageRefs.push({ image_url: url, source_entity: 'Article', source_id: a.id, article_name: a.name, article_sku: a.sku });
        });
      });
    }

    // 2. ReceivingRecord.image_urls
    if (shouldInclude('receiving_record')) {
      const records = await base44.asServiceRole.entities.ReceivingRecord.list('-created_date', 500);
      records.forEach(r => {
        (r.image_urls || []).forEach(url => {
          if (url) imageRefs.push({ image_url: url, source_entity: 'ReceivingRecord', source_id: r.id });
        });
      });
    }

    // 3. ExtractedValueLog (if has image_urls)
    if (shouldInclude('extracted_value_log')) {
      try {
        const logs = await base44.asServiceRole.entities.ExtractedValueLog.list('-created_date', 200);
        logs.forEach(l => {
          (l.image_urls || []).forEach(url => {
            if (url) imageRefs.push({ image_url: url, source_entity: 'ExtractedValueLog', source_id: l.id });
          });
        });
      } catch (e) { /* entity may not have image_urls */ }
    }

    // Filter out already-analyzed images (those with existing LabelScans)
    const existingScans = await base44.asServiceRole.entities.LabelScan.list('-created_date', 1000);
    const analyzedUrls = new Set(existingScans.map(s => s.image_url));
    const unanalyzed = imageRefs.filter(r => !analyzedUrls.has(r.image_url));

    return Response.json({
      success: true,
      total_found: imageRefs.length,
      already_analyzed: imageRefs.length - unanalyzed.length,
      pending_analysis: unanalyzed.length,
      image_refs: unanalyzed
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});