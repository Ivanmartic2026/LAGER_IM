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

    // 40x30mm at 203 DPI (standard label printer resolution)
    const width = 320;  // 40mm at 203 DPI
    const height = 240; // 30mm at 203 DPI

    // Create QR code - very compact
    const qrCodeDataUrl = article.batch_number 
      ? await QRCode.toDataURL(article.batch_number, { 
          width: 80,
          margin: 0,
          errorCorrectionLevel: 'M'
        })
      : null;

    // Build ultra-compact HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: 40mm 30mm;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { 
      width: ${width}px;
      height: ${height}px;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    body { 
      font-family: Arial, sans-serif; 
      background: white;
      padding: 4px;
      display: flex;
    }
    .container {
      display: flex;
      gap: 4px;
      width: 100%;
      height: 100%;
    }
    .qr {
      flex-shrink: 0;
      width: 75px;
      height: 75px;
    }
    .qr img {
      width: 75px;
      height: 75px;
      display: block;
    }
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      justify-content: space-between;
      overflow: hidden;
    }
    .name {
      font-size: 8px;
      font-weight: bold;
      color: #000;
      line-height: 1.1;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      max-height: 18px;
    }
    .batch {
      font-size: 11px;
      font-weight: bold;
      color: #1e40af;
      word-break: break-all;
      margin-top: 2px;
      line-height: 1.1;
    }
    .sku {
      font-size: 6px;
      color: #6b7280;
      margin-top: 1px;
    }
    .location-section {
      margin-top: auto;
      padding-top: 3px;
      border-top: 1px solid #e5e7eb;
    }
    .location {
      font-size: 8px;
      font-weight: bold;
      color: #059669;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .warehouse {
      font-size: 6px;
      color: #6b7280;
      line-height: 1.1;
      margin-top: 1px;
    }
    .footer {
      font-size: 5px;
      color: #9ca3af;
      margin-top: 1px;
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