// deno-lint-ignore-file no-undef
import { jsPDF } from 'npm:jspdf@4.0.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// deno-lint-ignore no-undef
const serve = globalThis.Deno?.serve || (() => {});
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
    const margin = 12;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPos = margin;

    // Black background
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // === HEADER ===
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('ARBETSORDER', margin, yPos);
    
    yPos += 5;
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'normal');
    const now = new Date();
    const dateStr = now.toLocaleDateString('sv-SE') + ' ' + now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    doc.text('Utskriven: ' + dateStr, margin, yPos);
    
    yPos += 5;
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    const headerText = (wo.customer_name || '') + ' ' + (wo.order_number || '');
    const splitHeader = doc.splitTextToSize(headerText.trim(), contentWidth);
    doc.text(splitHeader, margin, yPos);
    yPos += (splitHeader.length * 4);
    
    yPos += 6;

    // === INFO GRID (3 columns, 2 rows) ===
    doc.setFontSize(8);
    const colWidth = contentWidth / 3;
    const gridX = [margin, margin + colWidth, margin + colWidth * 2];
    const gridData = [
      { label: 'Kund', value: wo.customer_name || '—' },
      { label: 'Status / Fas', value: wo.current_stage || '—' },
      { label: 'Prioritet', value: wo.priority || 'normal' },
      { label: 'Ordernummer', value: wo.order_number || '—' },
      { label: 'Leveransdatum', value: wo.delivery_date || '—' },
      { label: 'Kundref', value: orderData.customer_reference || '?' }
    ];

    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    
    for (let i = 0; i < 3; i++) {
      doc.text(gridData[i].label, gridX[i], yPos);
    }
    
    yPos += 3.5;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    
    for (let i = 0; i < 3; i++) {
      const val = String(gridData[i].value).substring(0, 30);
      doc.text(val, gridX[i], yPos);
    }
    
    yPos += 6;
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    
    for (let i = 3; i < 6; i++) {
      doc.text(gridData[i].label, gridX[i - 3], yPos);
    }
    
    yPos += 3.5;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    
    for (let i = 3; i < 6; i++) {
      const val = String(gridData[i].value).substring(0, 30);
      doc.text(val, gridX[i - 3], yPos);
    }

    yPos += 10;

    // === SECTION HELPER ===
    const addSection = (title) => {
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, yPos - 3, contentWidth, 5.5, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin + 2, yPos + 1);
      
      yPos += 9;
    };

    const addField = (label, value) => {
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(label + ':', margin, yPos);
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      const labelWidth = 42;
      const maxWidth = contentWidth - labelWidth;
      const valStr = String(value || '—');
      const lines = doc.splitTextToSize(valStr, maxWidth);
      
      lines.forEach((line, idx) => {
        doc.text(line, margin + labelWidth, yPos + (idx * 3.2));
      });
      
      yPos += (lines.length * 3.2) + 1.5;
    };

    // === ORDERINFORMATION ===
    addSection('ORDERINFORMATION');
    addField('Kund', wo.customer_name);
    addField('Fortnox kundnr', orderData.fortnox_customer_number || '—');
    addField('Leveransadress', orderData.delivery_address || '—');
    addField('Fortnox Projekt', orderData.fortnox_project_number || '—');

    yPos += 2;

    // === ARBETSORDER DETALJER ===
    addSection('ARBETSORDER DETALJER');
    addField('Arbetsorder', wo.name || wo.order_number || '—');
    addField('Status', wo.status || '—');
    addField('Fas', wo.current_stage || '—');
    addField('Prioritet', wo.priority || '—');
    addField('Produktionsstatus', wo.production_status || '—');

    yPos += 3;

    // === ARTIKLAR / MATERIALLISTA ===
    if (orderItems && orderItems.length > 0) {
      // Check if we need a new page
      if (yPos > pageHeight - 50) {
      doc.addPage();
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      yPos = margin;
      }

      addSection('ARTIKLAR / MATERIALLISTA');

      // Table header
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, yPos - 3, contentWidth, 5, 'F');
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      
      const colX = {
        artikel: margin + 1,
        batch: margin + 80,
        hylla: margin + 138,
        best: margin + 170,
        plockat: margin + 200
      };

      doc.text('Artikel', colX.artikel, yPos + 1);
      doc.text('Batch', colX.batch, yPos + 1);
      doc.text('Hylla', colX.hylla, yPos + 1);
      doc.text('Best.', colX.best, yPos + 1);
      doc.text('Plockat', colX.plockat, yPos + 1);
      
      yPos += 7;

      // Table rows
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);

      orderItems.forEach((item, idx) => {
        if (yPos > pageHeight - 12) {
          doc.addPage();
          doc.setFillColor(15, 15, 15);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          yPos = margin;
          
          // Repeat header on new page
          doc.setFillColor(0, 0, 0);
          doc.rect(margin, yPos - 3, contentWidth, 5, 'F');
          doc.setFont(undefined, 'bold');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.text('Artikel', colX.artikel, yPos + 1);
          doc.text('Batch', colX.batch, yPos + 1);
          doc.text('Hylla', colX.hylla, yPos + 1);
          doc.text('Best.', colX.best, yPos + 1);
          doc.text('Plockat', colX.plockat, yPos + 1);
          yPos += 7;
          doc.setFont(undefined, 'normal');
          doc.setFontSize(8);
        }

        // Alternate row background
        if (idx % 2 === 1) {
          doc.setFillColor(0, 0, 0);
          doc.rect(margin, yPos - 3, contentWidth, 4, 'F');
        }

        const picked = item.quantity_picked || 0;
        const ordered = item.quantity_ordered || 0;
        
        doc.setTextColor(255, 255, 255);
        const articleName = (item.article_name || '—').substring(0, 38);
        doc.text(articleName, colX.artikel, yPos);
        doc.text((item.article_batch_number || '—').substring(0, 22), colX.batch, yPos);
        doc.text((item.shelf_address || '—').substring(0, 12), colX.hylla, yPos);
        doc.text(String(ordered), colX.best, yPos);
        
        // Color code picked quantity
        if (picked === ordered && ordered > 0) {
          doc.setTextColor(100, 200, 100);
        } else if (picked < ordered && picked > 0) {
          doc.setTextColor(200, 150, 100);
        }
        doc.text(String(picked), colX.plockat, yPos);

        yPos += 4;
      });
    }

    yPos += 3;

    // === PRODUKTIONSANTECKNINGAR ===
    if (wo.production_notes && wo.production_notes.trim()) {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        yPos = margin;
      }
      addSection('PRODUKTIONSANTECKNINGAR');
      addField('Anteckningar', wo.production_notes);
    }

    // === FOOTER ===
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.text('IMvision - Arbetsorder', margin, pageHeight - 6);
    doc.text('Sida 1 av 1', pageWidth - margin - 10, pageHeight - 6);

    const pdf = doc.output('arraybuffer');
    
    return new Response(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="arbetsorder_${wo.order_number ? wo.order_number.replace(/\s/g, '_') : wo.id.slice(0, 8)}.pdf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});