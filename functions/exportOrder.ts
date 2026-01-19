import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const { orderId, email } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'Order ID required' }, { status: 400 });
    }

    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get order details using direct ID lookup
    let order;
    try {
      const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
      if (!orders || orders.length === 0) {
        return Response.json({ error: 'Order not found' }, { status: 404 });
      }
      order = orders[0];
    } catch (error) {
      console.error('Error fetching order:', error);
      return Response.json({ error: `Order fetch failed: ${error.message}` }, { status: 500 });
    }

    // Get order items
    const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ order_id: orderId });

    // Create PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('PLOCKKVITTO', margin, 25);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    const orderNumber = order.order_number || `Order #${order.id.slice(0, 8)}`;
    doc.text(orderNumber, margin, 35);

    doc.setTextColor(0, 0, 0);

    let y = 65;

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
        doc.text(`${label}:`, margin + 5, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), margin + 50, y);
        y += 8;
      }
    };

    addField('Kund', order.customer_name);
    addField('Kundreferens', order.customer_reference);
    addField('Leveransdatum', order.delivery_date);
    
    if (order.delivery_address) {
      doc.setFont('helvetica', 'bold');
      doc.text('Leveransadress:', margin + 5, y);
      doc.setFont('helvetica', 'normal');
      const addressLines = doc.splitTextToSize(
        order.delivery_address, 
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

    y += 5;

    // Items Section
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 10, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Plockade artiklar', margin + 3, y + 7);
    
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
    doc.text('Antal', margin + 160, y);

    y += 8;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    let totalItems = 0;

    for (const item of orderItems) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const name = item.article_name || '';
      const nameLines = doc.splitTextToSize(name, 70);
      
      doc.text(nameLines[0], margin + 3, y);
      doc.text(item.article_batch_number || '-', margin + 80, y);
      doc.text(item.shelf_address || '-', margin + 120, y);
      doc.text(String(item.quantity_picked || 0), margin + 160, y);

      totalItems += item.quantity_picked || 0;
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
    doc.text('Totalt antal artiklar:', margin + 3, y);
    doc.text(String(totalItems), margin + 160, y);

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
      
      const notesLines = doc.splitTextToSize(order.notes, contentWidth - 10);
      doc.text(notesLines, margin + 5, y);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const footerLeft = `Genererad: ${new Date().toLocaleString('sv-SE')}`;
    doc.text(footerLeft, margin, 285);

    // Generate PDF
    const pdfBytes = doc.output('arraybuffer');

    // If email is provided, upload PDF and send email with link
    if (email) {
      try {
        // Upload PDF
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const pdfFile = new File([pdfBlob], `order_${order.order_number || orderId}.pdf`, { type: 'application/pdf' });
        
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ 
          file: pdfFile 
        });
        
        const totalItems = orderItems.reduce((sum, item) => sum + (item.quantity_picked || 0), 0);
        
        const emailBody = `
          <h2>Plockkvitto för order ${order.order_number || orderId}</h2>
          <p><strong>Kund:</strong> ${order.customer_name || '-'}</p>
          <p><strong>Antal artiklar:</strong> ${totalItems}</p>
          <br>
          <p><a href="${file_url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ladda ner plockkvitto (PDF)</a></p>
          <br>
          <p>Med vänlig hälsning</p>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `Plockkvitto - ${order.order_number || orderId}`,
          body: emailBody
        });
        
        return Response.json({ 
          success: true, 
          message: 'Email skickad!' 
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        return Response.json({ 
          error: `Kunde inte skicka email: ${emailError.message}` 
        }, { status: 500 });
      }
    }

    // Otherwise return PDF for download
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=order_${order.order_number || orderId}_${Date.now()}.pdf`
      }
    });

  } catch (error) {
    console.error('Error generating order PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});