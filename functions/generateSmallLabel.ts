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

    // Create QR code
    const qrCodeDataUrl = article.batch_number 
      ? await QRCode.toDataURL(article.batch_number, { 
          width: 200,
          margin: 1,
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
      flex-direction: column;
      padding: 8px;
    }
    .top {
      display: flex;
      gap: 8px;
      margin-bottom: 4px;
    }
    .qr {
      flex-shrink: 0;
    }
    .qr img {
      width: 120px;
      height: 120px;
      display: block;
    }
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .name {
      font-size: 14px;
      font-weight: bold;
      color: #000;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .batch {
      font-size: 16px;
      font-weight: bold;
      color: #1e40af;
      margin-top: 4px;
    }
    .field {
      font-size: 10px;
      color: #374151;
      line-height: 1.3;
    }
    .field-label {
      font-weight: 600;
      color: #6b7280;
    }
    .bottom {
      margin-top: auto;
      padding-top: 4px;
      border-top: 1px solid #e5e7eb;
    }
    .location {
      font-size: 12px;
      font-weight: bold;
      color: #059669;
    }
    .footer {
      font-size: 8px;
      color: #9ca3af;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="top">
    ${qrCodeDataUrl ? `
    <div class="qr">
      <img src="${qrCodeDataUrl}" alt="QR" />
    </div>
    ` : ''}
    <div class="info">
      <div class="name">${article.customer_name || article.name || 'Artikel'}</div>
      ${article.batch_number ? `<div class="batch">#${article.batch_number}</div>` : ''}
      ${article.sku ? `<div class="field"><span class="field-label">SKU:</span> ${article.sku}</div>` : ''}
      ${article.supplier_name ? `<div class="field"><span class="field-label">Lev:</span> ${article.supplier_name}</div>` : ''}
      ${article.category ? `<div class="field"><span class="field-label">Kat:</span> ${article.category}</div>` : ''}
    </div>
  </div>
  
  ${(article.shelf_address && article.shelf_address.length > 0) || article.warehouse ? `
  <div class="bottom">
    ${article.shelf_address && article.shelf_address.length > 0 ? `<div class="location">📍 ${Array.isArray(article.shelf_address) ? article.shelf_address[0] : article.shelf_address}</div>` : ''}
    ${article.warehouse ? `<div class="field">${article.warehouse}</div>` : ''}
  </div>
  ` : ''}
  
  <div class="footer">
    ${new Date().toLocaleDateString('sv-SE')}
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