import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { article_id } = await req.json();

    if (!article_id) {
      return Response.json({ error: 'article_id is required' }, { status: 400 });
    }

    // Fetch article details
    const articles = await base44.entities.Article.filter({ id: article_id });
    const article = articles[0];

    if (!article) {
      return Response.json({ error: 'Article not found' }, { status: 404 });
    }

    // Fetch supplier details if available
    let supplier = null;
    if (article.supplier_id) {
      const suppliers = await base44.entities.Supplier.filter({ id: article.supplier_id });
      supplier = suppliers[0];
    }

    // Generate unique token
    const token = crypto.randomUUID();

    // Create upload URL
    const uploadUrl = `${req.headers.get('origin')}/SupplierDocumentUpload?token=${token}`;

    // Create document request record
    await base44.entities.SupplierDocumentRequest.create({
      article_id: article.id,
      article_name: article.name,
      article_batch_number: article.batch_number || '',
      supplier_id: article.supplier_id || '',
      supplier_name: article.supplier_name || supplier?.name || '',
      request_token: token,
      document_image_url: uploadUrl, // Store the upload URL instead of generated image
      status: 'pending'
    });

    return Response.json({
      success: true,
      upload_url: uploadUrl,
      token: token
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});