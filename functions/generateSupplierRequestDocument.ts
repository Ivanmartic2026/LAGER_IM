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

    // Generate HTML document
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1e40af;
            margin: 0;
            font-size: 28px;
          }
          .section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
          }
          .section-title {
            font-weight: bold;
            color: #1e40af;
            font-size: 18px;
            margin-bottom: 15px;
          }
          .info-row {
            display: flex;
            margin-bottom: 10px;
          }
          .info-label {
            font-weight: bold;
            color: #475569;
            min-width: 180px;
          }
          .info-value {
            color: #0f172a;
          }
          .request-text {
            line-height: 1.8;
            color: #334155;
            padding: 20px;
            background: #fff;
            border-radius: 8px;
            border: 2px solid #e2e8f0;
          }
          .upload-section {
            background: #dbeafe;
            padding: 25px;
            border-radius: 8px;
            margin-top: 30px;
            text-align: center;
          }
          .upload-url {
            font-size: 14px;
            color: #1e40af;
            word-break: break-all;
            background: white;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
            font-family: monospace;
          }
          .images-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 15px;
          }
          .images-grid img {
            width: 100%;
            height: 150px;
            object-fit: cover;
            border-radius: 6px;
            border: 2px solid #e2e8f0;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #64748b;
            font-size: 12px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Documentation Request - IMvision</h1>
        </div>

        <div class="section">
          <div class="section-title">Article Information / Artikelreferens hos IM Vision</div>
          <div class="info-row">
            <div class="info-label">Article Name:</div>
            <div class="info-value">${article.name || 'N/A'}</div>
          </div>
          ${article.sku ? `
          <div class="info-row">
            <div class="info-label">Article Number (SKU):</div>
            <div class="info-value">${article.sku}</div>
          </div>
          ` : ''}
          ${article.batch_number ? `
          <div class="info-row">
            <div class="info-label">Batch Number:</div>
            <div class="info-value">${article.batch_number}</div>
          </div>
          ` : ''}
          ${article.supplier_product_code ? `
          <div class="info-row">
            <div class="info-label">Supplier Product Code:</div>
            <div class="info-value">${article.supplier_product_code}</div>
          </div>
          ` : ''}
        </div>

        ${supplier ? `
        <div class="section">
          <div class="section-title">Supplier Information / Leverantörens uppgifter</div>
          <div class="info-row">
            <div class="info-label">Supplier Name:</div>
            <div class="info-value">${supplier.name}</div>
          </div>
          ${supplier.contact_person ? `
          <div class="info-row">
            <div class="info-label">Contact Person:</div>
            <div class="info-value">${supplier.contact_person}</div>
          </div>
          ` : ''}
          ${supplier.email ? `
          <div class="info-row">
            <div class="info-label">Email:</div>
            <div class="info-value">${supplier.email}</div>
          </div>
          ` : ''}
          ${supplier.phone ? `
          <div class="info-row">
            <div class="info-label">Phone:</div>
            <div class="info-value">${supplier.phone}</div>
          </div>
          ` : ''}
        </div>
        ` : ''}

        ${article.image_urls && article.image_urls.length > 0 ? `
        <div class="section">
          <div class="section-title">Product Images</div>
          <div class="images-grid">
            ${article.image_urls.slice(0, 6).map(url => `<img src="${url}" alt="Product image" />`).join('')}
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Documentation Request</div>
          <div class="request-text">
            We kindly request supplementary documentation regarding the relevant purchase, including the corresponding invoice, in order for us to reference the correct installation/delivery in our system.<br><br>
            If available, please also include the project name and any relevant product images, as this will help us ensure accurate identification and traceability.<br><br>
            We would appreciate it if you could provide the requested documentation at your earliest convenience.
          </div>
        </div>

        <div class="upload-section">
          <div class="section-title">📤 Upload Documentation</div>
          <p>Please use the following link to upload your documents:</p>
          <div class="upload-url">${uploadUrl}</div>
        </div>

        <div class="footer">
          Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
          IMvision - Inventory & Order Management System
        </div>
      </body>
      </html>
    `;

    // Use InvokeLLM to convert HTML to image (using GenerateImage would work but we need HTML rendering)
    // Instead, we'll return the HTML and let the frontend handle screenshot
    // For now, save the HTML and create the request record
    
    // Save HTML as a file
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const htmlFile = new File([htmlBlob], 'supplier-request.html', { type: 'text/html' });
    
    const uploadResult = await base44.integrations.Core.UploadFile({ file: htmlFile });
    const htmlUrl = uploadResult.file_url;

    // Create document request record
    await base44.entities.SupplierDocumentRequest.create({
      article_id: article.id,
      article_name: article.name,
      article_batch_number: article.batch_number || '',
      supplier_id: article.supplier_id || '',
      supplier_name: article.supplier_name || supplier?.name || '',
      request_token: token,
      document_image_url: htmlUrl,
      status: 'pending'
    });

    return Response.json({
      success: true,
      html_url: htmlUrl,
      upload_url: uploadUrl,
      html: html,
      token: token
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});