import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Triggered when an ArticleDocument is created or updated
// Syncs file_url to the linked article's image_urls or cfg_file_url

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;
    if (!data?.article_id || !data?.file_url) {
      return Response.json({ success: true, action: 'no_article_or_file' });
    }

    const doc = data;
    const article = await base44.asServiceRole.entities.Article.get(doc.article_id).catch(() => null);
    if (!article) {
      return Response.json({ success: true, action: 'article_not_found' });
    }

    // Determine if this is an image or a cfg file
    const isImage = doc.document_type === 'qc_photos' || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.file_url);
    const isCfg = /\.cfg$/i.test(doc.file_url);

    const updateData = {};

    if (isImage) {
      // Add to image_urls array (avoid duplicates)
      const existingImages = Array.isArray(article.image_urls) ? article.image_urls : [];
      if (!existingImages.includes(doc.file_url)) {
        updateData.image_urls = [...existingImages, doc.file_url];
      }
    } else if (isCfg) {
      updateData.cfg_file_url = doc.file_url;
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json({ success: true, action: 'no_update_needed' });
    }

    await base44.asServiceRole.entities.Article.update(doc.article_id, updateData);

    console.log(`Synced document ${doc.id} to article ${doc.article_id}:`, updateData);
    return Response.json({ success: true, action: 'synced', article_id: doc.article_id, updated: updateData });

  } catch (error) {
    console.error('syncArticleDocumentFiles error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});