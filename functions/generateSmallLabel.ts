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

    // Create QR code - compact but scannable
    const qrCodeDataUrl = article.batch_number 
      ? await QRCode.toDataURL(article.batch_number, { 
          width: 110,
          margin: 0,
          errorCorrectionLevel: 'M'
        })
      : null;

    // Build compact HTML
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
      padding: 6px;
    }
    .container {
      display: flex;
      gap: 5px;
      width: 100%;
      height: 100%;
      align-items: flex-start;
    }
    .qr {
      flex-shrink: 0;
      width: 105px;
      height: 105px;
    }
    .qr img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: 100%;
      justify-content: space-between;
    }
    .batch {
      font-size: 16px;
      font-weight: bold;
      color: #1e40af;
      word-break: break-all;
      line-height: 1.1;
      margin-bottom: 3px;
    }
    .name {
      font-size: 9px;
      font-weight: bold;
      color: #000;
      line-height: 1.1;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      margin-bottom: 2px;
    }
    .location-section {
      margin-top: auto;
      padding-top: 3px;
      border-top: 1px solid #ddd;
    }
    .location {
      font-size: 10px;
      font-weight: bold;
      color: #059669;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .warehouse {
      font-size: 7px;
      color: #666;
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
        ${article.batch_number ? `<div class="batch">#${article.batch_number}</div>` : ''}
        <div class="name">${article.customer_name || article.name || 'Artikel'}</div>
      </div>

      <div class="location-section">
        ${article.shelf_address && article.shelf_address.length > 0 ? `
        <div class="location">
          📍 ${Array.isArray(article.shelf_address) ? article.shelf_address[0] : article.shelf_address}
        </div>
        ` : ''}
        ${article.warehouse ? `<div class="warehouse">${article.warehouse}</div>` : ''}
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