import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Build compact HTML - 40mm x 30mm (no QR code)
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
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .label {
      width: 100%;
      height: 100%;
      background: white;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      justify-content: center;
      align-items: center;
      text-align: center;
      gap: 2px;
    }
    .batch {
      font-size: 11px;
      font-weight: 700;
      color: #000;
      font-family: 'Courier New', monospace;
      line-height: 1.1;
      word-break: break-all;
      max-width: 100%;
    }
    .name {
      font-size: 8px;
      font-weight: 600;
      color: #333;
      font-family: Arial, sans-serif;
      line-height: 1.1;
      word-break: break-all;
      max-width: 100%;
    }
    .shelf {
      font-size: 10px;
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
      <div class="batch">${article.batch_number || 'N/A'}</div>
      <div class="name">${article.name || '-'}</div>
      <div class="shelf">${article.shelf_address && article.shelf_address.length > 0 ? (Array.isArray(article.shelf_address) ? article.shelf_address[0] : article.shelf_address) : '-'}</div>
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