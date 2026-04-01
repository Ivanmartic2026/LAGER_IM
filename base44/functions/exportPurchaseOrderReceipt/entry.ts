import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const { purchaseOrderId } = await req.json();

    if (!purchaseOrderId) {
      return Response.json({ error: 'Purchase Order ID required' }, { status: 400 });
    }

    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get PO details
    const pos = await base44.asServiceRole.entities.PurchaseOrder.filter({ id: purchaseOrderId });
    
    if (!pos || pos.length === 0) {
      return Response.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    const po = pos[0];

    // Get PO items
    const poItems = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ purchase_order_id: purchaseOrderId });

    // Create PDF with UTF-8 support for Swedish characters
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    // Ensure proper UTF-8 font support for Swedish characters (ÄÖÅ äöå)
    doc.setFont('helvetica', 'normal');

    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('MOTTAGNINGSKVITTO', margin, 25);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    const poNumber = po.po_number || `PO #${po.id.slice(0, 8)}`;
    doc.text(poNumber, margin, 35);

    doc.setTextColor(0, 0, 0);

    let y = 65;

    // PO Info Section
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 10, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Orderinformation', margin + 3, y + 7);
    
    y += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const addField = (label, value) => {
      if (value !== null && value !== undefined && value !== '') {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, margin + 5, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), margin + 60, y);
        y += 8;
      }
    };

    addField('Leverantör', po.supplier_name);
    addField('Orderdatum', po.order_date);
    addField('Förväntat datum', po.expected_delivery_date);
    addField('Mottagen av', po.received_by);
    if (po.received_date) {
      const receivedDate = new Date(po.received_date).toLocaleString('sv-SE');
      addField('Mottagningsdatum', receivedDate);
    }

    y += 5;

    // Items Section
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 10, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Mottagna artiklar', margin + 3, y + 7);
    
    y += 15;

    // Table header
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y - 5, contentWidth, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Artikel', margin + 3, y);
    doc.text('Batch', margin + 70, y);
    doc.text('Beställt', margin + 115, y);
    doc.text('Mottaget', margin + 145, y);

    y += 8;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    let totalOrdered = 0;
    let totalReceived = 0;

    for (const item of poItems) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const name = item.article_name || '';
      const nameLines = doc.splitTextToSize(name, 60);
      
      doc.text(nameLines[0], margin + 3, y);
      doc.text(item.article_batch_number || '-', margin + 70, y);
      doc.text(String(item.quantity_ordered || 0), margin + 115, y);
      doc.text(String(item.quantity_received || 0), margin + 145, y);

      totalOrdered += item.quantity_ordered || 0;
      totalReceived += item.quantity_received || 0;
      y += 7;

      if (nameLines.length > 1) {
        for (let i = 1; i < nameLines.length; i++) {
          doc.text(nameLines[i], margin + 3, y);
          y += 5;
        }
      }
    }

    // Total
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, margin + contentWidth, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Totalt:', margin + 3, y);
    doc.text(String(totalOrdered), margin + 115, y);
    doc.text(String(totalReceived), margin + 145, y);

    // Cost summary
    if (po.total_cost) {
      y += 10;
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Total kostnad', margin + 3, y + 7);
      doc.text(`${po.total_cost.toLocaleString('sv-SE')} kr`, margin + contentWidth - 3, y + 7, { align: 'right' });
    }

    // Notes
    if (po.notes) {
      y += 15;
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Anteckningar', margin + 3, y + 7);

      y += 15;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const notesLines = doc.splitTextToSize(po.notes, contentWidth - 10);
      doc.text(notesLines, margin + 5, y);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const footerLeft = `Genererad: ${new Date().toLocaleString('sv-SE')}`;
    doc.text(footerLeft, margin, 285);

    // Generate PDF
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=po_receipt_${po.po_number || purchaseOrderId}_${Date.now()}.pdf`
      }
    });

  } catch (error) {
    console.error('Error generating PO receipt:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});