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

    const [orderList, orderItems, activities, designerTasks, articles] = await Promise.all([
      base44.asServiceRole.entities.Order.filter({ id: wo.order_id }),
      base44.asServiceRole.entities.OrderItem.filter({ order_id: wo.order_id }),
      base44.asServiceRole.entities.WorkOrderActivity.filter({ work_order_id }),
      base44.asServiceRole.entities.Task.filter({ work_order_id }),
      base44.asServiceRole.entities.Article.list(),
    ]);
    const order = orderList[0] || {};
    
    // Enrich orderItems with article ETA data
    const enrichedItems = orderItems.map(item => {
      const article = articles.find(a => a.id === item.article_id);
      return {
        ...item,
        transit_expected_date: article?.transit_expected_date || item.transit_expected_date
      };
    });

    const stageLabels = { picking: 'Picking', production: 'Production', delivery: 'Delivery', completed: 'Completed' };
    const priorityLabels = { låg: 'Low', normal: 'Normal', hög: 'High', brådskande: 'Urgent', low: 'Low', high: 'High', urgent: 'Urgent' };
    const statusLabels = { väntande: 'Pending', pågår: 'In Progress', klar: 'Done', avbruten: 'Cancelled' };
    const typeLabels = { comment: 'Comment', system: 'System', decision: 'Decision', assignment: 'Assignment', file_upload: 'File', status_change: 'Status', field_change: 'Field' };

    const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('sv-SE') : '—';
    const fmtDT = (d) => d ? new Date(d).toLocaleString('sv-SE') : '—';

    const checkRows = wo.checklist ? [
      ['Picked', wo.checklist.picked],
      ['Assembled', wo.checklist.assembled],
      ['Tested', wo.checklist.tested],
      ['Packed', wo.checklist.packed],
      ['Ready for delivery', wo.checklist.ready_for_delivery],
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
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 0; margin: 0; }
  .page { padding: 28px 32px; }
  h1 { font-size: 22px; color: #111; margin: 0; }
  h2 { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; background: #111; color: #fff; padding: 5px 10px; margin: 18px 0 6px; border-radius: 4px; }
  .top-bar { background: #000; color: #fff; padding: 14px 32px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 0; }
  .top-bar-right { text-align: right; font-size: 11px; opacity: 0.85; }
  .logo { height: 32px; object-fit: contain; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 14px; margin-top: 14px; }
  .header-right { text-align: right; color: #555; font-size: 11px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .box { background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; padding: 6px 8px; }
  .box .label { font-size: 10px; color: #666; margin-bottom: 2px; }
  .box .value { font-weight: bold; font-size: 12px; }
  .field { display: flex; gap: 8px; margin-bottom: 4px; }
  .field .fl { color: #555; font-weight: bold; min-width: 140px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead tr { background: #e5e5e5; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
  tr:nth-child(even) { background: #fafafa; }
  .check { margin-bottom: 4px; }
  .check.done { color: #16a34a; }
  .check.todo { color: #999; }
  .act-row { border-bottom: 1px solid #eee; padding: 5px 0; }
  .act-meta { font-size: 10px; color: #888; margin-bottom: 2px; }
  .act-msg { font-size: 11px; }
  .badge { display: inline-block; font-size: 10px; padding: 1px 5px; border-radius: 10px; font-weight: bold; margin-right: 4px; }
  .badge-blue { background: #e5e7eb; color: #111; }
  .badge-purple { background: #ede9fe; color: #6d28d9; }
  .badge-gray { background: #f3f4f6; color: #555; }
  @media print {
    body { padding: 10px; }
    @page { margin: 15mm; size: A4; }
  }
</style>
</head>
<body>

<div class="top-bar">
  <img src="https://media.base44.com/images/public/69455d52c9eab36b7d26cc74/81c7616fb_LogoLIGGANDE_IMvision_VITtkopia.png" class="logo" alt="IMvision" />
  <div class="top-bar-right">
    <div style="font-size:13px;font-weight:bold;letter-spacing:0.05em">WORK ORDER</div>
    <div style="margin-top:2px">${esc(wo.name || wo.order_number || '')}</div>
  </div>
</div>

<div class="page">
<div class="header">
  <div>
    <div style="font-size:10px;color:#888;margin-bottom:4px;">WORK ORDER</div>
    <h1>${esc(wo.name || wo.order_number || work_order_id.slice(0,8))}</h1>
    <div style="margin-top:4px;font-size:11px;color:#555;">
      Status: <strong>${esc(statusLabels[wo.status] || wo.status || '—')}</strong>
      &nbsp;|&nbsp; Stage: <strong>${esc(stageLabels[wo.current_stage] || wo.current_stage || '—')}</strong>
      &nbsp;|&nbsp; Priority: <strong>${esc(priorityLabels[wo.priority] || wo.priority || 'Normal')}</strong>
    </div>
  </div>
  <div class="header-right">
    <div>Printed: ${fmtDT(new Date())}</div>
    ${order.order_number ? `<div>Order No: <strong>${esc(order.order_number)}</strong></div>` : ''}
    ${wo.delivery_date || order.delivery_date ? `<div>Delivery: <strong>${esc(wo.delivery_date || order.delivery_date)}</strong></div>` : ''}
  </div>
</div>

<div class="grid">
  <div class="box"><div class="label">Customer</div><div class="value">${esc(order.customer_name || wo.customer_name || '—')}</div></div>
  <div class="box"><div class="label">Customer Reference</div><div class="value">${esc(order.customer_reference || wo.customer_reference || '—')}</div></div>
  <div class="box"><div class="label">Delivery Date</div><div class="value">${esc(wo.delivery_date || order.delivery_date || '—')}</div></div>
</div>

${wo.technician_name || wo.assigned_to_production_name ? `
<div class="grid2">
  <div class="box"><div class="label">Technician</div><div class="value">${esc(wo.technician_name || wo.assigned_to_production_name)}</div></div>
  ${wo.technician_phone ? `<div class="box"><div class="label">Phone</div><div class="value">${esc(wo.technician_phone)}</div></div>` : ''}
</div>` : ''}

${wo.delivery_contact_name ? `
<div class="grid2">
  <div class="box"><div class="label">Delivery Contact</div><div class="value">${esc(wo.delivery_contact_name)}</div></div>
  ${wo.delivery_contact_phone ? `<div class="box"><div class="label">Phone</div><div class="value">${esc(wo.delivery_contact_phone)}</div></div>` : ''}
</div>` : ''}

${wo.project_description ? `<h2>Project Description</h2><p style="white-space:pre-wrap;padding:4px 0">${esc(wo.project_description)}</p>` : ''}

<h2>Order Information</h2>
${order.delivery_address ? `<div class="field"><span class="fl">Delivery Address</span><span>${esc(order.delivery_address)}</span></div>` : ''}
${order.delivery_method ? `<div class="field"><span class="fl">Delivery Method</span><span>${esc(order.delivery_method)}</span></div>` : ''}
${order.fortnox_project_number ? `<div class="field"><span class="fl">Fortnox Project</span><span>${esc(order.fortnox_project_number)}</span></div>` : ''}
${order.notes ? `<div class="field"><span class="fl">Notes</span><span>${esc(order.notes)}</span></div>` : ''}

${wo.picking_notes ? `<h2>Picking Notes</h2><p style="white-space:pre-wrap;padding:4px 0">${esc(wo.picking_notes)}</p>` : ''}
${wo.production_notes ? `<h2>Production Notes</h2><p style="white-space:pre-wrap;padding:4px 0">${esc(wo.production_notes)}</p>` : ''}
${wo.deviations ? `<h2>Deviations / Designer Notes</h2><p style="white-space:pre-wrap;padding:4px 0">${esc(wo.deviations)}</p>` : ''}

${designerTasks && designerTasks.length > 0 ? `
<h2>Designer / Engineering Tasks</h2>
<table>
  <thead><tr><th style="width:30px"></th><th>Task</th><th>Description</th><th>Assigned To</th><th>Status</th><th>Completed</th></tr></thead>
  <tbody>
    ${designerTasks.map(task => `
    <tr>
      <td style="text-align:center;font-size:14px">${task.status === 'completed' ? '✓' : '○'}</td>
      <td style="${task.status === 'completed' ? 'text-decoration:line-through;color:#999' : 'font-weight:bold'}">${esc(task.name || '—')}</td>
      <td style="color:#555">${esc(task.description || '—')}</td>
      <td>${esc(task.assigned_to_name || task.assigned_to || '—')}</td>
      <td style="color:${task.status === 'completed' ? '#16a34a' : task.status === 'in_progress' ? '#d97706' : '#555'}">${esc(task.status === 'completed' ? 'Done' : task.status === 'in_progress' ? 'In Progress' : 'To Do')}</td>
      <td style="color:#16a34a;font-size:10px">${task.completed_date ? fmtDT(task.completed_date) : '—'}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

${enrichedItems.length > 0 ? `
<h2>Articles / Material List</h2>
<table>
  <thead><tr><th>Article</th><th>Batch</th><th>Shelf</th><th>Ordered</th><th>Picked</th><th>ETA</th></tr></thead>
  <tbody>
    ${enrichedItems.map(item => `
    <tr>
      <td>${esc(item.article_name || item.article_id || '—')}</td>
      <td>${esc(item.article_batch_number || '—')}</td>
      <td>${esc(item.shelf_address || '—')}</td>
      <td>${item.quantity_ordered || 0}</td>
      <td style="color:${(item.quantity_picked||0)>=(item.quantity_ordered||0)?'#16a34a':(item.quantity_picked||0)>0?'#d97706':'#999'}">${item.quantity_picked || 0}</td>
      <td style="color:#2563eb;font-size:10px">${esc(item.transit_expected_date || item.eta || '—')}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

${wo.tasks && wo.tasks.length > 0 ? `
<h2>Work Tasks</h2>
<table>
  <thead><tr><th>Task</th><th>Type</th><th>Assigned</th><th>Status</th></tr></thead>
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
<h2>Checklist</h2>
${checkRows.map(([label, done]) => `
<div class="check ${done ? 'done' : 'todo'}">${done ? '✓' : '○'} ${label}</div>
`).join('')}` : ''}

${wo.picking_started_date || wo.production_started_date ? `
<h2>Timeline</h2>
${wo.picking_started_date ? `<div class="field"><span class="fl">Picking started</span><span>${fmtDT(wo.picking_started_date)}</span></div>` : ''}
${wo.picking_completed_date ? `<div class="field"><span class="fl">Picking completed</span><span>${fmtDT(wo.picking_completed_date)}</span></div>` : ''}
${wo.production_started_date ? `<div class="field"><span class="fl">Production started</span><span>${fmtDT(wo.production_started_date)}</span></div>` : ''}
${wo.production_completed_date ? `<div class="field"><span class="fl">Production completed</span><span>${fmtDT(wo.production_completed_date)}</span></div>` : ''}` : ''}



</div><!-- end .page -->

<div style="background:#000;color:rgba(255,255,255,0.7);font-size:10px;padding:8px 32px;display:flex;justify-content:space-between;margin-top:30px;">
  <span>IMvision AB – Work Order</span>
  <span>${esc(wo.name || wo.order_number || '')} &nbsp;|&nbsp; ${fmtDT(new Date())}</span>
</div>

<div style="position:fixed;bottom:24px;right:24px;z-index:999;display:flex;gap:10px;" class="no-print">
  <button onclick="window.print()" style="background:#000;color:#fff;border:none;padding:10px 22px;border-radius:6px;font-size:13px;font-weight:bold;cursor:pointer;letter-spacing:0.05em;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
    🖨️ Print
  </button>
</div>
<style>.no-print { } @media print { .no-print { display: none !important; } }</style>
<script>window.onload = () => {};</script>
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