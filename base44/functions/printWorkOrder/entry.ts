import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { work_order_id } = await req.json();
    if (!work_order_id) return Response.json({ error: 'Missing work_order_id' }, { status: 400 });

    const woList = await base44.asServiceRole.entities.WorkOrder.filter({ id: work_order_id });
    const wo = woList[0];
    if (!wo) return Response.json({ error: 'Not found' }, { status: 404 });

    const [orderList, orderItems, tasksByWO, tasksByOrder] = await Promise.all([
      wo.order_id ? base44.asServiceRole.entities.Order.filter({ id: wo.order_id }) : Promise.resolve([]),
      wo.order_id ? base44.asServiceRole.entities.OrderItem.filter({ order_id: wo.order_id }) : Promise.resolve([]),
      base44.asServiceRole.entities.Task.filter({ work_order_id }),
      wo.order_id ? base44.asServiceRole.entities.Task.filter({ order_id: wo.order_id }) : Promise.resolve([]),
    ]);
    const order = orderList[0] || {};

    // Deduplicate and sort tasks
    const seenIds = new Set();
    const allTasks = [];
    for (const t of [...tasksByWO, ...tasksByOrder]) {
      if (!seenIds.has(t.id)) { seenIds.add(t.id); allTasks.push(t); }
    }
    const pOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    allTasks.sort((a, b) => {
      const pa = pOrder[a.priority] ?? 2, pb = pOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (b.status === 'completed' && a.status !== 'completed') return -1;
      return 0;
    });

    const tasksByRole = {
      pl_konstruktor: allTasks.filter(t => t.role === 'pl_konstruktor'),
      lager: allTasks.filter(t => t.role === 'lager'),
      tekniker: allTasks.filter(t => t.role === 'tekniker'),
      other: allTasks.filter(t => !t.role),
    };

    const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('sv-SE'); } catch { return '—'; } };
    const fmtDT = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleString('sv-SE'); } catch { return '—'; } };

    const installTypeLabels = {
      ny_installation: 'Ny installation', byte_uppgradering: 'Byte/uppgradering',
      tillagg: 'Tillägg', service_reparation: 'Service/reparation', uthyrning_event: 'Uthyrning/event',
    };
    const deliveryMethodLabels = {
      truck: 'Lastbil', courier: 'Bud', pickup: 'Hämtas', air_freight: 'Flyg', sea_freight: 'Sjöfrakt', other: 'Annat'
    };
    const priorityLabels = { low: 'Låg', normal: 'Normal', high: 'Hög', urgent: 'BRÅDSKANDE' };

    const criticalNotes = wo.critical_notes || order.critical_notes;
    const screenDimensions = wo.screen_dimensions || order.screen_dimensions;
    const pixelPitch = wo.pixel_pitch || order.pixel_pitch;
    const moduleCount = wo.module_count ?? order.module_count;
    const installationType = wo.installation_type || order.installation_type;
    const installationDate = wo.installation_date || order.installation_date;
    const deliveryMethod = wo.delivery_method || order.delivery_method;
    const deliveryContactName = wo.delivery_contact_name || order.delivery_contact_name;
    const deliveryContactPhone = wo.delivery_contact_phone || order.delivery_contact_phone;
    const siteVisitInfo = wo.site_visit_info || order.site_visit_info;
    const siteNames = wo.site_names || order.site_names || [];
    const rmUrl = wo.rm_system_url || order.rm_system_url;
    const rmId = wo.rm_system_id || order.rm_system_id;
    const fortnoxProjectNumber = wo.fortnox_project_number || order.fortnox_project_number;
    const fortnoxProjectName = wo.fortnox_project_name || order.fortnox_project_name;
    const fortnoxCustNum = wo.fortnox_customer_number || order.fortnox_customer_number;

    const materials = (wo.materials_needed && wo.materials_needed.length > 0)
      ? wo.materials_needed
      : orderItems.map(i => ({
          article_name: i.article_name,
          batch_number: i.article_batch_number,
          shelf_address: i.shelf_address,
          quantity: i.quantity_ordered,
          quantity_picked: i.quantity_picked,
        }));
    const totalItems = materials.reduce((s, m) => s + (m.quantity || m.quantity_needed || 0), 0);
    const checklist = wo.checklist || {};
    const now = new Date();
    const isRental = installationType === 'uthyrning_event';
    const woUrl = `https://app.base44.com/WorkOrders/${work_order_id}`;

    const getName = (email) => email ? email.split('@')[0].replace('.', ' ') : '—';

    const renderTasksGroup = (tasks, title, color) => {
      if (!tasks || tasks.length === 0) return '';
      return `
        <div style="margin-bottom:10px">
          <div style="font-size:8pt;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${color};margin-bottom:6px">${esc(title)} (${tasks.length})</div>
          <table style="width:100%;border-collapse:collapse">
            ${tasks.map((t, i) => {
              const isHigh = t.priority === 'high' || t.priority === 'urgent';
              const isDone = t.status === 'completed';
              return `<tr style="border-bottom:1px solid #f0f0f0">
                <td style="width:28px;padding:5px 8px;text-align:center;font-size:12pt;color:#ccc">${isDone ? '☑' : '☐'}</td>
                <td style="padding:5px 8px">
                  <span style="font-size:9.5pt;font-weight:${isHigh?'700':'500'};color:${isHigh?'#dc2626':'#111'};${isDone?'text-decoration:line-through;opacity:0.5':''}">${isHigh ? '★ ' : ''}${esc(t.name)}</span>
                  ${t.description ? `<div style="font-size:8pt;color:#888;margin-top:1px">${esc(t.description)}</div>` : ''}
                </td>
                <td style="width:80px;padding:5px 8px;font-size:8.5pt;color:${isHigh?'#dc2626':'#666'}">${isHigh ? 'HÖG' : (priorityLabels[t.priority] || '')}</td>
                <td style="width:90px;padding:5px 8px;font-size:8.5pt;color:#666">${isDone ? 'Klar' : (t.status === 'in_progress' ? 'Pågår' : 'Ej påbörjad')}</td>
              </tr>`;
            }).join('')}
          </table>
        </div>`;
    };

    const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Intern Arbetsorder – ${esc(order.order_number || wo.order_number || '')}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f0f0ec; color: #111; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print { body { background: white; } .no-print { display: none !important; } @page { size: A4 portrait; margin: 12mm 15mm; } }
  .page { max-width: 210mm; margin: 0 auto; background: white; }
  .top-bar { background: #1B3F6E; color: white; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
  .top-bar-logo { font-size: 20pt; font-weight: 800; letter-spacing: 0.04em; color: white; }
  .top-bar-center { text-align: center; }
  .top-bar-title { font-size: 15pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
  .top-bar-sub { font-size: 8pt; color: rgba(255,255,255,0.6); margin-top: 2px; }
  .top-bar-meta { text-align: right; font-size: 9pt; color: rgba(255,255,255,0.75); line-height: 1.8; }
  .top-bar-meta strong { color: white; }
  .content { padding: 18px 24px; }
  .critical-banner { background: #fff7ed; border: 2.5px solid #f97316; border-radius: 6px; padding: 12px 16px; margin-bottom: 14px; }
  .critical-title { font-size: 8pt; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #9a3412; margin-bottom: 4px; }
  .critical-text { font-size: 10pt; font-weight: 600; color: #7c2d12; white-space: pre-wrap; }
  .section { margin-bottom: 12px; border: 1px solid #d0d0d0; border-radius: 5px; overflow: hidden; page-break-inside: avoid; }
  .section-header { background: #1B3F6E; color: white; padding: 6px 14px; font-size: 8pt; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
  .section-body { padding: 10px 14px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .field { margin-bottom: 8px; }
  .field:last-child { margin-bottom: 0; }
  .field-label { font-size: 7.5pt; color: #999; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 2px; }
  .field-value { font-size: 10pt; font-weight: 500; color: #111; white-space: pre-wrap; }
  .field-value a { color: #1B3F6E; text-decoration: none; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #1B3F6E; }
  th { padding: 7px 10px; text-align: left; font-size: 8.5pt; font-weight: 600; letter-spacing: 0.04em; color: white; }
  td { padding: 6px 10px; border-bottom: 1px solid #ebebeb; font-size: 9.5pt; color: #222; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) td { background: #f9f9f7; }
  .cb { font-size: 13pt; text-align: center; color: #bbb; }
  .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; }
  .checklist-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid #f4f4f4; font-size: 9.5pt; }
  .checklist-group-title { font-size: 8pt; font-weight: 700; color: #1B3F6E; text-transform: uppercase; letter-spacing: 0.07em; margin: 10px 0 6px; }
  .note-box { white-space: pre-wrap; font-size: 9.5pt; line-height: 1.6; color: #333; }
  .total-row { text-align: right; font-size: 8.5pt; color: #666; padding: 7px 10px; background: #f9f9f7; }
  .sig-row { display: flex; gap: 28px; margin-bottom: 10px; }
  .sig-field { flex: 1; }
  .sig-label { font-size: 8pt; color: #888; margin-bottom: 2px; }
  .sig-line { border-bottom: 1px solid #333; display: block; width: 100%; margin-top: 22px; }
  .footer { padding: 8px 24px; border-top: 1px solid #ddd; font-size: 7.5pt; color: #aaa; display: flex; justify-content: space-between; background: #f9f9f7; }
  .print-bar { background: #1B3F6E; padding: 10px 20px; display: flex; align-items: center; gap: 14px; position: sticky; top: 0; z-index: 100; }
  .print-btn { background: white; color: #1B3F6E; border: none; padding: 7px 18px; font-size: 12px; font-weight: 700; border-radius: 4px; cursor: pointer; }
  .print-info { color: rgba(255,255,255,0.75); font-size: 11px; flex: 1; }
  .tag { display: inline-block; background: #eef2f9; border-radius: 4px; padding: 2px 7px; font-size: 8pt; margin: 2px 2px 2px 0; color: #1B3F6E; }
  .role-table td { padding: 7px 12px; border-bottom: 1px solid #ebebeb; font-size: 9.5pt; }
  .role-table th { padding: 7px 12px; }
  .qr-box { border: 2px dashed #1B3F6E; border-radius: 8px; padding: 20px; text-align: center; }
  .qr-title { font-size: 11pt; font-weight: 700; color: #1B3F6E; margin-bottom: 8px; }
  .qr-url { font-size: 8pt; color: #666; font-family: monospace; margin-top: 8px; }
  .qr-instr { font-size: 9pt; color: #555; margin-top: 6px; }
</style>
</head>
<body>

<div class="no-print print-bar">
  <button class="print-btn" onclick="window.print()">🖨️ Skriv ut / Spara PDF</button>
  <span class="print-info">INTERN ARBETSORDER — ${esc(order.customer_name || wo.customer_name)} · ${esc(order.order_number || wo.order_number || '—')}</span>
  <button style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:white;padding:6px 14px;border-radius:4px;cursor:pointer;font-size:11px" onclick="window.close()">✕ Stäng</button>
</div>

<div class="page">
  <!-- HEADER -->
  <div class="top-bar">
    <div>
      <div class="top-bar-logo">IM Vision</div>
      <div style="font-size:7.5pt;color:rgba(255,255,255,0.5);margin-top:2px">IM Vision Group AB</div>
    </div>
    <div class="top-bar-center">
      <div class="top-bar-title">Intern Arbetsorder</div>
      <div class="top-bar-sub">${esc(installTypeLabels[installationType] || 'Installation')} · Prioritet: ${esc(priorityLabels[wo.priority] || 'Normal')}</div>
    </div>
    <div class="top-bar-meta">
      <div><strong>AO:</strong> ${esc(order.order_number || wo.order_number || '—')}</div>
      <div><strong>Kund:</strong> ${esc(order.customer_name || wo.customer_name || '—')}</div>
      <div><strong>Genererad:</strong> ${fmtDate(now)}</div>
    </div>
  </div>

  <div class="content">

    ${criticalNotes ? `
    <div class="critical-banner">
      <div class="critical-title">⚠️ Viktigt — Läs noggrant innan arbete påbörjas</div>
      <div class="critical-text">${esc(criticalNotes)}</div>
    </div>` : ''}

    <!-- SEKTION 1: Projektinformation -->
    <div class="section">
      <div class="section-header">1 — Projektinformation</div>
      <div class="section-body">
        <div class="grid2">
          <div>
            <div class="field"><div class="field-label">Kund</div><div class="field-value">${esc(order.customer_name || wo.customer_name || '—')}</div></div>
            <div class="field"><div class="field-label">Ordernummer</div><div class="field-value">${esc(order.order_number || wo.order_number || '—')}</div></div>
            <div class="field"><div class="field-label">Kundreferens</div><div class="field-value">${esc(order.customer_reference || wo.customer_reference || '—')}</div></div>
            ${fortnoxCustNum ? `<div class="field"><div class="field-label">Fortnox Kundnr</div><div class="field-value">${esc(fortnoxCustNum)}</div></div>` : ''}
            ${fortnoxProjectNumber ? `<div class="field"><div class="field-label">Fortnox Projekt</div><div class="field-value">#${esc(fortnoxProjectNumber)}${fortnoxProjectName ? ` – ${esc(fortnoxProjectName)}` : ''}</div></div>` : ''}
          </div>
          <div>
            <div class="field"><div class="field-label">Installationstyp</div><div class="field-value">${esc(installTypeLabels[installationType] || installationType || '—')}</div></div>
            <div class="field"><div class="field-label">Orderdatum</div><div class="field-value">${fmtDate(order.created_date || wo.created_date)}</div></div>
            ${(deliveryContactName || deliveryContactPhone) ? `<div class="field"><div class="field-label">Kontakt på plats</div><div class="field-value">${esc(deliveryContactName || '')}${deliveryContactPhone ? ' · ' + esc(deliveryContactPhone) : ''}</div></div>` : ''}
            ${rmUrl ? `<div class="field"><div class="field-label">RM-system</div><div class="field-value"><a href="${esc(rmUrl)}">${esc(rmId || 'Öppna länk')}</a></div></div>` : ''}
            ${(order.source_document_url || wo.source_document_url) ? `<div class="field"><div class="field-label">Källdokument (PO)</div><div class="field-value"><a href="${esc(order.source_document_url || wo.source_document_url)}">Öppna dokument</a></div></div>` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- SEKTION 2: Produktspecifikation -->
    ${(screenDimensions || pixelPitch || moduleCount != null) ? `
    <div class="section">
      <div class="section-header">2 — Produktspecifikation</div>
      <div class="section-body">
        <div class="grid3">
          ${screenDimensions ? `<div class="field"><div class="field-label">Skärmdimensioner</div><div class="field-value">${esc(screenDimensions)}</div></div>` : '<div></div>'}
          ${pixelPitch ? `<div class="field"><div class="field-label">Pixel Pitch</div><div class="field-value">${esc(pixelPitch)}</div></div>` : '<div></div>'}
          ${moduleCount != null ? `<div class="field"><div class="field-label">Antal Moduler</div><div class="field-value">${moduleCount} st</div></div>` : '<div></div>'}
        </div>
      </div>
    </div>` : ''}

    <!-- SEKTION 3: Materialförteckning -->
    <div class="section">
      <div class="section-header">3 — Materialförteckning / Plocklista (${totalItems} st)</div>
      <table>
        <thead><tr><th style="width:28px">#</th><th>Artikel</th><th style="width:120px">Art.nr / Batch</th><th style="width:100px">Hyllplats</th><th style="width:55px;text-align:center">Antal</th><th style="width:55px;text-align:center">Plockat</th><th style="width:40px;text-align:center">☐</th></tr></thead>
        <tbody>
          ${materials.length === 0
            ? '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:16px">Inga artiklar registrerade</td></tr>'
            : materials.map((m, i) => `<tr>
              <td style="color:#bbb">${i + 1}</td>
              <td style="font-weight:500">${esc(m.article_name || '—')}</td>
              <td style="font-family:monospace;font-size:8pt;color:#666">${esc(m.batch_number || m.article_batch_number || m.article_sku || '—')}</td>
              <td style="font-weight:600;color:#1B3F6E">${esc(Array.isArray(m.shelf_address) ? m.shelf_address.join(', ') : (m.shelf_address || '—'))}</td>
              <td style="text-align:center;font-weight:700;font-size:11pt">${m.quantity || m.quantity_needed || 0}</td>
              <td style="text-align:center;font-weight:700;font-size:11pt;color:${(m.quantity_picked > 0)?'#16a34a':'#ccc'}">${m.quantity_picked != null ? m.quantity_picked : '—'}</td>
              <td class="cb">☐</td>
            </tr>`).join('')
          }
        </tbody>
      </table>
      ${materials.length > 0 ? `<div class="total-row">Totalantal: <strong>${totalItems} st</strong> · ${materials.length} artikelrader</div>` : ''}
    </div>

    <!-- SEKTION 4: Leverans & Plats -->
    <div class="section">
      <div class="section-header">4 — Leverans &amp; Plats</div>
      <div class="section-body">
        <div class="grid2">
          <div>
            <div class="field"><div class="field-label">Leveransdatum</div><div class="field-value">${fmtDate(order.delivery_date || wo.delivery_date)}</div></div>
            ${installationDate ? `<div class="field"><div class="field-label">Installationsdatum</div><div class="field-value">${fmtDate(installationDate)}</div></div>` : ''}
            ${deliveryMethod ? `<div class="field"><div class="field-label">Leveranssätt</div><div class="field-value">${esc(deliveryMethodLabels[deliveryMethod] || deliveryMethod)}</div></div>` : ''}
            ${(order.shipping_company || wo.shipping_company) ? `<div class="field"><div class="field-label">Speditör</div><div class="field-value">${esc(order.shipping_company || wo.shipping_company)}</div></div>` : ''}
          </div>
          <div>
            <div class="field"><div class="field-label">Leveransadress</div><div class="field-value">${esc(order.delivery_address || wo.delivery_address || '—')}</div></div>
            ${(deliveryContactName || deliveryContactPhone) ? `<div class="field"><div class="field-label">Kontaktperson</div><div class="field-value">${esc(deliveryContactName || '')}${deliveryContactPhone ? '\n' + esc(deliveryContactPhone) : ''}</div></div>` : ''}
            ${siteVisitInfo ? `<div class="field"><div class="field-label">Tillträde / Access</div><div class="note-box" style="font-size:9pt">${esc(siteVisitInfo)}</div></div>` : ''}
          </div>
        </div>
        ${siteNames.length > 0 ? `<div class="field" style="margin-top:8px"><div class="field-label">Siter</div><div>${siteNames.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div></div>` : ''}
      </div>
    </div>

    ${isRental ? `
    <!-- SEKTION 5: Uthyrning -->
    <div class="section">
      <div class="section-header">5 — Uthyrning &amp; Event</div>
      <div class="section-body">
        <div class="grid2">
          <div class="field"><div class="field-label">Eventnamn / Venue</div><div class="field-value">${esc(siteNames.join(', ') || '—')}</div></div>
          <div class="field"><div class="field-label">Hyresperiod</div><div class="field-value">${fmtDate(order.delivery_date || wo.delivery_date)} — ${fmtDate(installationDate || order.delivery_date)}</div></div>
        </div>
      </div>
    </div>` : ''}

    <!-- SEKTION 6: Rollfördelning -->
    <div class="section">
      <div class="section-header">6 — Rollfördelning &amp; Ansvar</div>
      <div class="section-body">
        <table class="role-table">
          <thead><tr><th style="width:140px">Roll</th><th>Ansvarig</th><th style="width:120px">Datum/Deadline</th><th style="width:80px">Status</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600">Projektledare</td><td>${esc(wo.assigned_to_produktion_name || wo.assigned_to_produktion || '—')}</td><td>${fmtDate(wo.planned_start_date)}</td><td>—</td></tr>
            <tr><td style="font-weight:600">Konstruktör</td><td>${esc(wo.assigned_to_konstruktion_name || wo.assigned_to_konstruktion || '—')}</td><td>—</td><td>—</td></tr>
            <tr><td style="font-weight:600">Lager</td><td>${esc(wo.assigned_to_lager_name || wo.assigned_to_lager || '—')}</td><td>—</td><td>${checklist.picked ? '✓ Plockat' : 'Ej plockat'}</td></tr>
            <tr><td style="font-weight:600">Tekniker</td><td>${esc(wo.assigned_to_montering_name || wo.assigned_to_montering || wo.technician_name || '—')}${(wo.technician_phone || wo.assigned_to_montering_phone) ? ' · ' + esc(wo.technician_phone || wo.assigned_to_montering_phone) : ''}</td><td>${fmtDate(wo.planned_deadline)}</td><td>—</td></tr>
          </tbody>
        </table>
        ${(wo.planned_start_date || wo.planned_deadline) ? `
        <div style="display:flex;gap:20px;margin-top:10px">
          <div class="field"><div class="field-label">Planerat startdatum</div><div class="field-value">${fmtDate(wo.planned_start_date)}</div></div>
          <div class="field"><div class="field-label">Deadline</div><div class="field-value">${fmtDate(wo.planned_deadline)}</div></div>
        </div>` : ''}
      </div>
    </div>

    <!-- SEKTION 7: Uppgifter per roll -->
    ${allTasks.length > 0 ? `
    <div class="section">
      <div class="section-header">7 — Uppgifter per Roll (${allTasks.length} st)</div>
      <div class="section-body">
        ${renderTasksGroup(tasksByRole.pl_konstruktor, 'Projektledare / Konstruktör', '#7c3aed')}
        ${renderTasksGroup(tasksByRole.lager, 'Lager', '#d97706')}
        ${renderTasksGroup(tasksByRole.tekniker, 'Tekniker', '#16a34a')}
        ${renderTasksGroup(tasksByRole.other, 'Övriga uppgifter', '#666')}
      </div>
    </div>` : ''}

    <!-- SEKTION 8: Teknikerns installations-checklista -->
    <div class="section">
      <div class="section-header">8 — Teknikerns Installations-Checklista</div>
      <div class="section-body">
        <div class="checklist-group-title">Före installation</div>
        <div class="checklist-grid">
          ${[
            'Kontrollera leverans mot följesedel',
            'Fotografera vid mottagning',
            'Verifiera mått och väggbärighet',
            'Kontrollera elinstallation och jordat uttag',
          ].map(item => `<div class="checklist-item"><span class="cb">☐</span><span>${item}</span></div>`).join('')}
        </div>
        <div class="checklist-group-title">Under installation</div>
        <div class="checklist-grid">
          ${[
            'Montera fästen/konstruktion enligt ritning',
            'Installera moduler och kabinett',
            'Kabelanslutning och strömförsörjning',
            'Nätverksanslutning och konfiguration',
          ].map(item => `<div class="checklist-item"><span class="cb">☐</span><span>${item}</span></div>`).join('')}
        </div>
        <div class="checklist-group-title">Efter installation</div>
        <div class="checklist-grid">
          ${[
            'Funktionstest — hela skärmen',
            'Kalibrera ljusstyrka och färg',
            'Dokumentera serienummer på moduler',
            'Fotografera färdig installation',
            'Kundgenomgång och driftsättning',
            'Kund signerar godkännande',
          ].map(item => `<div class="checklist-item"><span class="cb">☐</span><span>${item}</span></div>`).join('')}
        </div>
      </div>
    </div>

    <!-- SEKTION 9: QR-kod för dokumentation -->
    <div class="section">
      <div class="section-header">9 — Dokumentation via Mobil</div>
      <div class="section-body">
        <div class="qr-box">
          <div class="qr-title">📱 Skanna för att dokumentera installation</div>
          <div style="background:#f0f0ec;border:1px solid #ddd;border-radius:4px;padding:16px;display:inline-block;margin:8px 0">
            <div style="width:80px;height:80px;background:#1B3F6E;border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-size:8pt;text-align:center;line-height:1.3">QR<br>Kod</div>
          </div>
          <div class="qr-url">${esc(woUrl)}</div>
          <div class="qr-instr">Foton, serienummer och avvikelser laddas upp direkt i systemet under denna arbetsorder</div>
        </div>
      </div>
    </div>

    <!-- SEKTION 10: Signering -->
    <div class="section">
      <div class="section-header">10 — Signering &amp; Godkännande</div>
      <div class="section-body">
        ${[['Projektledare', wo.assigned_to_produktion_name || ''],
           ['Konstruktör', wo.assigned_to_konstruktion_name || ''],
           ['Tekniker / Installatör', wo.assigned_to_montering_name || wo.technician_name || ''],
           ['Kund', order.customer_name || '']
          ].map(([role, name]) => `
          <div class="sig-row">
            <div class="sig-field" style="max-width:120px"><div class="sig-label">${role}</div><span style="font-size:9pt;color:#555">${esc(name)}</span></div>
            <div class="sig-field"><div class="sig-label">Underskrift</div><span class="sig-line"></span></div>
            <div class="sig-field" style="max-width:130px"><div class="sig-label">Datum</div><span class="sig-line"></span></div>
          </div>`).join('')}
      </div>
    </div>

    <!-- SEKTION 11: Anteckningar & Avvikelser -->
    <div class="section">
      <div class="section-header">11 — Anteckningar &amp; Avvikelser</div>
      <div class="section-body">
        ${order.notes ? `<div class="field"><div class="field-label">Projektanteckningar</div><div class="note-box">${esc(order.notes)}</div></div>` : ''}
        ${wo.production_notes ? `<div class="field"><div class="field-label">Produktionsanteckningar</div><div class="note-box">${esc(wo.production_notes)}</div></div>` : ''}
        <div class="field" style="margin-top:12px">
          <div class="field-label">Avvikelser (fylls i av tekniker)</div>
          <div style="border:1px solid #ddd;border-radius:4px;height:60px;margin-top:4px"></div>
        </div>
        ${isRental ? `
        <div class="field" style="margin-top:10px">
          <div class="field-label">Returnoteringar (uthyrning)</div>
          <div style="border:1px solid #ddd;border-radius:4px;height:50px;margin-top:4px"></div>
        </div>` : ''}
      </div>
    </div>

  </div>

  <div class="footer">
    <span>IM Vision Group AB · Intern Arbetsorder</span>
    <span>AO: ${esc(order.order_number || wo.order_number || '—')} · ${esc(order.customer_name || wo.customer_name || '—')}</span>
    <span>Utskriven: ${fmtDT(now)}</span>
  </div>
</div>
</body>
</html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});