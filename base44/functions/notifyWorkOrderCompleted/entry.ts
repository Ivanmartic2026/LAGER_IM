import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_ID = 'mp08u6gAFPz2';
const CLIENT_SECRET = 'GjAMHv9Mm7wZW356pZmLdkkBlie0QaPg';
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function getFortnoxToken(base44) {
  const configs = await base44.asServiceRole.entities.FortnoxConfig.list();
  if (!configs || configs.length === 0) throw new Error('Fortnox inte ansluten');
  const config = configs[0];
  const now = Date.now();
  if (config.access_token && config.token_expires_at && (config.token_expires_at - 300000) > now) {
    return config.access_token;
  }
  if (!config.refresh_token) throw new Error('Ingen refresh token');
  const credentials = btoa(CLIENT_ID + ':' + CLIENT_SECRET);
  const response = await fetch('https://apps.fortnox.se/oauth-v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + credentials },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(config.refresh_token)
  });
  const text = await response.text();
  if (!response.ok) throw new Error('Token refresh failed: ' + text);
  const data = JSON.parse(text);
  const expiresAt = now + ((data.expires_in || 3600) * 1000);
  await base44.asServiceRole.entities.FortnoxConfig.update(config.id, {
    access_token: data.access_token,
    token_expires_at: expiresAt,
    refresh_token: data.refresh_token || config.refresh_token
  });
  return data.access_token;
}

async function createFortnoxOrder(base44, order, orderItems) {
  const accessToken = await getFortnoxToken(base44);

  const rows = orderItems.map(item => ({
    ArticleNumber: item.article_sku || '',
    Description: item.article_name || '',
    OrderedQuantity: item.quantity_ordered || 0,
    Price: 0
  }));

  const fortnoxOrderData = {
    CustomerNumber: order.fortnox_customer_number || '',
    YourOrderNumber: order.order_number || '',
    DeliveryDate: order.delivery_date || new Date().toISOString().split('T')[0],
    OrderRows: rows
  };

  const response = await fetch(`${FORTNOX_API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ Order: fortnoxOrderData })
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Fortnox API error: ${response.status} - ${text}`);
  const data = JSON.parse(text);
  return data.Order || {};
}

async function sendEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'IMvision System <noreply@imvision.se>',
      to,
      subject,
      html
    })
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Email error:', err);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { work_order_id } = await req.json();

    if (!work_order_id) {
      return Response.json({ error: 'Missing work_order_id' }, { status: 400 });
    }

    // Fetch work order
    const woList = await base44.asServiceRole.entities.WorkOrder.filter({ id: work_order_id });
    const workOrder = woList[0];
    if (!workOrder) return Response.json({ error: 'WorkOrder not found' }, { status: 404 });

    // Fetch order
    const orderList = await base44.asServiceRole.entities.Order.filter({ id: workOrder.order_id });
    const order = orderList[0];
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    // Fetch order items
    const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ order_id: order.id });

    let fortnoxResult = null;
    let fortnoxError = null;

    // Sync to Fortnox if not already done
    if (!order.fortnox_order_id && order.fortnox_customer_number) {
      try {
        const fn = await createFortnoxOrder(base44, order, orderItems);
        fortnoxResult = fn;
        // Save Fortnox order ID on the order
        await base44.asServiceRole.entities.Order.update(order.id, {
          fortnox_order_id: fn.OrderNumber,
          fortnox_document_number: fn.DocumentNumber
        });
      } catch (e) {
        fortnoxError = e.message;
        console.error('Fortnox sync failed:', e.message);
      }
    } else if (order.fortnox_order_id) {
      fortnoxResult = { OrderNumber: order.fortnox_order_id };
    }

    // Build email
    const fortnoxInfo = fortnoxResult
      ? `<p><strong>Fortnox ordernummer:</strong> ${fortnoxResult.OrderNumber || '—'}</p>`
      : fortnoxError
        ? `<p style="color:orange"><strong>OBS:</strong> Fortnox-synk misslyckades: ${fortnoxError}</p>`
        : `<p style="color:orange"><strong>OBS:</strong> Inget Fortnox-kundnummer kopplat — synka manuellt.</p>`;

    const itemsHtml = orderItems.map(item =>
      `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${item.article_name || '—'}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity_ordered}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${item.status || '—'}</td>
      </tr>`
    ).join('');

    const emailHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#222">
        <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">✅ Arbetsorder slutförd</h1>
        </div>
        <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #eee">
          <p>Följande arbetsorder har slutförts och är redo för fakturering:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 12px;font-weight:bold;width:40%">Order:</td><td style="padding:6px 12px">${order.order_number || '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold">Kund:</td><td style="padding:6px 12px">${order.customer_name || '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold">Leveransdatum:</td><td style="padding:6px 12px">${order.delivery_date || '—'}</td></tr>
          </table>

          ${fortnoxInfo}

          <h3 style="margin-top:24px">Artiklar:</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead>
              <tr style="background:#eee">
                <th style="padding:8px 12px;text-align:left">Artikel</th>
                <th style="padding:8px 12px;text-align:center">Antal</th>
                <th style="padding:8px 12px;text-align:left">Status</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <p style="margin-top:24px;color:#666;font-size:13px">
            Ordern är plockad och klar — vänligen gå in i Fortnox och skapa faktura.
          </p>
        </div>
      </div>
    `;

    await sendEmail(
      'info@imvision.se',
      `✅ Klar för fakturering: ${order.order_number || order.customer_name}`,
      emailHtml
    );

    return Response.json({
      success: true,
      fortnox_order_id: fortnoxResult?.OrderNumber || null,
      fortnox_error: fortnoxError
    });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});