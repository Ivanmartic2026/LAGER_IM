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

    // 40x30mm - 151x113 pixels
    const width = 151;
    const height = 113;

    // Create QR code - smaller for 40x30mm label
    const qrCodeDataUrl = article.batch_number 
      ? await QRCode.toDataURL(article.batch_number, { 
          width: 80,
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
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .label {
      width: 100%;
      height: 100%;
      background: white;
      display: flex;
      flex-direction: row;
      overflow: hidden;
    }
    .qr-section {
      width: 80px;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      flex-shrink: 0;
      background: white;
    }
    .qr-section img {
      width: 76px;
      height: 76px;
      image-rendering: pixelated;
    }
    .content-section {
      flex: 1;
      padding: 3px 2px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      gap: 1px;
      overflow: hidden;
    }
    .batch {
      font-size: 10px;
      font-weight: 700;
      color: #000;
      font-family: 'Courier New', monospace;
      line-height: 1.1;
      word-break: break-all;
      max-width: 100%;
    }
    .shelf {
      font-size: 9px;
      font-weight: 700;
      color: #000;
      font-family: 'Courier New', monospace;
      line-height: 1.1;
      word-break: break-all;
      max-width: 100%;
    }
    </style>
    </head>
    <body>
    <div class="label">
      ${qrCodeDataUrl ? `
      <div class="qr-section">
        <img src="${qrCodeDataUrl}" alt="QR" />
      </div>
      ` : ''}
      <div class="content-section">
        <div class="batch">${article.batch_number || 'N/A'}</div>
        <div class="shelf">${article.shelf_address && article.shelf_address.length > 0 ? (Array.isArray(article.shelf_address) ? article.shelf_address[0] : article.shelf_address) : '-'}</div>
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