import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import QRCode from 'npm:qrcode@1.5.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { articleId } = await req.json();

    if (!articleId) {
      return Response.json({ error: 'Article ID required' }, { status: 400 });
    }

    const articles = await base44.asServiceRole.entities.Article.filter({ id: articleId });
    
    if (!articles || articles.length === 0) {
      return Response.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = articles[0];

    // 40x30mm at 300 DPI = 472x354 pixels
    const width = 472;
    const height = 354;

    // Create QR code - smaller for compact label
    const qrCodeDataUrl = article.batch_number 
      ? await QRCode.toDataURL(article.batch_number, { 
          width: 150,
          margin: 0,
          errorCorrectionLevel: 'H'
        })
      : null;

    // Build compact HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      width: ${width}px; 
      height: ${height}px; 
      background: white;
      display: flex;
      padding: 6px;
    }
    .container {
      display: flex;
      gap: 6px;
      width: 100%;
    }
    .qr {
      flex-shrink: 0;
    }
    .qr img {
      width: 110px;
      height: 110px;
      display: block;
    }
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      justify-content: space-between;
    }
    .name {
      font-size: 11px;
      font-weight: bold;
      color: #000;
      line-height: 1.1;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      margin-bottom: 3px;
    }
    .batch {
      font-size: 14px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 2px;
      word-break: break-all;
    }
    .sku {
      font-size: 8px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .location-section {
      margin-top: auto;
      padding-top: 4px;
      border-top: 1px solid #e5e7eb;
    }
    .location {
      font-size: 11px;
      font-weight: bold;
      color: #059669;
      display: flex;
      align-items: center;
      gap: 2px;
      margin-bottom: 2px;
    }
    .warehouse {
      font-size: 8px;
      color: #6b7280;
      line-height: 1.1;
    }
    .footer {
      font-size: 7px;
      color: #9ca3af;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${qrCodeDataUrl ? `
    <div class="qr">
      <img src="${qrCodeDataUrl}" alt="QR" />
    </div>
    ` : ''}

    <div class="content">
      <div>
        <div class="name">${article.customer_name || article.name || 'Artikel'}</div>
        ${article.batch_number ? `<div class="batch">#${article.batch_number}</div>` : ''}
        ${article.sku ? `<div class="sku">SKU: ${article.sku}</div>` : ''}
      </div>

      <div class="location-section">
        ${article.shelf_address && article.shelf_address.length > 0 ? `
        <div class="location">
          📍 ${Array.isArray(article.shelf_address) ? article.shelf_address[0] : article.shelf_address}
        </div>
        ` : ''}
        ${article.warehouse ? `<div class="warehouse">${article.warehouse}</div>` : ''}
        <div class="footer">${new Date().toLocaleDateString('sv-SE')}</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});