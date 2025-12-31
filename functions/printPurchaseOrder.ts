import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

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

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('INKÖPSORDER', 20, 20);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Ordernummer: ${po.po_number || po.id.slice(0, 8)}`, 20, 30);
    doc.text(`Datum: ${new Date(po.order_date || po.created_date).toLocaleDateString('sv-SE')}`, 20, 36);
    
    // Supplier info
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Leverantör:', 20, 50);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(po.supplier_name, 20, 56);
    
    if (po.expected_delivery_date) {
      doc.text(`Önskat leveransdatum: ${new Date(po.expected_delivery_date).toLocaleDateString('sv-SE')}`, 20, 62);
    }

    // Items table header
    let y = 80;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Artikel', 20, y);
    doc.text('Batch', 90, y);
    doc.text('Antal', 130, y);
    doc.text('Pris', 155, y);
    doc.text('Summa', 180, y);
    
    doc.line(20, y + 2, 200, y + 2);
    y += 8;

    // Items
    doc.setFont(undefined, 'normal');
    let totalCost = 0;

    for (const item of items) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const itemTotal = item.quantity_ordered * (item.unit_price || 0);
      totalCost += itemTotal;

      doc.text(item.article_name || 'N/A', 20, y, { maxWidth: 65 });
      doc.text(item.article_batch_number || '-', 90, y);
      doc.text(String(item.quantity_ordered), 130, y);
      doc.text(`${(item.unit_price || 0).toLocaleString('sv-SE')} kr`, 155, y);
      doc.text(`${itemTotal.toLocaleString('sv-SE')} kr`, 180, y);
      
      y += 8;
    }

    // Total
    doc.line(20, y, 200, y);
    y += 8;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Totalt:', 155, y);
    doc.text(`${totalCost.toLocaleString('sv-SE')} kr`, 180, y);

    // Notes
    if (po.notes) {
      y += 15;
      doc.setFontSize(10);
      doc.text('Anteckningar:', 20, y);
      doc.setFont(undefined, 'normal');
      y += 6;
      const splitNotes = doc.splitTextToSize(po.notes, 170);
      doc.text(splitNotes, 20, y);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(
        `Genererad: ${new Date().toLocaleString('sv-SE')} | Sida ${i} av ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=inkopsorder_${po.po_number || po.id.slice(0, 8)}.pdf`
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});