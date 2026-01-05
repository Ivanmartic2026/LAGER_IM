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

    // 40x30mm - using mm directly for print
    const widthMM = 40;
    const heightMM = 30;

    // Create QR code - compact for small label
    const qrCodeDataUrl = article.batch_number 
      ? await QRCode.toDataURL(article.batch_number, { 
          width: 100,
          margin: 0,
          errorCorrectionLevel: 'M'
        })
      : null;

    // Build compact HTML with exact mm dimensions
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: ${widthMM}mm ${heightMM}mm;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { 
      width: ${widthMM}mm;
      height: ${heightMM}mm;
      max-width: ${widthMM}mm;
      max-height: ${heightMM}mm;
      overflow: hidden;
    }
    body { 
      font-family: Arial, sans-serif; 
      background: white;
      padding: 1.5mm;
    }
    .container {
      display: flex;
      gap: 2mm;
      width: 100%;
      height: 100%;
    }
    .qr {
      flex-shrink: 0;
      width: 10mm;
      height: 10mm;
    }
    .qr img {
      width: 10mm;
      height: 10mm;
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
      font-size: 7pt;
      font-weight: bold;
      color: #000;
      line-height: 1.1;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .batch {
      font-size: 9pt;
      font-weight: bold;
      color: #1e40af;
      word-break: break-all;
      margin-top: 0.5mm;
    }
    .sku {
      font-size: 5pt;
      color: #6b7280;
    }
    .location-section {
      margin-top: auto;
      border-top: 0.3mm solid #e5e7eb;
      padding-top: 0.5mm;
    }
    .location {
      font-size: 7pt;
      font-weight: bold;
      color: #059669;
      display: flex;
      align-items: center;
      gap: 0.5mm;
    }
    .warehouse {
      font-size: 5pt;
      color: #6b7280;
    }
    .footer {
      font-size: 4pt;
      color: #9ca3af;
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