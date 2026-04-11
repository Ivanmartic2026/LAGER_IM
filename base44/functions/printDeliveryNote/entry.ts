import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { order_id } = await req.json();
    if (!order_id) return Response.json({ error: 'Missing order_id' }, { status: 400 });

    const [orderList, orderItems] = await Promise.all([
      base44.asServiceRole.entities.Order.filter({ id: order_id }),
      base44.asServiceRole.entities.OrderItem.filter({ order_id }),
    ]);
    const order = orderList[0];
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('sv-SE'); } catch { return '—'; } };
    const fmtDT = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleString('sv-SE'); } catch { return '—'; } };

    const deliveryMethodLabels = {
      truck: 'Lastbil', courier: 'Budkurir', pickup: 'Hämtas',
      air_freight: 'Flygfrakt', sea_freight: 'Sjöfrakt', other: 'Annat',
    };

    const totalItems = orderItems.reduce((s, i) => s + (i.quantity_ordered || 0), 0);
    const now = new Date();

    const hasDeliveryInfo = order.delivery_date || order.delivery_method || order.shipping_company || order.tracking_number || order.customer_reference;

    const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Leveranssedel – ${esc(order.order_number || order_id.slice(0,8))}</title>
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
  .address-block { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .address-card { border: 1px solid #e0e0e0; border-radius: 5px; padding: 12px 14px; }
  .address-label { font-size: 7.5pt; color: #999; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px; }
  .address-content { font-size: 10.5pt; line-height: 1.7; color: #111; }
  .section { margin-bottom: 14px; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; }
  .section-header { background: #f0f0ed; padding: 7px 14px; font-size: 8pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #444; border-bottom: 1px solid #e0e0e0; }
  .section-body { padding: 12px 14px; }
  .delivery-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
  .field { margin-bottom: 0; }
  .field-label { font-size: 7.5pt; color: #999; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
  .field-value { font-size: 10.5pt; font-weight: 500; color: #111; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #111; }
  th { padding: 8px 10px; text-align: left; font-size: 8.5pt; font-weight: 600; letter-spacing: 0.04em; color: white; }
  td { padding: 7px 10px; border-bottom: 1px solid #ececec; font-size: 9.5pt; color: #222; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  .total-row td { background: #f0f0ed !important; font-weight: 700; border-top: 2px solid #ddd; }
  .confirmation-box { border-top: 2px solid #111; padding: 16px 14px; background: #f9f9f7; }
  .conf-text { font-size: 9.5pt; color: #555; font-style: italic; margin-bottom: 16px; }
  .sig-row { display: flex; gap: 32px; margin-bottom: 14px; }
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
  <span class="print-info">LEVERANSSEDEL — ${esc(order.customer_name)} · ${esc(order.order_number || '—')}</span>
</div>

<div class="page">
  <div class="top-bar">
    <div>
      <div class="top-bar-logo">IM VISION</div>
      <div class="top-bar-sub">IM Vision Group AB</div>
    </div>
    <div class="top-bar-title">LEVERANSSEDEL</div>
    <div class="top-bar-meta">
      <div><strong>Nr: ${esc(order.order_number || order_id.slice(0,8))}</strong></div>
      <div>${fmtDate(now)}</div>
    </div>
  </div>

  <div class="content">
    <div class="address-block">
      <div class="address-card">
        <div class="address-label">Avsändare</div>
        <div class="address-content"><strong>IM Vision Group AB</strong><br>Göteborg, Sverige</div>
      </div>
      <div class="address-card">
        <div class="address-label">Mottagare</div>
        <div class="address-content">
          <strong>${esc(order.customer_name)}</strong><br>
          ${order.delivery_address ? `${esc(order.delivery_address)}<br>` : ''}
          ${order.delivery_contact_name ? `${esc(order.delivery_contact_name)}<br>` : ''}
          ${order.delivery_contact_phone ? esc(order.delivery_contact_phone) : ''}
        </div>
      </div>
    </div>

    ${hasDeliveryInfo ? `
    <div class="section">
      <div class="section-header">Leveransinformation</div>
      <div class="section-body">
        <div class="delivery-info">
          ${order.delivery_date ? `<div class="field"><div class="field-label">Leveransdatum</div><div class="field-value">${fmtDate(order.delivery_date)}</div></div>` : ''}
          ${order.delivery_method ? `<div class="field"><div class="field-label">Leveranssätt</div><div class="field-value">${esc(deliveryMethodLabels[order.delivery_method] || order.delivery_method)}</div></div>` : ''}
          ${order.shipping_company ? `<div class="field"><div class="field-label">Speditör</div><div class="field-value">${esc(order.shipping_company)}</div></div>` : ''}
          ${order.tracking_number ? `<div class="field"><div class="field-label">Spårningsnummer</div><div class="field-value" style="font-family:monospace">${esc(order.tracking_number)}</div></div>` : ''}
          ${order.customer_reference ? `<div class="field"><div class="field-label">Er referens</div><div class="field-value">${esc(order.customer_reference)}</div></div>` : ''}
        </div>
      </div>
    </div>` : ''}

    <div class="section">
      <div class="section-header">Artiklar</div>
      <table>
        <thead><tr><th style="width:32px">#</th><th>Artikel</th><th style="width:120px">Artikelnr</th><th style="width:80px;text-align:center">Antal</th><th style="width:60px;text-align:center">Enhet</th></tr></thead>
        <tbody>
          ${orderItems.length === 0
            ? '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:24px">Inga artiklar</td></tr>'
            : orderItems.map((item, i) => `<tr>
              <td style="color:#999">${i + 1}</td>
              <td style="font-weight:500">${esc(item.article_name || '—')}</td>
              <td style="font-family:monospace;font-size:8.5pt;color:#555">${esc(item.article_batch_number || '—')}</td>
              <td style="text-align:center;font-weight:700">${item.quantity_ordered || 0}</td>
              <td style="text-align:center;color:#777">st</td>
            </tr>`).join('')
          }
          ${orderItems.length > 0 ? `<tr class="total-row">
            <td colspan="3" style="text-align:right;padding-right:16px">Totalt:</td>
            <td style="text-align:center">${totalItems}</td>
            <td style="text-align:center">st</td>
          </tr>` : ''}
        </tbody>
      </table>
      <div class="confirmation-box">
        <div class="conf-text">Ovanstående artiklar har mottagits i gott skick och utan synliga transportskador.</div>
        <div class="sig-row">
          <div class="sig-field"><div class="sig-label">Mottaget av (namnförtydligande)</div><span class="sig-line"></span></div>
          <div class="sig-field" style="max-width:140px"><div class="sig-label">Datum</div><span class="sig-line"></span></div>
        </div>
        <div class="sig-field"><div class="sig-label">Signatur</div><span class="sig-line" style="margin-top:28px"></span></div>
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