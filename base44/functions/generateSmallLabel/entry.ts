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

    // 80x60mm - 226x170 pixels
    const width = 226;
    const height = 170;

    // Create QR code - optimized size for 80x60mm label
    const qrCodeDataUrl = article.batch_number 
      ? await QRCode.toDataURL(article.batch_number, { 
          width: 160,
          margin: 0,
          errorCorrectionLevel: 'M'
        })
      : null;

    // Build compact HTML - 80mm x 60mm - QR code with batch and shelf location
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <style>
    @page {
      size: 80mm 60mm;
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
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      text-align: center;
      gap: 6px;
    }
    .qr {
      flex-shrink: 0;
      width: 95px;
      height: 95px;
    }
    .qr img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .info {
      font-size: 20px;
      font-weight: 700;
      color: #000;
      font-family: 'Courier New', monospace;
      line-height: 1.2;
      word-break: break-all;
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
    <div class="info">${article.batch_number || 'N/A'}</div>
    <div class="info">${article.shelf_address && article.shelf_address.length > 0 ? (Array.isArray(article.shelf_address) ? article.shelf_address[0] : article.shelf_address) : '-'}</div>
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