import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PDFDocument, rgb } from 'npm:pdf-lib@1.17.1';
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

    // Create PDF document (80mm x 60mm = 226 x 170 points)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([226, 170]);
    const { height } = page.getSize();

    // Generate QR code
    const qrDataUrl = article.batch_number 
      ? await QRCode.toDataURL(article.batch_number, { 
          width: 200,
          margin: 0,
          errorCorrectionLevel: 'M'
        })
      : null;

    if (qrDataUrl) {
      const qrImage = await pdfDoc.embedPng(qrDataUrl);
      // QR code on the left side
      page.drawImage(qrImage, {
        x: 10,
        y: height - 110,
        width: 100,
        height: 100,
      });
    }

    // Text on the right side
    const textX = 115;
    let currentY = height - 20;

    // Batch number - large and bold
    if (article.batch_number) {
      page.drawText(article.batch_number, {
        x: textX,
        y: currentY,
        size: 16,
        color: rgb(0, 0, 0),
        font: await pdfDoc.embedFont('Courier'),
      });
      currentY -= 25;
    }

    // Shelf address
    if (article.shelf_address) {
      const shelves = Array.isArray(article.shelf_address) 
        ? article.shelf_address[0] 
        : article.shelf_address;
      page.drawText(`Hylla: ${shelves}`, {
        x: textX,
        y: currentY,
        size: 10,
        color: rgb(0, 0, 0),
      });
      currentY -= 15;
    }

    // Article name
    if (article.name) {
      const nameLines = article.name.match(/.{1,20}/g) || [];
      for (const line of nameLines.slice(0, 2)) {
        page.drawText(line, {
          x: textX,
          y: currentY,
          size: 8,
          color: rgb(0, 0, 0),
        });
        currentY -= 10;
      }
    }

    // Category
    if (article.category) {
      page.drawText(`Typ: ${article.category}`, {
        x: textX,
        y: currentY,
        size: 7,
        color: rgb(80, 80, 80),
      });
      currentY -= 10;
    }

    // SKU
    if (article.sku) {
      page.drawText(`SKU: ${article.sku}`, {
        x: textX,
        y: currentY,
        size: 7,
        color: rgb(80, 80, 80),
      });
    }

    const pdfBytes = await pdfDoc.save();
    
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