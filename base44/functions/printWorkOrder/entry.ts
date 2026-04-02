import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { work_order_id } = await req.json();

    const [woList] = await Promise.all([
      base44.asServiceRole.entities.WorkOrder.filter({ id: work_order_id }),
    ]);

    const wo = woList[0];
    if (!wo) return Response.json({ error: 'Not found' }, { status: 404 });

    const [orderList, orderItems, activities, designerTasks] = await Promise.all([
      base44.asServiceRole.entities.Order.filter({ id: wo.order_id }),
      base44.asServiceRole.entities.OrderItem.filter({ order_id: wo.order_id }),
      base44.asServiceRole.entities.WorkOrderActivity.filter({ work_order_id }),
      base44.asServiceRole.entities.Task.filter({ work_order_id }),
    ]);
    const order = orderList[0] || {};

    const stageLabels = { picking: 'Plockning', production: 'Produktion', delivery: 'Leverans', completed: 'Klar' };
    const priorityLabels = { låg: 'Låg', normal: 'Normal', hög: 'Hög', brådskande: 'Brådskande' };
    const statusLabels = { väntande: 'Väntande', pågår: 'Pågår', klar: 'Klar', avbruten: 'Avbruten' };
    const typeLabels = { comment: 'Kommentar', system: 'System', decision: 'Beslut', assignment: 'Tilldelning', file_upload: 'Fil', status_change: 'Status', field_change: 'Fält' };

    const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('sv-SE') : '—';
    const fmtDT = (d) => d ? new Date(d).toLocaleString('sv-SE') : '—';

    const checkRows = wo.checklist ? [
      ['Plockat', wo.checklist.picked],
      ['Monterat', wo.checklist.assembled],
      ['Testat', wo.checklist.tested],
      ['Paketerat', wo.checklist.packed],
      ['Redo för leverans', wo.checklist.ready_for_delivery],
    ] : [];

    const sorted = [...(activities || [])].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arbetsorder – ${esc(wo.name || wo.order_number || '')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 20px; }
  h1 { font-size: 22px; color: #1e3a8a; }
  h2 { font-size: 13px; background: #1e3a8a; color: #fff; padding: 5px 8px; margin: 16px 0 6px; border-radius: 3px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 14px; }
  .header-right { text-align: right; color: #555; font-size: 11px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .box { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 4px; padding: 6px 8px; }
  .box .label { font-size: 10px; color: #666; margin-bottom: 2px; }
  .box .value { font-weight: bold; font-size: 12px; }
  .field { display: flex; gap: 8px; margin-bottom: 4px; }
  .field .fl { color: #555; font-weight: bold; min-width: 140px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead tr { background: #e8ecf8; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
  tr:nth-child(even) { background: #f8f9ff; }
  .check { margin-bottom: 4px; }
  .check.done { color: #16a34a; }
  .check.todo { color: #999; }
  .act-row { border-bottom: 1px solid #eee; padding: 5px 0; }
  .act-meta { font-size: 10px; color: #888; margin-bottom: 2px; }
  .act-msg { font-size: 11px; }
  .badge { display: inline-block; font-size: 10px; padding: 1px 5px; border-radius: 10px; font-weight: bold; margin-right: 4px; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-purple { background: #ede9fe; color: #6d28d9; }
  .badge-gray { background: #f3f4f6; color: #555; }
  @media print {
    body { padding: 10px; }
    @page { margin: 15mm; }
  }
</style>
</head>
<body>

<div class="header">
  <div>
    <div style="font-size:10px;color:#888;margin-bottom:4px;">ARBETSORDER</div>
    <h1>${esc(wo.name || wo.order_number || work_order_id.slice(0,8))}</h1>
    <div style="margin-top:4px;font-size:11px;color:#555;">
      Status: <strong>${esc(statusLabels[wo.status] || wo.status || '—')}</strong>
      &nbsp;|&nbsp; Fas: <strong>${esc(stageLabels[wo.current_stage] || wo.current_stage || '—')}</strong>
      &nbsp;|&nbsp; Prioritet: <strong>${esc(priorityLabels[wo.priority] || wo.priority || 'Normal')}</strong>
    </div>
  </div>
  <div class="header-right">
    <div>Utskriven: ${fmtDT(new Date())}</div>
    ${order.order_number ? `<div>Ordernr: <strong>${esc(order.order_number)}</strong></div>` : ''}
    ${wo.delivery_date || order.delivery_date ? `<div>Leverans: <strong>${esc(wo.delivery_date || order.delivery_date)}</strong></div>` : ''}
  </div>
</div>

<div class="grid">
  <div class="box"><div class="label">Kund</div><div class="value">${esc(order.customer_name || wo.customer_name || '—')}</div></div>
  <div class="box"><div class="label">Kundreferens</div><div class="value">${esc(order.customer_reference || wo.customer_reference || '—')}</div></div>
  <div class="box"><div class="label">Leveransdatum</div><div class="value">${esc(wo.delivery_date || order.delivery_date || '—')}</div></div>
</div>

${wo.technician_name || wo.assigned_to_production_name ? `
<div class="grid2">
  <div class="box"><div class="label">Tekniker</div><div class="value">${esc(wo.technician_name || wo.assigned_to_production_name)}</div></div>
  ${wo.technician_phone ? `<div class="box"><div class="label">Telefon</div><div class="value">${esc(wo.technician_phone)}</div></div>` : ''}
</div>` : ''}

${wo.delivery_contact_name ? `
<div class="grid2">
  <div class="box"><div class="label">Leveranskontakt</div><div class="value">${esc(wo.delivery_contact_name)}</div></div>
  ${wo.delivery_contact_phone ? `<div class="box"><div class="label">Telefon</div><div class="value">${esc(wo.delivery_contact_phone)}</div></div>` : ''}
</div>` : ''}

${wo.project_description ? `<h2>Projektbeskrivning</h2><p style="white-space:pre-wrap;padding:4px 0">${esc(wo.project_description)}</p>` : ''}

<h2>Orderinformation</h2>
${order.delivery_address ? `<div class="field"><span class="fl">Leveransadress</span><span>${esc(order.delivery_address)}</span></div>` : ''}
${order.delivery_method ? `<div class="field"><span class="fl">Leveranssätt</span><span>${esc(order.delivery_method)}</span></div>` : ''}
${order.fortnox_project_number ? `<div class="field"><span class="fl">Fortnox Projekt</span><span>${esc(order.fortnox_project_number)}</span></div>` : ''}
${order.notes ? `<div class="field"><span class="fl">Anteckningar</span><span>${esc(order.notes)}</span></div>` : ''}

${wo.picking_notes ? `<h2>Plockanteckningar</h2><p style="white-space:pre-wrap;padding:4px 0">${esc(wo.picking_notes)}</p>` : ''}
${wo.production_notes ? `<h2>Produktionsanteckningar</h2><p style="white-space:pre-wrap;padding:4px 0">${esc(wo.production_notes)}</p>` : ''}
${wo.deviations ? `<h2>Avvikelser / Konstruktörsanteckningar</h2><p style="white-space:pre-wrap;padding:4px 0">${esc(wo.deviations)}</p>` : ''}

${designerTasks && designerTasks.length > 0 ? `
<h2>Construction and Design Lino – Uppgifter för konstruktören</h2>
<table>
  <thead><tr><th style="width:30px"></th><th>Uppgift</th><th>Beskrivning</th><th>Tilldelad</th><th>Status</th><th>Klar</th></tr></thead>
  <tbody>
    ${designerTasks.map(task => `
    <tr>
      <td style="text-align:center;font-size:14px">${task.status === 'completed' ? '✓' : '○'}</td>
      <td style="${task.status === 'completed' ? 'text-decoration:line-through;color:#999' : 'font-weight:bold'}">${esc(task.name || '—')}</td>
      <td style="color:#555">${esc(task.description || '—')}</td>
      <td>${esc(task.assigned_to_name || task.assigned_to || '—')}</td>
      <td style="color:${task.status === 'completed' ? '#16a34a' : task.status === 'in_progress' ? '#d97706' : '#555'}">${esc(task.status === 'completed' ? 'Klar' : task.status === 'in_progress' ? 'Pågår' : 'Att göra')}</td>
      <td style="color:#16a34a;font-size:10px">${task.completed_date ? fmtDT(task.completed_date) : '—'}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

${orderItems.length > 0 ? `
<h2>Artiklar / Materiallista</h2>
<table>
  <thead><tr><th>Artikel</th><th>Batch</th><th>Hylla</th><th>Beställt</th><th>Plockat</th></tr></thead>
  <tbody>
    ${orderItems.map(item => `
    <tr>
      <td>${esc(item.article_name || item.article_id || '—')}</td>
      <td>${esc(item.article_batch_number || '—')}</td>
      <td>${esc(item.shelf_address || '—')}</td>
      <td>${item.quantity_ordered || 0}</td>
      <td style="color:${(item.quantity_picked||0)>=(item.quantity_ordered||0)?'#16a34a':(item.quantity_picked||0)>0?'#d97706':'#999'}">${item.quantity_picked || 0}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

${wo.tasks && wo.tasks.length > 0 ? `
<h2>Arbetsmoment</h2>
<table>
  <thead><tr><th>Moment</th><th>Typ</th><th>Ansvarig</th><th>Status</th></tr></thead>
  <tbody>
    ${wo.tasks.map(task => `
    <tr>
      <td>${esc(task.title || '—')}</td>
      <td>${esc(task.type || '—')}</td>
      <td>${esc(task.assigned_name || task.assigned_to || '—')}</td>
      <td>${esc(task.status || '—')}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

${checkRows.length > 0 ? `
<h2>Checklista</h2>
${checkRows.map(([label, done]) => `
<div class="check ${done ? 'done' : 'todo'}">${done ? '✓' : '○'} ${label}</div>
`).join('')}` : ''}

${wo.picking_started_date || wo.production_started_date ? `
<h2>Tider</h2>
${wo.picking_started_date ? `<div class="field"><span class="fl">Plockning startad</span><span>${fmtDT(wo.picking_started_date)}</span></div>` : ''}
${wo.picking_completed_date ? `<div class="field"><span class="fl">Plockning klar</span><span>${fmtDT(wo.picking_completed_date)}</span></div>` : ''}
${wo.production_started_date ? `<div class="field"><span class="fl">Produktion startad</span><span>${fmtDT(wo.production_started_date)}</span></div>` : ''}
${wo.production_completed_date ? `<div class="field"><span class="fl">Produktion klar</span><span>${fmtDT(wo.production_completed_date)}</span></div>` : ''}` : ''}

${sorted.length > 0 ? `
<h2>Aktivitetslogg</h2>
${sorted.map(act => `
<div class="act-row">
  <div class="act-meta">
    <span class="badge ${act.is_decision ? 'badge-purple' : act.type === 'system' ? 'badge-gray' : 'badge-blue'}">${esc(typeLabels[act.type] || act.type)}${act.is_decision ? ' ★ BESLUT' : ''}</span>
    ${esc(act.actor_name || act.actor_email || '')} &nbsp; ${fmtDT(act.created_date)}
  </div>
  <div class="act-msg">${esc(act.message || '—')}</div>
  ${act.type === 'field_change' && act.old_value && act.new_value ? `<div style="font-size:10px;color:#888">${esc(act.field_name||'')}: "${esc(act.old_value)}" → "${esc(act.new_value)}"</div>` : ''}
</div>`).join('')}` : ''}

<div style="margin-top:30px;border-top:1px solid #ccc;padding-top:6px;font-size:10px;color:#888;display:flex;justify-content:space-between;">
  <span>IMvision – Arbetsorder</span>
  <span>${esc(wo.name || wo.order_number || '')}</span>
</div>

<script>window.onload = () => window.print();</script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});