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

    // Create PDF - 80mm x 60mm
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [80, 60]
    });

    // Generate QR code as data URL
    const qrDataUrl = article.batch_number 
      ? await QRCode.toDataURL(article.batch_number, { 
          width: 300,
          margin: 1,
          errorCorrectionLevel: 'M'
        })
      : null;

    // Left side - QR code
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 2, 5, 25, 25);
    }

    // Right side - text
    let y = 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    
    if (article.batch_number) {
      doc.text(article.batch_number, 32, y);
      y += 8;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (article.shelf_address) {
      const shelves = Array.isArray(article.shelf_address) 
        ? article.shelf_address[0] 
        : article.shelf_address;
      doc.text(`Hylla: ${shelves}`, 32, y);
      y += 6;
    }

    doc.setFontSize(8);
    if (article.name) {
      const splitName = doc.splitTextToSize(article.name, 40);
      doc.text(splitName.slice(0, 2), 32, y);
      y += 10;
    }

    if (article.sku) {
      doc.text(`SKU: ${article.sku}`, 32, y);
      y += 5;
    }

    if (article.category) {
      doc.text(`Typ: ${article.category}`, 32, y);
    }

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