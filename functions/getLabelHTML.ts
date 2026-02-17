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

    // Generate QR code
    const qrDataUrl = article.batch_number 
      ? await QRCode.toDataURL(article.batch_number, { 
          width: 200,
          margin: 0,
          errorCorrectionLevel: 'M'
        })
      : null;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Etikett - ${article.batch_number || article.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      width: 100%;
      height: 100%;
      background: #f5f5f5;
      font-family: Arial, sans-serif;
    }
    
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    /* 80mm x 60mm = 302px x 227px @ 96 DPI */
    .label {
      width: 302px;
      height: 227px;
      background: white;
      border: 1px solid #ddd;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: row;
      overflow: hidden;
    }
    
    .qr-section {
      width: 120px;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      flex-shrink: 0;
      background: white;
    }
    
    .qr-section img {
      width: 110px;
      height: 110px;
      image-rendering: pixelated;
    }
    
    .content-section {
      flex: 1;
      padding: 6px 5px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      gap: 3px;
      overflow: hidden;
    }
    
    .batch {
      font-size: 9px;
      font-weight: bold;
      font-family: 'Courier New', monospace;
      line-height: 1.1;
      word-break: break-all;
      flex-shrink: 0;
    }
    
    .shelf {
      font-size: 18px;
      font-weight: bold;
      line-height: 1;
      word-break: break-word;
      order: 3;
      flex-shrink: 0;
      max-width: 100%;
    }
    
    .name {
      font-size: 7px;
      line-height: 1.1;
      word-break: break-word;
      max-height: 16px;
      overflow: hidden;
      flex-shrink: 0;
    }
    
    .sku {
      font-size: 7px;
      color: #666;
      line-height: 1.2;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .label {
        width: 302px;
        height: 227px;
        border: none;
        box-shadow: none;
        margin: 0;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="qr-section">
      ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code">` : ''}
    </div>
    <div class="content-section">
      <div class="batch">${article.batch_number || 'N/A'}</div>
      <div class="name">${article.name || ''}</div>
      <div class="shelf">${article.shelf_address && article.shelf_address.length ? (Array.isArray(article.shelf_address) ? article.shelf_address[0] : article.shelf_address) : 'N/A'}</div>
    </div>
  </div>
  
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 100);
    });
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});