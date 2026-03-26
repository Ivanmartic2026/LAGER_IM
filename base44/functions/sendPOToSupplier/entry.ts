import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchaseOrderId, emailTo, supplierPortalUrl } = await req.json();

    if (!purchaseOrderId) {
      return Response.json({ error: 'Missing purchaseOrderId' }, { status: 400 });
    }

    const [po] = await base44.asServiceRole.entities.PurchaseOrder.filter({ id: purchaseOrderId });
    
    if (!po) {
      return Response.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    const items = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ 
      purchase_order_id: purchaseOrderId 
    });

    let supplier = null;
    if (po.supplier_id) {
      const suppliers = await base44.asServiceRole.entities.Supplier.filter({ id: po.supplier_id });
      supplier = suppliers[0] || null;
    }

    const poNum = po.po_number || `PO-${purchaseOrderId.slice(0, 8)}`;
    const email = emailTo || (supplier ? supplier.email : null);

    if (!email) {
      return Response.json({ error: 'No email address provided or found' }, { status: 400 });
    }

    // Generate PO HTML
    let totalCost = 0;
    const itemsHtml = items.map(item => {
      const itemTotal = item.quantity_ordered * (item.unit_price || 0);
      totalCost += itemTotal;
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-weight: 600;">${item.article_sku || 'N/A'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.article_name || 'N/A'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.article_batch_number || '-'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity_ordered}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(item.unit_price || 0).toLocaleString('sv-SE')} kr</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${itemTotal.toLocaleString('sv-SE')} kr</td>
        </tr>
      `;
    }).join('');

    // Email body with supplier portal link
    const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0;">
  <div style="max-width:700px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <div style="background:#1e293b;padding:32px 40px;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Ny Purchase Order från IM Vision Group AB</h1>
    </div>

    <div style="padding:32px 40px;">

      <div style="margin-bottom:28px;padding:20px;background:#f0fdf4;border:1px solid #22c55e;border-radius:8px;">
        <h2 style="margin:0 0 12px;color:#15803d;font-size:16px;font-weight:600;">✓ Bekräfta & Ladda upp dokument</h2>
        <p style="margin:0 0 12px;color:#166534;font-size:13px;">Använd länken nedan för att bekräfta denna order och ladda upp alla nödvändiga dokument (leveranspapper, kvalitetsrapporter, batch-filer, etc.).</p>
        <a href="${supplierPortalUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;white-space:nowrap;">→ Öppna Leverantörsportal</a>
      </div>

      <h2 style="font-size:16px;color:#1e293b;margin:0 0 16px;">Orderinformation</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:6px 0;color:#64748b;width:180px;">PO-nummer</td><td style="padding:6px 0;font-weight:600;color:#1e293b;">${poNum}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Orderdatum</td><td style="padding:6px 0;color:#1e293b;">${po.order_date || '—'}</td></tr>
        ${po.expected_delivery_date ? `<tr><td style="padding:6px 0;color:#64748b;">Förväntad leverans</td><td style="padding:6px 0;color:#1e293b;">${new Date(po.expected_delivery_date).toLocaleDateString('sv-SE')}</td></tr>` : ''}
        ${po.delivery_terms ? `<tr><td style="padding:6px 0;color:#64748b;">Leveransvillkor</td><td style="padding:6px 0;color:#1e293b;">${po.delivery_terms}</td></tr>` : ''}
        ${po.payment_terms ? `<tr><td style="padding:6px 0;color:#64748b;">Betalningsvillkor</td><td style="padding:6px 0;color:#1e293b;">${po.payment_terms}</td></tr>` : ''}
      </table>

      <h2 style="font-size:16px;color:#1e293b;margin:0 0 12px;">Orderrader</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">SKU</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Benämning</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Batch</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Antal</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Enhetspris</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Summa</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr style="background:#1e293b;">
            <td colspan="5" style="padding:12px;text-align:right;font-weight:700;color:#ffffff;font-size:15px;">Totalt</td>
            <td style="padding:12px;text-align:right;font-weight:700;color:#ffffff;font-size:16px;">${totalCost.toLocaleString('sv-SE')} kr</td>
          </tr>
        </tfoot>
      </table>

      ${po.notes ? `<div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-weight:600;font-size:12px;color:#1e40af;text-transform:uppercase;">Noteringar</p>
        <p style="margin:0;font-size:13px;color:#475569;">${po.notes}</p>
      </div>` : ''}

      <div style="background:#f0f4f8;border-left:4px solid #2563eb;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-weight:600;font-size:12px;color:#1e40af;text-transform:uppercase;">Nästa steg:</p>
        <ol style="margin:0;padding-left:20px;font-size:13px;color:#1e40af;line-height:1.6;">
          <li>Bekräfta mottagandet av denna order i leverantörsportalen</li>
          <li>Ladda upp alla nödvändiga dokument innan leveransen</li>
          <li>Meddela oss innan leveransen skickas</li>
        </ol>
      </div>

      <div style="border-top:1px solid #e2e8f0;padding-top:20px;color:#94a3b8;font-size:12px;">
        Kontaktperson: Ivan Martic, ivan@imvision.se | +46 73 913 01 29
      </div>
    </div>
  </div>
</body>
</html>`;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'IMvision Lager <noreply@imvision.se>',
        to: [email],
        subject: `Purchase Order ${poNum} – Bekräfta & Ladda upp dokument`,
        html: emailBody,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      return Response.json({ error: `Resend error: ${err}` }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending PO to supplier:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});