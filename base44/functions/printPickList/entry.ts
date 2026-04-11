import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { work_order_id } = await req.json();
    if (!work_order_id) return Response.json({ error: 'Missing work_order_id' }, { status: 400 });

    const woList = await base44.asServiceRole.entities.WorkOrder.filter({ id: work_order_id });
    const wo = woList[0];
    if (!wo) return Response.json({ error: 'Not found' }, { status: 404 });

    const [orderList, orderItems] = await Promise.all([
      wo.order_id ? base44.asServiceRole.entities.Order.filter({ id: wo.order_id }) : Promise.resolve([]),
      wo.order_id ? base44.asServiceRole.entities.OrderItem.filter({ order_id: wo.order_id }) : Promise.resolve([]),
    ]);
    const order = orderList[0] || {};

    const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('sv-SE'); } catch { return '—'; } };
    const fmtDT = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleString('sv-SE'); } catch { return '—'; } };

    const rawMaterials = (wo.materials_needed && wo.materials_needed.length > 0)
      ? wo.materials_needed
      : orderItems.map(i => ({
          article_name: i.article_name,
          article_sku: i.article_batch_number,
          shelf_address: i.shelf_address,
          quantity_needed: i.quantity_ordered,
        }));

    const materials = [...rawMaterials].sort((a, b) => {
      const sa = Array.isArray(a.shelf_address) ? a.shelf_address[0] : (a.shelf_address || '');
      const sb = Array.isArray(b.shelf_address) ? b.shelf_address[0] : (b.shelf_address || '');
      return sa.localeCompare(sb);
    });

    const totalItems = materials.reduce((s, m) => s + (m.quantity_needed || 0), 0);
    const now = new Date();

    const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Plocklista – ${esc(order.order_number || '')}</title>
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
  .info-bar { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px; }
  .info-card { border: 1px solid #e0e0e0; border-radius: 5px; padding: 10px 14px; background: #fafaf9; }
  .info-label { font-size: 7.5pt; color: #999; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
  .info-value { font-size: 11pt; font-weight: 600; color: #111; }
  .section { margin-bottom: 14px; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; }
  .section-header { background: #f0f0ed; padding: 7px 14px; font-size: 8pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #444; border-bottom: 1px solid #e0e0e0; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #111; }
  th { padding: 8px 10px; text-align: left; font-size: 8.5pt; font-weight: 600; letter-spacing: 0.04em; color: white; }
  td { padding: 7px 10px; border-bottom: 1px solid #ececec; font-size: 9.5pt; color: #222; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  .cb { font-size: 15pt; text-align: center; color: #bbb; }
  .summary-box { border-top: 2px solid #111; padding: 14px; background: #f9f9f7; }
  .summary-row { display: flex; gap: 40px; margin-bottom: 10px; font-size: 10pt; }
  .sig-row { display: flex; gap: 32px; margin-top: 8px; }
  .sig-field { flex: 1; }
  .sig-label { font-size: 8pt; color: #888; margin-bottom: 2px; }
  .sig-line { border-bottom: 1px solid #333; display: block; width: 100%; margin-top: 22px; }
  .footer { padding: 10px 28px; border-top: 1px solid #e0e0e0; font-size: 8pt; color: #aaa; display: flex; justify-content: space-between; align-items: center; background: #fafafa; }
  .print-bar { background: #1d4ed8; padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
  .print-btn { background: white; color: #1d4ed8; border: none; padding: 8px 20px; font-size: 13px; font-weight: 600; border-radius: 5px; cursor: pointer; }
  .print-info { color: rgba(255,255,255,0.8); font-size: 11px; }
</style>
</head>
<body>

<div class="no-print print-bar">
  <button class="print-btn" onclick="window.print()">🖨️ Skriv ut</button>
  <span class="print-info">PLOCKLISTA — ${esc(order.customer_name || wo.customer_name)} · ${esc(order.order_number || '—')}</span>
</div>

<div class="page">
  <div class="top-bar">
    <div>
      <div class="top-bar-logo">IM VISION</div>
      <div class="top-bar-sub">IM Vision Group AB</div>
    </div>
    <div class="top-bar-title">PLOCKLISTA</div>
    <div class="top-bar-meta">
      <div><strong>${esc(order.order_number || '—')}</strong></div>
      <div>${esc(order.customer_name || wo.customer_name || '—')}</div>
      <div>${fmtDate(now)}</div>
    </div>
  </div>

  <div class="content">
    <div class="info-bar">
      <div class="info-card"><div class="info-label">Kund</div><div class="info-value">${esc(order.customer_name || wo.customer_name || '—')}</div></div>
      <div class="info-card"><div class="info-label">Ordernummer</div><div class="info-value">${esc(order.order_number || '—')}</div></div>
      <div class="info-card"><div class="info-label">Leveransdatum</div><div class="info-value">${fmtDate(order.delivery_date)}</div></div>
    </div>

    <div class="section">
      <div class="section-header">Artiklar att plocka — sorterat på hyllplats</div>
      <table>
        <thead><tr><th style="width:32px">#</th><th>Artikel</th><th style="width:110px">Artikelnr</th><th style="width:110px">Hyllplats</th><th style="width:60px;text-align:center">Antal</th><th style="width:50px;text-align:center">☐</th></tr></thead>
        <tbody>
          ${materials.length === 0
            ? '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:24px">Inga artiklar registrerade</td></tr>'
            : materials.map((m, i) => `<tr>
              <td style="color:#999">${i + 1}</td>
              <td style="font-weight:500">${esc(m.article_name || '—')}</td>
              <td style="font-family:monospace;font-size:8.5pt;color:#555">${esc(m.article_sku || '—')}</td>
              <td style="font-weight:700">${esc(Array.isArray(m.shelf_address) ? m.shelf_address.join(', ') : (m.shelf_address || '—'))}</td>
              <td style="text-align:center;font-weight:700;font-size:12pt">${m.quantity_needed || 0}</td>
              <td class="cb">☐</td>
            </tr>`).join('')
          }
        </tbody>
      </table>
      <div class="summary-box">
        <div class="summary-row">
          <div>Totalt antal artiklar: <strong>${totalItems} st</strong></div>
          <div>Antal rader: <strong>${materials.length}</strong></div>
        </div>
        <div style="margin-bottom:8px;font-size:9.5pt;color:#555">
          Plockanteckningar: <span style="border-bottom:1px solid #333;display:inline-block;min-width:260px">&nbsp;</span>
        </div>
        <div class="sig-row">
          <div class="sig-field"><div class="sig-label">Plockad av</div><span class="sig-line"></span></div>
          <div class="sig-field" style="max-width:140px"><div class="sig-label">Datum</div><span class="sig-line"></span></div>
        </div>
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