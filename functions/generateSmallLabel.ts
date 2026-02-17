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

    // 40x30mm - 113x85 pixels
    const width = 113;
    const height = 85;

    // Create QR code - smaller for better layout
    const qrCodeDataUrl = article.batch_number 
      ? await QRCode.toDataURL(article.batch_number, { 
          width: 70,
          margin: 0,
          errorCorrectionLevel: 'M'
        })
      : null;

    // Build compact HTML - 40mm x 30mm
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
      padding: 3px;
    }
    .container {
      display: flex;
      gap: 4px;
      width: 100%;
      height: 100%;
      align-items: center;
    }
    .qr {
      flex-shrink: 0;
      width: 70px;
      height: 70px;
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
      justify-content: center;
      gap: 2px;
    }
    .location {
      font-size: 10px;
      font-weight: bold;
      color: #000;
      line-height: 1.2;
    }
    .name {
      font-size: 8px;
      font-weight: 500;
      color: #000;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .article-number {
      font-size: 8px;
      font-weight: 600;
      color: #000;
      font-family: 'Courier New', monospace;
      line-height: 1.2;
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
      ${article.shelf_address && article.shelf_address.length > 0 ? `
      <div class="location">
        ${Array.isArray(article.shelf_address) ? article.shelf_address[0] : article.shelf_address}
      </div>
      ` : '<div class="location">-</div>'}
      ${article.sku || article.batch_number ? `
      <div class="article-number">${article.sku || article.batch_number}</div>
      ` : ''}
      <div class="name">${article.customer_name || article.name || 'Artikel'}</div>
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