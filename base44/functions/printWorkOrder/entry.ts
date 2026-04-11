import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { work_order_id } = await req.json();
    if (!work_order_id) return Response.json({ error: 'Missing work_order_id' }, { status: 400 });

    const woList = await base44.asServiceRole.entities.WorkOrder.filter({ id: work_order_id });
    const wo = woList[0];
    if (!wo) return Response.json({ error: 'Not found' }, { status: 404 });

    const [orderList, orderItems, externalTasks] = await Promise.all([
      wo.order_id ? base44.asServiceRole.entities.Order.filter({ id: wo.order_id }) : Promise.resolve([]),
      wo.order_id ? base44.asServiceRole.entities.OrderItem.filter({ order_id: wo.order_id }) : Promise.resolve([]),
      base44.asServiceRole.entities.Task.filter({ work_order_id }),
    ]);
    const order = orderList[0] || {};
    // Merge inline tasks (wo.tasks array) with external Task entities
    const inlineTasks = (wo.tasks || []).map(t => ({ name: t.title, description: t.notes, priority: null, assigned_to: t.assigned_name || t.assigned_to, status: t.status === 'klar' ? 'completed' : t.status === 'pågår' ? 'in_progress' : 'pending' }));
    const tasks = [...inlineTasks, ...externalTasks];

    const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('sv-SE'); } catch { return '—'; } };
    const fmtDT = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleString('sv-SE'); } catch { return '—'; } };

    const installTypeLabels = {
      ny_installation: 'Ny installation', byte_uppgradering: 'Byte/uppgradering',
      tillagg: 'Tillägg', service_reparation: 'Service/reparation', uthyrning_event: 'Uthyrning/event',
    };
    const priorityLabels = { low: 'Låg', normal: 'Normal', high: 'Hög', urgent: 'BRÅDSKANDE' };

    const materials = (wo.materials_needed && wo.materials_needed.length > 0)
      ? wo.materials_needed
      : orderItems.map(i => ({
          article_name: i.article_name,
          article_sku: i.article_batch_number,
          shelf_address: i.shelf_address,
          quantity_needed: i.quantity_ordered,
        }));
    const totalItems = materials.reduce((s, m) => s + (m.quantity_needed || 0), 0);
    const checklist = wo.checklist || {};
    const now = new Date();
    const hasNotes = order.critical_notes || order.notes || order.ordering_notes || wo.project_description || wo.picking_notes || wo.production_notes;

    const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arbetsorder – ${esc(order.order_number || wo.order_number || '')}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f4f4f0; color: #111; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print { body { background: white; } .no-print { display: none !important; } @page { size: A4 portrait; margin: 0; } }
  .page { max-width: 210mm; margin: 0 auto; background: white; min-height: 297mm; display: flex; flex-direction: column; }
  .top-bar { background: #111; color: white; padding: 20px 28px; display: flex; justify-content: space-between; align-items: center; }
  .top-bar-logo { font-size: 20pt; font-weight: 900; letter-spacing: 0.12em; }
  .top-bar-sub { font-size: 8pt; color: rgba(255,255,255,0.5); letter-spacing: 0.06em; margin-top: 2px; }
  .top-bar-title { font-size: 18pt; font-weight: 700; letter-spacing: 0.04em; text-align: center; }
  .top-bar-meta { text-align: right; font-size: 9pt; color: rgba(255,255,255,0.7); line-height: 1.7; }
  .top-bar-meta strong { color: white; }
  .content { padding: 20px 28px; flex: 1; }
  .section { margin-bottom: 14px; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; }
  .section-header { background: #f0f0ed; padding: 7px 14px; font-size: 8pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #444; border-bottom: 1px solid #e0e0e0; }
  .section-body { padding: 12px 14px; }
  .section-yellow { border-color: #f4d03f; }
  .section-yellow .section-header { background: #fef9e7; border-bottom-color: #f4d03f; color: #7d6608; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .field { margin-bottom: 10px; }
  .field:last-child { margin-bottom: 0; }
  .field-label { font-size: 7.5pt; color: #888; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
  .field-value { font-size: 10.5pt; font-weight: 500; color: #111; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #111; }
  th { padding: 8px 10px; text-align: left; font-size: 8.5pt; font-weight: 600; letter-spacing: 0.04em; color: white; }
  td { padding: 7px 10px; border-bottom: 1px solid #ececec; font-size: 9.5pt; color: #222; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  .cb { font-size: 14pt; text-align: center; color: #bbb; }
  .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .checklist-item { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f0f0f0; font-size: 10pt; }
  .note-box { white-space: pre-wrap; font-size: 10pt; line-height: 1.6; color: #333; }
  .total-row { text-align: right; font-size: 9pt; color: #555; padding: 8px 10px; }
  .sig-row { display: flex; gap: 32px; margin-bottom: 12px; }
  .sig-field { flex: 1; }
  .sig-label { font-size: 8pt; color: #888; margin-bottom: 2px; }
  .sig-line { border-bottom: 1px solid #333; display: block; width: 100%; margin-top: 24px; }
  .footer { padding: 10px 28px; border-top: 1px solid #e0e0e0; font-size: 8pt; color: #aaa; display: flex; justify-content: space-between; align-items: center; background: #fafafa; }
  .print-bar { background: #1d4ed8; padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
  .print-btn { background: white; color: #1d4ed8; border: none; padding: 8px 20px; font-size: 13px; font-weight: 600; border-radius: 5px; cursor: pointer; }
  .print-info { color: rgba(255,255,255,0.8); font-size: 11px; }
</style>
</head>
<body>

<div class="no-print print-bar">
  <button class="print-btn" onclick="window.print()">🖨️ Skriv ut</button>
  <span class="print-info">ARBETSORDER — ${esc(order.customer_name || wo.customer_name)} · ${esc(order.order_number || wo.order_number || '—')}</span>
</div>

<div class="page">
  <div class="top-bar">
    <div>
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png" alt="IM Vision" style="height:36px;object-fit:contain;display:block;" />
      <div class="top-bar-sub">IM Vision Group AB</div>
    </div>
    <div class="top-bar-title">ARBETSORDER</div>
    <div class="top-bar-meta">
      <div><strong>AO:</strong> ${esc(order.order_number || wo.order_number || '—')}</div>
      <div><strong>Datum:</strong> ${fmtDate(wo.created_date)}</div>
      <div><strong>Prioritet:</strong> ${esc(priorityLabels[wo.priority] || 'Normal')}</div>
    </div>
  </div>

  <div class="content">

    <div class="section">
      <div class="section-header">Projektinformation</div>
      <div class="section-body">
        <div class="grid2">
          <div>
            <div class="field"><div class="field-label">Kund</div><div class="field-value">${esc(order.customer_name || wo.customer_name || '—')}</div></div>
            <div class="field"><div class="field-label">Referens</div><div class="field-value">${esc(order.customer_reference || '—')}</div></div>
            <div class="field"><div class="field-label">Ordernummer</div><div class="field-value">${esc(order.order_number || '—')}</div></div>
            ${order.fortnox_project_number ? `<div class="field"><div class="field-label">Fortnox Projekt</div><div class="field-value">#${esc(order.fortnox_project_number)}${order.fortnox_project_name ? ` – ${esc(order.fortnox_project_name)}` : ''}</div></div>` : ''}
          </div>
          <div>
            <div class="field"><div class="field-label">Leveransdatum</div><div class="field-value">${fmtDate(order.delivery_date)}</div></div>
            ${order.installation_date ? `<div class="field"><div class="field-label">Installationsdatum</div><div class="field-value">${fmtDate(order.installation_date)}</div></div>` : ''}
            <div class="field"><div class="field-label">Leveransadress</div><div class="field-value">${esc(order.delivery_address || '—')}</div></div>
            <div class="field"><div class="field-label">Kontakt</div><div class="field-value">${esc([order.delivery_contact_name, order.delivery_contact_phone].filter(Boolean).join(' · ') || '—')}</div></div>
            ${order.installation_type ? `<div class="field"><div class="field-label">Installationstyp</div><div class="field-value">${esc(installTypeLabels[order.installation_type] || order.installation_type)}</div></div>` : ''}
          </div>
        </div>
      </div>
    </div>

    ${(order.screen_dimensions || order.pixel_pitch || order.module_count != null || order.site_visit_info) ? `
    <div class="section">
      <div class="section-header">Teknisk information</div>
      <div class="section-body">
        <div class="grid2">
          <div>
            ${order.screen_dimensions ? `<div class="field"><div class="field-label">Skärmdimensioner</div><div class="field-value">${esc(order.screen_dimensions)}</div></div>` : ''}
            ${order.pixel_pitch ? `<div class="field"><div class="field-label">Pixel pitch</div><div class="field-value">${esc(order.pixel_pitch)}</div></div>` : ''}
            ${order.module_count != null ? `<div class="field"><div class="field-label">Antal moduler</div><div class="field-value">${order.module_count}</div></div>` : ''}
          </div>
          ${order.site_visit_info ? `<div class="field"><div class="field-label">Platsbesöksinfo</div><div class="note-box" style="font-size:9.5pt">${esc(order.site_visit_info)}</div></div>` : ''}
        </div>
      </div>
    </div>` : ''}

    <div class="section">
      <div class="section-header">Materiallista / Plocklista</div>
      <table>
        <thead><tr><th style="width:32px">#</th><th>Artikel</th><th style="width:110px">Artikelnr</th><th style="width:100px">Hyllplats</th><th style="width:60px;text-align:center">Antal</th><th style="width:50px;text-align:center">☐</th></tr></thead>
        <tbody>
          ${materials.length === 0
            ? '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px">Inga artiklar registrerade</td></tr>'
            : materials.map((m, i) => `<tr>
              <td style="color:#999">${i + 1}</td>
              <td style="font-weight:500">${esc(m.article_name || '—')}</td>
              <td style="font-family:monospace;font-size:8.5pt;color:#555">${esc(m.article_sku || m.article_id?.slice(0,8) || '—')}</td>
              <td style="font-weight:600">${esc(Array.isArray(m.shelf_address) ? m.shelf_address.join(', ') : (m.shelf_address || '—'))}</td>
              <td style="text-align:center;font-weight:700;font-size:11pt">${m.quantity_needed || 0}</td>
              <td class="cb">☐</td>
            </tr>`).join('')
          }
        </tbody>
      </table>
      ${materials.length > 0 ? `<div class="total-row">Totalantal: <strong>${totalItems} st</strong> · ${materials.length} rader</div>` : ''}
    </div>

    <div class="section">
      <div class="section-header">Checklista</div>
      <div class="section-body">
        <div class="checklist-grid">
          ${[['picked','Material plockat'],['assembled','Monterat'],['tested','Testat'],['packed','Paketerat'],['ready_for_delivery','Redo för leverans']].map(([key, label]) =>
            `<div class="checklist-item"><span class="cb">${checklist[key] ? '☑' : '☐'}</span><span>${label}</span></div>`
          ).join('')}
        </div>
      </div>
    </div>

    ${hasNotes ? `
    <div class="section section-yellow">
      <div class="section-header">OBS / Speciella krav</div>
      <div class="section-body">
        ${order.critical_notes ? `<div class="field"><div class="field-label">Kritisk information</div><div class="note-box" style="font-weight:700;color:#7d6608">${esc(order.critical_notes)}</div></div>` : ''}
        ${order.notes ? `<div class="field"><div class="field-label">Anteckningar</div><div class="note-box">${esc(order.notes)}</div></div>` : ''}
        ${order.ordering_notes ? `<div class="field"><div class="field-label">Beställningsanteckningar</div><div class="note-box">${esc(order.ordering_notes)}</div></div>` : ''}
        ${wo.project_description ? `<div class="field"><div class="field-label">Projektbeskrivning</div><div class="note-box">${esc(wo.project_description)}</div></div>` : ''}
        ${wo.picking_notes ? `<div class="field"><div class="field-label">Plockanteckningar</div><div class="note-box">${esc(wo.picking_notes)}</div></div>` : ''}
        ${wo.production_notes ? `<div class="field"><div class="field-label">Produktionsanteckningar</div><div class="note-box">${esc(wo.production_notes)}</div></div>` : ''}
      </div>
    </div>` : ''}

    ${tasks.length > 0 ? `
    <div class="section">
      <div class="section-header">Uppgifter (${tasks.length} st)</div>
      <table>
        <thead><tr><th style="width:32px">#</th><th>Uppgift</th><th style="width:80px">Prioritet</th><th style="width:130px">Tilldelad</th><th style="width:80px">Status</th><th style="width:40px;text-align:center">☐</th></tr></thead>
        <tbody>
          ${tasks.map((task, i) => `<tr>
            <td style="color:#999">${i + 1}</td>
            <td><div style="font-weight:500">${esc(task.name || task.title || '—')}</div>${task.description ? `<div style="font-size:8.5pt;color:#888;margin-top:2px">${esc(task.description)}</div>` : ''}</td>
            <td style="font-size:9pt">${task.priority === 'high' ? 'Hög' : task.priority === 'urgent' ? 'AKUT' : task.priority === 'low' ? 'Låg' : 'Normal'}</td>
            <td style="font-size:8.5pt;color:#555">${esc(task.assigned_to || task.assigned_name || '—')}</td>
            <td style="font-size:9pt">${task.status === 'completed' || task.status === 'klar' ? 'Klar' : task.status === 'in_progress' || task.status === 'pågår' ? 'Pågår' : 'Ej påbörjad'}</td>
            <td class="cb">${(task.status === 'completed' || task.status === 'klar') ? '☑' : '☐'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <div class="section">
      <div class="section-header">Signering</div>
      <div class="section-body">
        <div class="sig-row">
          <div class="sig-field"><div class="sig-label">Godkänt av</div><span class="sig-line"></span></div>
          <div class="sig-field" style="max-width:140px"><div class="sig-label">Datum</div><span class="sig-line"></span></div>
        </div>
        <div class="sig-field"><div class="sig-label">Avvikelser / kommentarer</div><span class="sig-line" style="margin-top:40px"></span></div>
      </div>
    </div>

  </div>

  <div class="footer">
    <span>IM Vision Group AB</span>
    <span>Utskriven: ${fmtDT(now)}</span>
    <span>Sida 1 av 1</span>
  </div>
</div>
</body>
</html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});