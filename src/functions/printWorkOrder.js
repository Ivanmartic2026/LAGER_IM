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
    const articles = await base44.asServiceRole.entities.Article.list();

    // Create PDF with black theme
    const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
    
    // Set colors
    const darkBg = [20, 20, 20];
    const white = [255, 255, 255];
    const lightGray = [170, 170, 170];
    const accentBlue = [37, 99, 235];

    // Page width and margins
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = margin;

    // Fill entire page with dark background
    doc.setFillColor(...darkBg);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header with dark background
    doc.setFillColor(...darkBg);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('ARBETSORDER', margin, 20);

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    const orderTitle = `${wo.customer_name} ${wo.order_number || ''}`.trim();
    doc.text(orderTitle, pageWidth - margin, 20, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(...lightGray);
    doc.text(`Utskriven: ${new Date().toLocaleString('sv-SE')}`, pageWidth - margin, 30, { align: 'right' });

    yPos = 50;

    // Function to add section
    const addSection = (title, items) => {
      // Section header with accent color
      doc.setFillColor(...accentBlue);
      doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
      
      doc.setTextColor(...white);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin + 3, yPos + 1);
      
      yPos += 12;

      doc.setTextColor(...white);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');

      items.forEach(([label, value]) => {
        if (value === undefined || value === null || value === '') {
          value = '-';
        }
        
        doc.setFont(undefined, 'bold');
        doc.text(label + ':', margin, yPos);
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...white);
        
        const labelWidth = 50;
        const maxWidth = contentWidth - labelWidth;
        const lines = doc.splitTextToSize(String(value), maxWidth);
        
        lines.forEach((line, idx) => {
          doc.text(line, margin + labelWidth, yPos + (idx * 4));
        });
        
        yPos += (lines.length * 4) + 2;
      });

      yPos += 3;
    };

    // Overview section
    addSection('ARBETSORDER ÖVERSIKT', [
      ['Kund', wo.customer_name],
      ['Ordernummer', wo.order_number || '-'],
      ['Status', wo.status || 'pending'],
      ['Fas', wo.current_stage || 'picking'],
      ['Leveransdatum', wo.delivery_date || '-'],
      ['Prioritet', wo.priority || 'normal']
    ]);

    // Order information section
    if (orderData.id) {
      addSection('ORDERINFORMATION', [
        ['Leveransadress', orderData.delivery_address || '-'],
        ['Fortnox kundnr', orderData.fortnox_customer_number || '-'],
        ['Fortnox Projekt', orderData.fortnox_project_number || '-'],
        ['Kundreferens', orderData.customer_reference || '-']
      ]);
    }

    // Articles/Materials section
    if (orderItems && orderItems.length > 0) {
      doc.setFillColor(...accentBlue);
      doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
      
      doc.setTextColor(...white);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('ARTIKLAR / MATERIALLISTA', margin + 3, yPos + 1);
      
      yPos += 10;

      // Table headers
      doc.setFillColor(50, 50, 50);
      doc.rect(margin, yPos - 4, contentWidth, 6, 'F');
      
      doc.setTextColor(...lightGray);
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      
      const colPositions = [margin + 2, margin + 100, margin + 140, margin + 170, margin + 200];
      doc.text('Artikel', colPositions[0], yPos);
      doc.text('Batch', colPositions[1], yPos);
      doc.text('Hylla', colPositions[2], yPos);
      doc.text('Best.', colPositions[3], yPos);
      doc.text('Plockad', colPositions[4], yPos);
      
      yPos += 6;

      // Table rows
      doc.setTextColor(...white);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);

      orderItems.forEach(item => {
        const article = articles.find(a => a.id === item.article_id);
        const picked = item.quantity_picked || 0;
        const ordered = item.quantity_ordered || 0;

        doc.text(item.article_name || '-', colPositions[0], yPos);
        doc.text(item.article_batch_number || '-', colPositions[1], yPos);
        doc.text(item.shelf_address || '-', colPositions[2], yPos);
        doc.text(String(ordered), colPositions[3], yPos);
        
        // Picked count in green if complete
        if (picked === ordered && ordered > 0) {
          doc.setTextColor(34, 197, 94); // Green
        }
        doc.text(String(picked), colPositions[4], yPos);
        doc.setTextColor(...white);

        yPos += 5;
      });

      yPos += 3;
    }

    // Production notes
    if (wo.production_notes) {
      addSection('PRODUKTIONSANTECKNINGAR', [
        ['Anteckningar', wo.production_notes]
      ]);
    }

    // Footer
    doc.setTextColor(...lightGray);
    doc.setFontSize(8);
    doc.text('IMvision - Arbetsorder', margin, pageHeight - 10);
    doc.text(`Sida 1 av 1`, pageWidth - margin, pageHeight - 10, { align: 'right' });

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