import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { work_order_id } = await req.json();

    // Fetch data
    const [woList, allItems] = await Promise.all([
      base44.asServiceRole.entities.WorkOrder.filter({ id: work_order_id }),
      base44.asServiceRole.entities.OrderItem.filter({ order_id: '' }) // placeholder
    ]);

    const wo = woList[0];
    if (!wo) return Response.json({ error: 'Not found' }, { status: 404 });

    const [orderList, orderItems] = await Promise.all([
      base44.asServiceRole.entities.Order.filter({ id: wo.order_id }),
      base44.asServiceRole.entities.OrderItem.filter({ order_id: wo.order_id })
    ]);
    const order = orderList[0] || {};

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 15;
    let y = 15;

    const addLine = (h = 4) => { y += h; };
    const checkPage = (needed = 20) => {
      if (y + needed > 280) { doc.addPage(); y = 15; }
    };

    // ── Header bar ──────────────────────────────────────────
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, W, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('ARBETSORDER', margin, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.text(`Utskriven: ${new Date().toLocaleDateString('sv-SE')} ${new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`, margin, 19);

    // WO number top right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    const woLabel = wo.name || wo.order_number || work_order_id.slice(0, 8);
    doc.text(woLabel, W - margin, 12, { align: 'right' });

    y = 35;
    doc.setTextColor(0, 0, 0);

    // ── Info grid ───────────────────────────────────────────
    const infoBox = (label, value, x, boxY, w = 85) => {
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(x, boxY, w, 14, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(label, x + 4, boxY + 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      doc.text(String(value || '—'), x + 4, boxY + 11);
    };

    const stageLabels = { picking: 'Plockning', production: 'Produktion', delivery: 'Leverans', completed: 'Klar' };
    const priorityLabels = { low: 'Låg', normal: 'Normal', high: 'Hög', urgent: 'Brådskande' };

    infoBox('Kund', order.customer_name || '—', margin, y, 85);
    infoBox('Status / Fas', stageLabels[wo.current_stage] || wo.current_stage, margin + 90, y, 55);
    infoBox('Prioritet', priorityLabels[wo.priority] || wo.priority || 'Normal', margin + 150, y, 45);
    y += 18;

    infoBox('Ordernummer', order.order_number || '—', margin, y, 55);
    infoBox('Leveransdatum', wo.delivery_date || order.delivery_date || '—', margin + 60, y, 55);
    infoBox('Kundref', order.customer_reference || '—', margin + 120, y, 75);
    y += 18;

    if (wo.assigned_to_production_name || wo.assigned_to_picking_name) {
      infoBox('Tilldelad produktion', wo.assigned_to_production_name || '—', margin, y, 85);
      infoBox('Tilldelad plockning', wo.assigned_to_picking_name || '—', margin + 90, y, 85);
      y += 18;
    }

    // ── Section helper ──────────────────────────────────────
    const sectionHeader = (title) => {
      checkPage(12);
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, y, W - margin * 2, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(title.toUpperCase(), margin + 3, y + 5);
      y += 10;
      doc.setTextColor(0, 0, 0);
    };

    const field = (label, value) => {
      checkPage(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`${label}:`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      const lines = doc.splitTextToSize(String(value || '—'), W - margin * 2 - 40);
      doc.text(lines, margin + 40, y);
      y += lines.length * 5 + 1;
    };

    // ── Materials / artiklar ────────────────────────────────
    if (orderItems.length > 0) {
      sectionHeader('Artiklar / Materiallista');
      // Table header
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, y, W - margin * 2, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      doc.text('Artikel', margin + 2, y + 5);
      doc.text('Antal', W - margin - 30, y + 5, { align: 'right' });
      doc.text('Plockad', W - margin - 2, y + 5, { align: 'right' });
      y += 8;

      orderItems.forEach((item, idx) => {
        checkPage(7);
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, y - 1, W - margin * 2, 7, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(20, 20, 20);
        const name = doc.splitTextToSize(item.article_name || item.article_id || '—', 110);
        doc.text(name[0], margin + 2, y + 4);
        doc.text(String(item.quantity_ordered || 0), W - margin - 30, y + 4, { align: 'right' });
        doc.text(String(item.quantity_picked || 0), W - margin - 2, y + 4, { align: 'right' });
        y += 7;
      });
      y += 4;
    }

    // ── Checklist ───────────────────────────────────────────
    if (wo.checklist) {
      sectionHeader('Produktionschecklista');
      const checks = [
        ['Monterad', wo.checklist.assembled],
        ['Testad', wo.checklist.tested],
        ['Redo för leverans', wo.checklist.ready_for_delivery],
      ];
      checks.forEach(([label, done]) => {
        checkPage(8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(done ? 22 : 180, done ? 163 : 180, done ? 74 : 180);
        doc.text(done ? '✓' : '○', margin + 2, y);
        doc.setTextColor(20, 20, 20);
        doc.text(label, margin + 10, y);
        y += 7;
      });
      y += 2;
    }

    // ── Notes ───────────────────────────────────────────────
    if (wo.production_notes) {
      sectionHeader('Anteckningar');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(wo.production_notes, W - margin * 2 - 4);
      lines.forEach(line => {
        checkPage(6);
        doc.text(line, margin + 2, y);
        y += 5;
      });
      y += 4;
    }

    // ── Deviations ──────────────────────────────────────────
    if (wo.deviations) {
      sectionHeader('Avvikelser');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(wo.deviations, W - margin * 2 - 4);
      lines.forEach(line => {
        checkPage(6);
        doc.text(line, margin + 2, y);
        y += 5;
      });
      y += 4;
    }

    // ── Timestamps ──────────────────────────────────────────
    sectionHeader('Tidsstämplar');
    if (wo.picking_started_date) field('Plockning startad', new Date(wo.picking_started_date).toLocaleString('sv-SE'));
    if (wo.picking_completed_date) field('Plockning klar', new Date(wo.picking_completed_date).toLocaleString('sv-SE'));
    if (wo.production_started_date) field('Produktion startad', new Date(wo.production_started_date).toLocaleString('sv-SE'));
    if (wo.production_completed_date) field('Produktion klar', new Date(wo.production_completed_date).toLocaleString('sv-SE'));

    // ── Footer on each page ─────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 287, W, 10, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('IMvision — Arbetsorder', margin, 293);
      doc.text(`Sida ${i} av ${pageCount}`, W - margin, 293, { align: 'right' });
    }

    const pdfBytes = doc.output('arraybuffer');
    const filename = `arbetsorder_${(wo.order_number || work_order_id.slice(0, 8)).replace(/[^a-z0-9]/gi, '_')}.pdf`;

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});