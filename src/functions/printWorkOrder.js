// deno-lint-ignore-file no-undef
import { jsPDF } from 'npm:jspdf@4.0.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
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
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPos = margin;

    // Fill entire page with black background
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header: Title and Subtitle
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('ARBETSORDER', margin, yPos);
    
    yPos += 6;
    doc.setFontSize(11);
    doc.setTextColor(180, 180, 180);
    doc.setFont(undefined, 'normal');
    const titleText = `${wo.customer_name || ''} ${wo.order_number || ''}`.trim();
    doc.text(titleText, margin, yPos);
    
    yPos += 4;
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 130);
    const now = new Date();
    const dateStr = now.toLocaleDateString('sv-SE') + ' ' + now.toLocaleTimeString('sv-SE');
    doc.text(`Utskriven: ${dateStr}`, margin, yPos);
    
    yPos += 10;

    // Info grid: 3 columns x 2 rows
    const colWidth = contentWidth / 3;
    const gridItems = [
      { label: 'Kund', value: wo.customer_name || '—' },
      { label: 'Status / Fas', value: wo.current_stage || '—' },
      { label: 'Prioritet', value: wo.priority || 'normal' },
      { label: 'Ordernummer', value: wo.order_number || '—' },
      { label: 'Leveransdatum', value: wo.delivery_date || '—' },
      { label: 'Kundref', value: orderData.customer_reference || '?' }
    ];

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(200, 200, 200);
    
    // Row 1
    for (let i = 0; i < 3; i++) {
      doc.text(gridItems[i].label, margin + (i * colWidth), yPos);
    }
    
    yPos += 4;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    
    for (let i = 0; i < 3; i++) {
      doc.text(gridItems[i].value, margin + (i * colWidth), yPos);
    }
    
    yPos += 7;
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(200, 200, 200);
    
    // Row 2
    for (let i = 3; i < 6; i++) {
      doc.text(gridItems[i].label, margin + ((i - 3) * colWidth), yPos);
    }
    
    yPos += 4;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    
    for (let i = 3; i < 6; i++) {
      doc.text(gridItems[i].value, margin + ((i - 3) * colWidth), yPos);
    }

    yPos += 12;

    // Section header function
    const addSection = (title) => {
      doc.setFillColor(50, 50, 50);
      doc.rect(margin, yPos - 3, contentWidth, 6, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin + 2, yPos + 1.5);
      
      yPos += 10;
    };

    const addField = (label, value) => {
      doc.setFont(undefined, 'bold');
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(8);
      doc.text(label + ':', margin, yPos);
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(220, 220, 220);
      doc.setFontSize(9);
      const labelWidth = 45;
      const maxWidth = contentWidth - labelWidth;
      const lines = doc.splitTextToSize(String(value || '—'), maxWidth);
      
      lines.forEach((line, idx) => {
        doc.text(line, margin + labelWidth, yPos + (idx * 3.5));
      });
      
      yPos += (lines.length * 3.5) + 2;
    };

    // Order Information section
    addSection('ORDERINFORMATION');
    addField('Kund', wo.customer_name);
    addField('Fortnox kundnr', orderData.fortnox_customer_number || '—');
    addField('Leveransadress', orderData.delivery_address || '—');
    addField('Fortnox Projekt', orderData.fortnox_project_number || '—');

    yPos += 3;

    // Work Order Details section
    addSection('ARBETSORDER DETALJER');
    addField('Arbetsorder', wo.name || wo.order_number || '—');
    addField('Status', wo.status || '—');
    addField('Fas', wo.current_stage || '—');
    addField('Prioritet', wo.priority || '—');
    addField('Produktionsstatus', wo.production_status || '—');

    yPos += 5;

    // Articles/Materials section
    if (orderItems && orderItems.length > 0) {
      addSection('ARTIKLAR / MATERIALLISTA');

      // Table header
      doc.setFillColor(60, 60, 60);
      doc.rect(margin, yPos - 3, contentWidth, 6, 'F');
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      
      const cols = {
        artikel: margin + 1,
        batch: margin + 85,
        hylla: margin + 145,
        best: margin + 180,
        plockat: margin + 210
      };

      doc.text('Artikel', cols.artikel, yPos + 1.5);
      doc.text('Batch', cols.batch, yPos + 1.5);
      doc.text('Hylla', cols.hylla, yPos + 1.5);
      doc.text('Best.', cols.best, yPos + 1.5);
      doc.text('Plockat', cols.plockat, yPos + 1.5);
      
      yPos += 8;

      // Table rows
      doc.setFont(undefined, 'normal');
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(8);

      orderItems.forEach((item, idx) => {
        if (yPos > pageHeight - 25) {
          doc.addPage();
          doc.setFillColor(15, 15, 15);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          yPos = margin;
        }

        const picked = item.quantity_picked || 0;
        const ordered = item.quantity_ordered || 0;
        
        // Alternate row background
        if (idx % 2 === 0) {
          doc.setFillColor(25, 25, 25);
          doc.rect(margin, yPos - 2, contentWidth, 4.5, 'F');
        }

        doc.setTextColor(200, 200, 200);
        const articleName = (item.article_name || '—').substring(0, 40);
        doc.text(articleName, cols.artikel, yPos);
        doc.text(item.article_batch_number || '—', cols.batch, yPos);
        doc.text(item.shelf_address || '—', cols.hylla, yPos);
        doc.text(String(ordered), cols.best, yPos);
        
        // Highlight if picked
        if (picked === ordered && ordered > 0) {
          doc.setTextColor(120, 200, 120);
        }
        doc.text(String(picked), cols.plockat, yPos);

        yPos += 4.5;
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
    doc.setFontSize(7);
    doc.text('IMvision - Arbetsorder', margin, pageHeight - 8);
    doc.text('Sida 1 av 1', pageWidth - margin, pageHeight - 8, { align: 'right' });

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