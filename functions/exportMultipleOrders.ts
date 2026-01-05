import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const { orderIds } = await req.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return Response.json({ error: 'Order IDs array required' }, { status: 400 });
    }

    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create combined PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    let isFirstOrder = true;

    // Loop through all orders
    for (const orderId of orderIds) {
      // Get order details
      const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
      if (!orders || orders.length === 0) {
        console.warn(`Order ${orderId} not found, skipping`);
        continue;
      }
      const order = orders[0];

      // Get order items
      const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ order_id: orderId });

      // Add new page for each order except the first
      if (!isFirstOrder) {
        doc.addPage();
      }
      isFirstOrder = false;

      let y = 20;

      // Header
      doc.setFillColor(30, 41, 59);
      doc.rect(0, y - 20, pageWidth, 50, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('PLOCKKVITTO', margin, y + 5);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      const orderNumber = order.order_number || `Order #${order.id.slice(0, 8)}`;
      doc.text(decodeURIComponent(escape(orderNumber)), margin, y + 15);

      doc.setTextColor(0, 0, 0);

      y = 65;

      // Order Info Section
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
          const encodedLabel = decodeURIComponent(escape(`${label}:`));
          doc.text(encodedLabel, margin + 5, y);
          doc.setFont('helvetica', 'normal');
          const encodedValue = decodeURIComponent(escape(String(value)));
          doc.text(encodedValue, margin + 50, y);
          y += 8;
        }
      };

      addField('Kund', order.customer_name);
      addField('Kundreferens', order.customer_reference);
      addField('Leveransdatum', order.delivery_date);
      
      if (order.delivery_address) {
        doc.setFont('helvetica', 'bold');
        doc.text(decodeURIComponent(escape('Leveransadress:')), margin + 5, y);
        doc.setFont('helvetica', 'normal');
        const addressLines = doc.splitTextToSize(
          decodeURIComponent(escape(order.delivery_address)), 
          contentWidth - 55
        );
        doc.text(addressLines, margin + 50, y);
        y += addressLines.length * 5 + 3;
      }

      addField('Plockad av', order.picked_by);
      if (order.picked_date) {
        const pickedDate = new Date(order.picked_date).toLocaleString('sv-SE');
        addField('Plockdatum', pickedDate);
      }

      // Status
      const statusLabels = {
        draft: "Utkast",
        ready_to_pick: "Redo att plocka",
        picking: "Plockar",
        picked: "Plockad",
        delivered: "Levererad",
        cancelled: "Avbruten"
      };
      addField('Status', statusLabels[order.status] || order.status);

      y += 5;

      // Items Section
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Artiklar', margin + 3, y + 7);
      
      y += 15;

      // Table header
      doc.setFillColor(226, 232, 240);
      doc.rect(margin, y - 5, contentWidth, 8, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Artikel', margin + 3, y);
      doc.text('Batch', margin + 80, y);
      doc.text('Hylla', margin + 120, y);
      doc.text('Best/Plock', margin + 155, y);

      y += 8;

      // Table rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      let totalOrdered = 0;
      let totalPicked = 0;

      for (const item of orderItems) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        const name = decodeURIComponent(escape(item.article_name || ''));
        const nameLines = doc.splitTextToSize(name, 70);
        
        doc.text(nameLines[0], margin + 3, y);
        doc.text(item.article_batch_number || '-', margin + 80, y);
        doc.text(item.shelf_address || '-', margin + 120, y);
        doc.text(`${item.quantity_ordered || 0}/${item.quantity_picked || 0}`, margin + 160, y);

        totalOrdered += item.quantity_ordered || 0;
        totalPicked += item.quantity_picked || 0;
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
      doc.text(`${totalOrdered}/${totalPicked}`, margin + 160, y);

      // Notes
      if (order.notes) {
        y += 10;
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
        
        const encodedNotes = decodeURIComponent(escape(order.notes));
        const notesLines = doc.splitTextToSize(encodedNotes, contentWidth - 10);
        doc.text(notesLines, margin + 5, y);
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const footerLeft = decodeURIComponent(escape(`Genererad: ${new Date().toLocaleString('sv-SE')}`));
      doc.text(footerLeft, margin, 285);
    }

    // Generate PDF
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=orders_batch_${Date.now()}.pdf`
      }
    });

  } catch (error) {
    console.error('Error generating multiple orders PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});