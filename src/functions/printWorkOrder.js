import { jsPDF } from 'npm:jspdf@4.0.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// @ts-ignore - Deno global
const { serve } = Deno;

serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { work_order_id } = await req.json();

    const workOrder = await base44.asServiceRole.entities.WorkOrder.filter({ id: work_order_id });
    if (!workOrder || workOrder.length === 0) {
      return Response.json({ error: 'Work order not found' }, { status: 404 });
    }

    const wo = workOrder[0];
    const order = await base44.asServiceRole.entities.Order.filter({ id: wo.order_id });
    const orderData = order[0] || {};
    const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ order_id: wo.order_id });

    const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPos = margin;

    // Fill entire page with black background
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header section
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text('ARBETSORDER', margin, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont(undefined, 'normal');
    doc.text(`Utskriven: ${new Date().toLocaleString('sv-SE')}`, margin, yPos);
    
    yPos += 2;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    const titleText = `${wo.customer_name || ''} ${wo.order_number || ''}`.trim();
    doc.text(titleText, margin, yPos);
    
    yPos += 15;

    // Horizontal line
    doc.setDrawColor(100, 100, 100);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Top info grid
    doc.setFontSize(9);
    const gridY = yPos;
    const colWidth = contentWidth / 3;

    const gridData = [
      { label: 'Kund', value: wo.customer_name || '-' },
      { label: 'Status / Fas', value: wo.current_stage || '-' },
      { label: 'Prioritet', value: wo.priority || 'normal' },
      { label: 'Ordernummer', value: wo.order_number || '-' },
      { label: 'Leveransdatum', value: wo.delivery_date || '-' },
      { label: 'Kundref', value: orderData.customer_reference || '?' }
    ];

    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    
    for (let i = 0; i < 3; i++) {
      doc.text(gridData[i].label, margin + (i * colWidth), gridY);
    }

    doc.setFont(undefined, 'normal');
    doc.setTextColor(220, 220, 220);
    
    for (let i = 0; i < 3; i++) {
      doc.text(gridData[i].value, margin + (i * colWidth), gridY + 5);
    }

    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    
    for (let i = 3; i < 6; i++) {
      doc.text(gridData[i].label, margin + ((i - 3) * colWidth), gridY + 12);
    }

    doc.setFont(undefined, 'normal');
    doc.setTextColor(220, 220, 220);
    
    for (let i = 3; i < 6; i++) {
      doc.text(gridData[i].value, margin + ((i - 3) * colWidth), gridY + 17);
    }

    yPos = gridY + 28;

    // Section function
    const addSection = (title) => {
      doc.setFillColor(45, 45, 45);
      doc.rect(margin, yPos - 4, contentWidth, 7, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin + 3, yPos + 1);
      
      yPos += 12;
    };

    const addField = (label, value) => {
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(label + ':', margin, yPos);
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(200, 200, 200);
      const labelWidth = 50;
      const maxWidth = contentWidth - labelWidth;
      const lines = doc.splitTextToSize(String(value || '-'), maxWidth);
      
      lines.forEach((line, idx) => {
        doc.text(line, margin + labelWidth, yPos + (idx * 4));
      });
      
      yPos += (lines.length * 4) + 2;
    };

    // Order Information section
    addSection('ORDERINFORMATION');
    addField('Kund', wo.customer_name);
    addField('Fortnox kundnr', orderData.fortnox_customer_number);
    addField('Leveransadress', orderData.delivery_address);
    addField('Fortnox Projekt', orderData.fortnox_project_number);

    yPos += 3;

    // Work Order Details section
    addSection('ARBETSORDER DETALJER');
    addField('Arbetsorder', wo.name || wo.order_number);
    addField('Status', wo.status);
    addField('Fas', wo.current_stage);
    addField('Prioritet', wo.priority);
    addField('Produktionsstatus', wo.production_status);

    yPos += 5;

    // Articles section
    if (orderItems && orderItems.length > 0) {
      addSection('ARTIKLAR / MATERIALLISTA');

      // Table headers
      doc.setFillColor(55, 55, 55);
      doc.rect(margin, yPos - 4, contentWidth, 6, 'F');
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      
      const cols = {
        artikel: margin + 2,
        batch: margin + 90,
        hylla: margin + 140,
        best: margin + 170,
        plockat: margin + 200
      };

      doc.text('Artikel', cols.artikel, yPos + 1);
      doc.text('Batch', cols.batch, yPos + 1);
      doc.text('Hylla', cols.hylla, yPos + 1);
      doc.text('Best.', cols.best, yPos + 1);
      doc.text('Plockat', cols.plockat, yPos + 1);
      
      yPos += 8;

      // Table rows
      doc.setFont(undefined, 'normal');
      doc.setTextColor(200, 200, 200);

      orderItems.forEach(item => {
        const picked = item.quantity_picked || 0;
        const ordered = item.quantity_ordered || 0;

        doc.text(item.article_name || '-', cols.artikel, yPos);
        doc.text(item.article_batch_number || '-', cols.batch, yPos);
        doc.text(item.shelf_address || '-', cols.hylla, yPos);
        doc.text(String(ordered), cols.best, yPos);
        
        if (picked === ordered && ordered > 0) {
          doc.setTextColor(100, 200, 100);
        }
        doc.text(String(picked), cols.plockat, yPos);
        doc.setTextColor(200, 200, 200);

        yPos += 5;
      });
    }

    yPos += 5;

    // Production notes if exists
    if (wo.production_notes) {
      addSection('PRODUKTIONSANTECKNINGAR');
      addField('Anteckningar', wo.production_notes);
    }

    // Footer
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text('IMvision - Arbetsorder', margin, pageHeight - 10);
    doc.text('Sida 1 av 1', pageWidth - margin, pageHeight - 10, { align: 'right' });

    const pdf = doc.output('arraybuffer');
    
    return new Response(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="arbetsorder_${wo.order_number || wo.id.slice(0, 8)}.pdf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});