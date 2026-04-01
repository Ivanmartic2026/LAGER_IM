import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { work_order_id } = await req.json();

    // Fetch all data in parallel
    const [woList] = await Promise.all([
      base44.asServiceRole.entities.WorkOrder.filter({ id: work_order_id }),
    ]);

    const wo = woList[0];
    if (!wo) return Response.json({ error: 'Not found' }, { status: 404 });

    const [orderList, orderItems, activities] = await Promise.all([
      base44.asServiceRole.entities.Order.filter({ id: wo.order_id }),
      base44.asServiceRole.entities.OrderItem.filter({ order_id: wo.order_id }),
      base44.asServiceRole.entities.WorkOrderActivity.filter({ work_order_id: work_order_id }),
    ]);
    const order = orderList[0] || {};

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 15;
    let y = 15;

    // Fix Swedish characters for jsPDF latin-1 encoding
    const fix = (str) => {
      if (!str) return '';
      return String(str)
        // Fix encoding corruption
        .replace(/ï¿½/g, 'ö').replace(/ï¿½/g, 'ä').replace(/ï¿½/g, 'å')
        // Standard replacements
        .replace(/å/g, 'o').replace(/Å/g, 'O')
        .replace(/ä/g, 'a').replace(/Ä/g, 'A')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/é/g, 'e').replace(/É/g, 'E')
        .replace(/[^\x00-\x7E]/g, '?');
    };

    const addLine = (h = 4) => { y += h; };
    const checkPage = (needed = 20) => {
      if (y + needed > 280) { doc.addPage(); y = 15; }
    };

    // ── Header bar ──────────────────────────────────────────
    doc.setFillColor(245, 245, 250);
    doc.rect(0, 0, W, 30, 'F');
    
    // Header border
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(2);
    doc.line(0, 30, W, 30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(20, 20, 40);
    doc.text('ARBETSORDER', margin, 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 120);
    doc.text(`Utskriven: ${new Date().toLocaleDateString('sv-SE')} ${new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`, margin, 21);

    // WO number top right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    const woLabel = wo.name || wo.order_number || work_order_id.slice(0, 8);
    doc.text(woLabel, W - margin, 14, { align: 'right' });

    y = 38;
    doc.setTextColor(20, 20, 20);

    // ── Info grid ───────────────────────────────────────────
    const infoBox = (label, value, x, boxY, w = 85) => {
      doc.setFillColor(245, 247, 255);
      doc.setDrawColor(180, 190, 220);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, boxY, w, 16, 2, 2, 'FD');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(110, 110, 140);
      doc.text(fix(label), x + 4, boxY + 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 40);
      const val = doc.splitTextToSize(fix(value) || '-', w - 8);
      doc.text(val[0], x + 4, boxY + 12);
    };

    const stageLabels = { picking: 'Plockning', production: 'Produktion', delivery: 'Leverans', completed: 'Klar' };
    const priorityLabels = { low: 'Lag', normal: 'Normal', high: 'Hog', urgent: 'Bradskande' };
    const statusLabels = { pending: 'Vantar', in_progress: 'Pagar', completed: 'Klar', cancelled: 'Avbruten' };

    infoBox('Kund', order.customer_name || '—', margin, y, 85);
    infoBox('Status / Fas', stageLabels[wo.current_stage] || wo.current_stage || '—', margin + 90, y, 55);
    infoBox('Prioritet', priorityLabels[wo.priority] || wo.priority || 'Normal', margin + 150, y, 45);
    y += 20;

    infoBox('Ordernummer', order.order_number || '—', margin, y, 55);
    infoBox('Leveransdatum', wo.delivery_date || order.delivery_date || '—', margin + 60, y, 55);
    infoBox('Kundref', order.customer_reference || '—', margin + 120, y, 75);
    y += 20;

    if (wo.assigned_to_production_name || wo.assigned_to_picking_name) {
      infoBox('Tilldelad produktion', wo.assigned_to_production_name || '—', margin, y, 85);
      infoBox('Tilldelad plockning', wo.assigned_to_picking_name || '—', margin + 90, y, 85);
      y += 18;
    }

    // ── Section helper ──────────────────────────────────────
    const sectionHeader = (title) => {
      checkPage(12);
      doc.setFillColor(37, 99, 235);
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.2);
      doc.rect(margin, y, W - margin * 2, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(fix(title).toUpperCase(), margin + 3, y + 5.5);
      y += 11;
      doc.setTextColor(20, 20, 20);
    };

    const field = (label, value) => {
      checkPage(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 100);
      doc.text(fix(label) + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      const lines = doc.splitTextToSize(fix(value) || '-', W - margin * 2 - 40);
      doc.text(lines, margin + 40, y);
      y += lines.length * 5 + 1;
    };

    // ── Order Info ──────────────────────────────────────────
    sectionHeader('Orderinformation');
    if (order.customer_name) field('Kund', order.customer_name);
    if (order.customer_reference) field('Kundreferens', order.customer_reference);
    if (order.fortnox_customer_number) field('Fortnox kundnr', order.fortnox_customer_number);
    if (order.delivery_address) field('Leveransadress', order.delivery_address);
    if (order.delivery_method) field('Leveranssätt', order.delivery_method);
    if (order.shipping_company) field('Speditör', order.shipping_company);
    if (order.notes) field('Anteckningar (order)', order.notes);
    if (order.rm_system_id) field('RM System ID', order.rm_system_id);
    if (order.fortnox_project_number) field('Fortnox Projekt', order.fortnox_project_number);

    // ── Work Order Info ─────────────────────────────────────
    sectionHeader('Arbetsorder detaljer');
    field('Arbetsorder', wo.name || '—');
    field('Status', statusLabels[wo.status] || wo.status || '—');
    field('Fas', stageLabels[wo.current_stage] || wo.current_stage || '—');
    field('Prioritet', priorityLabels[wo.priority] || wo.priority || 'Normal');
    if (wo.production_status) field('Produktionsstatus', wo.production_status);
    if (wo.picking_notes) field('Plockanteckningar', wo.picking_notes);
    if (wo.production_notes) field('Produktionsanteckningar', wo.production_notes);
    if (wo.deviations) field('Avvikelser', wo.deviations);

    // ── Materials / artiklar ────────────────────────────────
    if (orderItems.length > 0) {
      sectionHeader('Artiklar / Materiallista');
      // Table header
      doc.setFillColor(240, 240, 250);
      doc.setDrawColor(200, 200, 220);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, W - margin * 2, 7, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 60);
      doc.text('Artikel', margin + 2, y + 5);
      doc.text('Batch', margin + 90, y + 5);
      doc.text('Hylla', margin + 125, y + 5);
      doc.text('Best.', W - margin - 18, y + 5, { align: 'right' });
      doc.text('Plockat', W - margin - 2, y + 5, { align: 'right' });

      y += 8;

      orderItems.forEach((item, idx) => {
        checkPage(7);
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 255);
          doc.rect(margin, y - 1, W - margin * 2, 7, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(20, 20, 20);
        const name = doc.splitTextToSize(fix(item.article_name || item.article_id) || '-', 85);
        doc.text(name[0], margin + 2, y + 4);
        doc.text(fix(item.article_batch_number) || '-', margin + 90, y + 4);
        doc.text(fix(item.shelf_address) || '-', margin + 125, y + 4);
        doc.text(String(item.quantity_ordered || 0), W - margin - 18, y + 4, { align: 'right' });
        
        // Color picked qty
        const picked = item.quantity_picked || 0;
        const ordered = item.quantity_ordered || 0;
        if (picked >= ordered) doc.setTextColor(34, 197, 94);
        else if (picked > 0) doc.setTextColor(217, 119, 6);
        else doc.setTextColor(120, 120, 140);
        doc.text(String(picked), W - margin - 2, y + 4, { align: 'right' });
        doc.setTextColor(20, 20, 20);
        y += 7;
      });
      y += 4;
    }

    // ── WO Tasks ────────────────────────────────────────────
    if (wo.tasks && wo.tasks.length > 0) {
      sectionHeader('Arbetsmoment');
      const taskStatusLabels = { pending: 'Vantar', in_progress: 'Pagar', completed: 'Klar' };
      const taskTypeLabels = { buy: 'Kop', manufacture: 'Tillverka', assemble: 'Montera' };

      doc.setFillColor(240, 240, 250);
      doc.setDrawColor(200, 200, 220);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, W - margin * 2, 7, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 60);
      doc.text('Moment', margin + 2, y + 5);
      doc.text('Typ', margin + 100, y + 5);
      doc.text('Ansvarig', margin + 125, y + 5);
      doc.text('Status', W - margin - 2, y + 5, { align: 'right' });

      y += 8;

      wo.tasks.forEach((task, idx) => {
        checkPage(7);
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 255);
          doc.rect(margin, y - 1, W - margin * 2, 7, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(20, 20, 20);
        const title = doc.splitTextToSize(fix(task.title) || '-', 95);
        doc.text(title[0], margin + 2, y + 4);
        doc.text(fix(taskTypeLabels[task.type] || task.type) || '-', margin + 100, y + 4);
        doc.text(fix(task.assigned_name || task.assigned_to) || '-', margin + 125, y + 4);
        const s = task.status || 'pending';
        if (s === 'completed') doc.setTextColor(34, 197, 94);
        else if (s === 'in_progress') doc.setTextColor(217, 119, 6);
        else doc.setTextColor(120, 120, 140);
        doc.text(taskStatusLabels[s] || s, W - margin - 2, y + 4, { align: 'right' });
        doc.setTextColor(20, 20, 20);
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
        ['Redo for leverans', wo.checklist.ready_for_delivery],
      ];
      checks.forEach(([label, done]) => {
        checkPage(8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(done ? 34 : 120, done ? 197 : 120, done ? 94 : 140);
        doc.text(done ? '✓' : '○', margin + 2, y);
        doc.setTextColor(20, 20, 20);
        doc.text(label, margin + 10, y);
        y += 7;
      });
      y += 2;
    }

    // ── Timestamps ──────────────────────────────────────────
    sectionHeader('Tidsstamplar');
    if (wo.picking_started_date) field('Plockning startad', new Date(wo.picking_started_date).toLocaleString('sv-SE'));
    if (wo.picking_completed_date) field('Plockning klar', new Date(wo.picking_completed_date).toLocaleString('sv-SE'));
    if (wo.production_started_date) field('Produktion startad', new Date(wo.production_started_date).toLocaleString('sv-SE'));
    if (wo.production_completed_date) field('Produktion klar', new Date(wo.production_completed_date).toLocaleString('sv-SE'));

    // ── Activity log ────────────────────────────────────────
    if (activities && activities.length > 0) {
      sectionHeader('Aktivitetslogg / Kommentarer');


      const typeLabels = {
        comment: 'Kommentar',
        system: 'System',
        decision: 'Beslut',
        assignment: 'Tilldelning',
        file_upload: 'Fil uppladdad',
        status_change: 'Statusandring',
        field_change: 'Faltandring'
      };

      // Sort oldest first
      const sorted = [...activities].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

      sorted.forEach((act, idx) => {
        checkPage(16);

        // Row background
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 255);
          doc.rect(margin, y - 1, W - margin * 2, 14, 'F');
        }

        // Type badge color
        const isDecision = act.is_decision;
        const type = act.type || 'comment';
        if (isDecision) doc.setTextColor(139, 92, 246);
        else if (type === 'system') doc.setTextColor(100, 100, 120);
        else if (type === 'status_change') doc.setTextColor(37, 99, 235);
        else doc.setTextColor(20, 20, 20);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(`[${fix(typeLabels[type] || type)}]${isDecision ? ' * BESLUT' : ''}`, margin + 2, y + 4);

        // Actor + time
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 120);
        const timeStr = act.created_date ? new Date(act.created_date).toLocaleString('sv-SE') : '';
        const actor = fix(act.actor_name || act.actor_email || '');
        doc.text(`${actor}  ${timeStr}`, W - margin - 2, y + 4, { align: 'right' });

        // Message
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(20, 20, 20);
        const msgLines = doc.splitTextToSize(fix(act.message) || '-', W - margin * 2 - 4);
        msgLines.slice(0, 2).forEach((line, li) => {
          doc.text(line, margin + 2, y + 9 + li * 4);
        });

        // Field change extra info
        if (type === 'field_change' && act.old_value && act.new_value) {
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 120);
          const changeText = fix(`${act.field_name || ''}: "${act.old_value}" -> "${act.new_value}"`);
          const changeLines = doc.splitTextToSize(changeText, W - margin * 2 - 4);
          doc.text(changeLines[0], margin + 2, y + (msgLines.length > 0 ? 13 : 9));
        }

        y += 15;
      });
      y += 4;
    }

    // ── Footer on each page ─────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(245, 245, 250);
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(0, 285, W, 285);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 120);
      doc.text('IMvision - Arbetsorder', margin, 291);
      doc.text(`Sida ${i} av ${pageCount}`, W - margin, 291, { align: 'right' });
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