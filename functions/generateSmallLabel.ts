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

    // Build compact HTML - 40mm x 30mm - Design inspired by reference label
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
    }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 100%;
      text-align: center;
    }
    .name {
      font-size: 11px;
      font-weight: bold;
      color: #000;
      line-height: 1.2;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 2px;
    }
    .qr {
      flex-shrink: 0;
      width: 50px;
      height: 50px;
    }
    .qr img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .batch {
      font-size: 10px;
      font-weight: 600;
      color: #000;
      font-family: 'Courier New', monospace;
      line-height: 1.2;
    }
    </style>
    </head>
    <body>
    <div class="container">
    <div class="name">${article.name || 'N/A'}</div>
    ${qrCodeDataUrl ? `
    <div class="qr">
      <img src="${qrCodeDataUrl}" alt="QR" />
    </div>
    ` : '<div style="height: 50px;"></div>'}
    <div class="batch">Batch: ${article.batch_number || 'N/A'}</div>
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