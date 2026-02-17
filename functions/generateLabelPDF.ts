import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';
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

    // Create PDF 80x60mm at 96 DPI = 305x229 pixels -> scale to 1mm=3.78px
    const pxPerMm = 3.78;
    const widthPx = 80 * pxPerMm;   // 302px
    const heightPx = 60 * pxPerMm;  // 227px

    // Create HTML canvas
    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          width: ${widthPx}px;
          height: ${heightPx}px;
          display: flex;
          background: white;
          font-family: Arial, sans-serif;
        }
        .qr { 
          width: 95px;
          height: 95px;
          padding: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .qr img {
          width: 100%;
          height: 100%;
          image-rendering: pixelated;
        }
        .content {
          flex: 1;
          padding: 3px 4px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          overflow: hidden;
        }
        .batch {
          font-size: 11px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          line-height: 1;
          margin-bottom: 2px;
        }
        .shelf {
          font-size: 8px;
          font-weight: bold;
          line-height: 1;
          margin-bottom: 2px;
        }
        .name {
          font-size: 7px;
          line-height: 1;
          margin-bottom: 2px;
          word-break: break-word;
          max-height: 16px;
          overflow: hidden;
        }
        .sku {
          font-size: 6px;
          color: #333;
          line-height: 1;
        }
      </style>
    </head>
    <body>
      <div class="qr">
        <img src="QR_PLACEHOLDER" alt="QR">
      </div>
      <div class="content">
        <div class="batch">${article.batch_number || 'N/A'}</div>
        <div class="shelf">${article.shelf_address && article.shelf_address.length ? (Array.isArray(article.shelf_address) ? article.shelf_address[0] : article.shelf_address) : 'N/A'}</div>
        <div class="name">${article.name || ''}</div>
        <div class="sku">${article.sku ? `SKU: ${article.sku}` : ''}</div>
      </div>
    </body>
    </html>`;

    // Generate QR code
    const qrDataUrl = article.batch_number 
      ? await QRCode.toDataURL(article.batch_number, { 
          width: 200,
          margin: 0,
          errorCorrectionLevel: 'M'
        })
      : null;

    const finalHtml = html.replace('QR_PLACEHOLDER', qrDataUrl || '');

    // Convert HTML to PDF using jsPDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [80, 60],
      compress: false
    });

    // Add HTML to PDF at exact size
    await doc.html(finalHtml, {
      x: 0,
      y: 0,
      width: 80,
      height: 60,
      windowHeight: heightPx,
      windowWidth: widthPx,
    });

    const pdfBytes = doc.output('arraybuffer');
    
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="etikett_${article.batch_number || article.id.slice(0, 8)}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});