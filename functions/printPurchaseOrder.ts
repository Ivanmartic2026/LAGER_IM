import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { purchaseOrderId } = await req.json();

    if (!purchaseOrderId) {
      return Response.json({ error: 'Purchase Order ID required' }, { status: 400 });
    }

    const [po] = await base44.asServiceRole.entities.PurchaseOrder.filter({ id: purchaseOrderId });
    
    if (!po) {
      return Response.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    const items = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ 
      purchase_order_id: purchaseOrderId 
    });

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    let y = height - 40;
    
    // Header
    page.drawText('INKÖPSORDER', {
      x: 40,
      y: y,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    y -= 30;
    
    page.drawText(`Ordernummer: ${po.po_number || po.id.slice(0, 8)}`, {
      x: 40,
      y: y,
      size: 10,
      font: font
    });
    y -= 15;
    
    page.drawText(`Datum: ${new Date(po.order_date || po.created_date).toLocaleDateString('sv-SE')}`, {
      x: 40,
      y: y,
      size: 10,
      font: font
    });
    y -= 30;
    
    // Supplier info
    page.drawText('Leverantör:', {
      x: 40,
      y: y,
      size: 12,
      font: boldFont
    });
    y -= 15;
    
    page.drawText(po.supplier_name, {
      x: 40,
      y: y,
      size: 10,
      font: font
    });
    y -= 15;
    
    if (po.expected_delivery_date) {
      page.drawText(`Önskat leveransdatum: ${new Date(po.expected_delivery_date).toLocaleDateString('sv-SE')}`, {
        x: 40,
        y: y,
        size: 10,
        font: font
      });
      y -= 30;
    } else {
      y -= 15;
    }

    // Items table header
    page.drawText('Artikel', { x: 40, y: y, size: 10, font: boldFont });
    page.drawText('Batch', { x: 220, y: y, size: 10, font: boldFont });
    page.drawText('Antal', { x: 340, y: y, size: 10, font: boldFont });
    page.drawText('Pris', { x: 400, y: y, size: 10, font: boldFont });
    page.drawText('Summa', { x: 480, y: y, size: 10, font: boldFont });
    
    y -= 5;
    page.drawLine({
      start: { x: 40, y: y },
      end: { x: 555, y: y },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    y -= 15;

    // Items
    let totalCost = 0;

    for (const item of items) {
      if (y < 80) {
        page = pdfDoc.addPage([595, 842]);
        y = height - 40;
      }

      const itemTotal = item.quantity_ordered * (item.unit_price || 0);
      totalCost += itemTotal;

      const articleName = item.article_name || 'N/A';
      const maxWidth = 170;
      const wrappedText = articleName.length > 30 ? articleName.substring(0, 27) + '...' : articleName;

      page.drawText(wrappedText, { x: 40, y: y, size: 10, font: font });
      page.drawText(item.article_batch_number || '-', { x: 220, y: y, size: 10, font: font });
      page.drawText(String(item.quantity_ordered), { x: 340, y: y, size: 10, font: font });
      page.drawText(`${(item.unit_price || 0).toLocaleString('sv-SE')} kr`, { x: 400, y: y, size: 10, font: font });
      page.drawText(`${itemTotal.toLocaleString('sv-SE')} kr`, { x: 480, y: y, size: 10, font: font });
      
      y -= 18;
    }

    // Total
    y -= 5;
    page.drawLine({
      start: { x: 40, y: y },
      end: { x: 555, y: y },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    y -= 20;
    
    page.drawText('Totalt:', { x: 400, y: y, size: 12, font: boldFont });
    page.drawText(`${totalCost.toLocaleString('sv-SE')} kr`, { x: 480, y: y, size: 12, font: boldFont });

    // Notes
    if (po.notes) {
      y -= 30;
      if (y < 80) {
        page = pdfDoc.addPage([595, 842]);
        y = height - 40;
      }
      page.drawText('Anteckningar:', { x: 40, y: y, size: 10, font: boldFont });
      y -= 15;
      page.drawText(po.notes, { x: 40, y: y, size: 10, font: font, maxWidth: 515 });
    }

    // Footer on all pages
    const pages = pdfDoc.getPages();
    const pageCount = pages.length;
    pages.forEach((p, index) => {
      p.drawText(
        `Genererad: ${new Date().toLocaleString('sv-SE')} | Sida ${index + 1} av ${pageCount}`,
        {
          x: width / 2 - 100,
          y: 20,
          size: 8,
          font: font,
          color: rgb(0.5, 0.5, 0.5)
        }
      );
    });

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=bestallning_${Date.now()}.pdf`
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});