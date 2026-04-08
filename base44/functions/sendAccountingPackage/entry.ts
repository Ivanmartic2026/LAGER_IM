import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Reuse the exact same HTML generation as printPurchaseOrder
async function generatePOHtml(base44, purchaseOrderId) {
  const [po] = await base44.asServiceRole.entities.PurchaseOrder.filter({ id: purchaseOrderId });
  if (!po) return null;

  const items = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ purchase_order_id: purchaseOrderId });
  const receivingRecords = await base44.asServiceRole.entities.ReceivingRecord.filter({ purchase_order_id: purchaseOrderId });

  let supplier = null;
  if (po.supplier_id) {
    const suppliers = await base44.asServiceRole.entities.Supplier.filter({ id: po.supplier_id });
    supplier = suppliers[0] || null;
  }

  let totalCost = 0;
  const itemsHtml = items.map(item => {
    const itemTotal = item.quantity_ordered * (item.unit_price || 0);
    totalCost += itemTotal;
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.article_name || 'N/A'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.article_batch_number || '-'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity_ordered}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(item.unit_price || 0).toLocaleString('sv-SE')} kr</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${itemTotal.toLocaleString('sv-SE')} kr</td>
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; padding: 40px; background: #ffffff; margin: 0; min-height: 100vh; }
    @media print {
      body { padding: 0; margin: 0; }
      .container { border: none; }
      .header { background: #000000 !important; color: white !important; }
      .logo { filter: brightness(0) invert(1) !important; }
      h1 { color: white !important; }
      th { background: #000000 !important; color: white !important; }
      .total-row td { background: #000000 !important; color: white !important; }
    }
    .container { max-width: 900px; margin: 0 auto; background: white; border: 1px solid #000000; overflow: hidden; }
    .header { background: #000000; padding: 40px; color: white; position: relative; }
    .logo { height: 45px; margin-bottom: 20px; filter: brightness(0) invert(1); }
    h1 { font-size: 32px; margin: 0; font-weight: 600; letter-spacing: -0.5px; }
    .content { padding: 40px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #fafafa; padding: 25px; border: 1px solid #e0e0e0; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 11px; text-transform: uppercase; color: #666666; font-weight: 500; letter-spacing: 0.8px; margin-bottom: 6px; }
    .info-value { font-size: 15px; color: #000000; font-weight: 500; }
    .supplier-box { background: #f5f5f5; padding: 25px; margin-bottom: 30px; border-left: 3px solid #000000; }
    .supplier-label { font-size: 11px; text-transform: uppercase; color: #666666; font-weight: 500; letter-spacing: 0.8px; margin-bottom: 10px; }
    .supplier-name { font-size: 17px; color: #000000; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; border: 1px solid #e0e0e0; }
    th { background: #000000; padding: 14px 12px; text-align: left; font-weight: 500; color: white; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; }
    td { padding: 14px 12px; border-bottom: 1px solid #e0e0e0; background: white; color: #000000; font-size: 14px; }
    tbody tr:last-child td { border-bottom: none; }
    .total-row { background: #000000 !important; font-weight: 600; font-size: 18px; }
    .total-row td { color: white !important; border-bottom: none; padding: 18px 12px; }
    .notes { margin-top: 30px; padding: 25px; background: #fafafa; border-left: 3px solid #000000; }
    .notes-label { font-weight: 500; margin-bottom: 10px; color: #000000; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; }
    .notes-text { color: #333333; line-height: 1.6; font-size: 14px; }
    .footer { margin-top: 40px; padding: 25px 40px; background: #fafafa; text-align: center; color: #666666; font-size: 11px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png" alt="IM Vision" class="logo" crossorigin="anonymous" />
      <h1>PURCHASE ORDER</h1>
    </div>
    <div class="content">
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Order Number</div>
          <div class="info-value">${po.po_number || po.id.slice(0, 8)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Order Date</div>
          <div class="info-value">${new Date(po.order_date || po.created_date).toLocaleDateString('sv-SE')}</div>
        </div>
        ${po.expected_delivery_date ? `
        <div class="info-item">
          <div class="info-label">Expected Delivery Date</div>
          <div class="info-value">${new Date(po.expected_delivery_date).toLocaleDateString('sv-SE')}</div>
        </div>` : ''}
        ${po.fortnox_project_number ? `
        <div class="info-item">
          <div class="info-label">Fortnox Project</div>
          <div class="info-value">${po.fortnox_project_number}</div>
        </div>` : ''}
        ${po.payment_terms ? `
        <div class="info-item">
          <div class="info-label">Payment Terms</div>
          <div class="info-value">${po.payment_terms}</div>
        </div>` : ''}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
        <div style="background: #f5f5f5; padding: 25px; border-left: 3px solid #000000;">
          <div class="supplier-label">Purchasing Company / Buyer</div>
          <div style="font-size: 16px; font-weight: 700; color: #000000; margin-bottom: 8px;">IM Vision Group AB</div>
          <div style="font-size: 13px; color: #444444; line-height: 1.8;">
            Herkulesvägen 56<br/>
            553 02 Jönköping<br/>
            Sweden<br/>
            <br/>
            Org.nr: 556924-1200<br/>
            <br/>
            <strong>Ivan Martic</strong><br/>
            ivan@imvision.se<br/>
            +46 73 913 01 29
          </div>
        </div>
        <div class="supplier-box" style="margin-bottom: 0;">
          <div class="supplier-label">Supplier</div>
          <div class="supplier-name">${po.supplier_name}</div>
          ${supplier && (supplier.contact_person || supplier.email || supplier.phone) ? `
            <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 4px;">
              ${supplier.contact_person ? `<div style="font-size: 13px; color: #444444;">Kontaktperson: <strong>${supplier.contact_person}</strong></div>` : ''}
              ${supplier.email ? `<div style="font-size: 13px; color: #444444;">Email: <strong>${supplier.email}</strong></div>` : ''}
              ${supplier.phone ? `<div style="font-size: 13px; color: #444444;">Telefon: <strong>${supplier.phone}</strong></div>` : ''}
            </div>
          ` : ''}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px;">
        <div style="background: #fafafa; padding: 15px; border: 1px solid #e0e0e0;">
          <div class="info-label">Delivery Terms</div>
          <div class="info-value">${po.delivery_terms || 'As agreed'}</div>
        </div>
        <div style="background: #fafafa; padding: 15px; border: 1px solid #e0e0e0;">
          <div class="info-label">Mode of Transport</div>
          <div class="info-value">${{
            air_freight_express: 'Air Freight – Express',
            air_freight_economy: 'Air Freight – Economy',
            sea_freight: 'Sea Freight',
            rail_transport: 'Rail Transport',
            road_transport: 'Road Transport (Truck)',
            courier: 'Courier (DHL, FedEx, UPS)'
          }[po.mode_of_transport] || (po.mode_of_transport || 'As agreed')}</div>
        </div>
        <div style="background: #fafafa; padding: 15px; border: 1px solid #e0e0e0;">
          <div class="info-label">Warranty</div>
          <div class="info-value">As per manufacturer's warranty</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
          <th>Article Number</th>
          <th>Article</th>
            <th>Batch</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          <tr class="total-row">
            <td colspan="4" style="text-align: right;">TOTAL:</td>
            <td style="text-align: right;">${totalCost.toLocaleString('sv-SE')} kr</td>
          </tr>
        </tbody>
      </table>

      ${po.notes ? `
      <div class="notes">
        <div class="notes-label">Notes</div>
        <div class="notes-text">${po.notes}</div>
      </div>` : ''}

      ${receivingRecords.length > 0 ? `
        <div style="margin-top: 40px; padding-top: 40px; border-top: 2px solid #000000;">
          <h2 style="font-size: 24px; margin: 0 0 25px 0; font-weight: 600; letter-spacing: -0.5px;">DELIVERY NOTE & RECEIVING</h2>
          ${receivingRecords.map(record => `
            <div style="margin-bottom: 25px; padding: 25px; background: #fafafa; border-left: 3px solid ${record.has_discrepancy ? '#ef4444' : record.quality_check_passed ? '#10b981' : '#000000'};">
              <div style="font-size: 16px; font-weight: 600; color: #000000; margin-bottom: 8px;">${record.article_name}</div>
              <div style="font-size: 14px; color: #666666;">
                Received: <strong style="color: #000000;">${record.quantity_received} pcs</strong>
                ${record.shelf_address ? ` • Shelf: <strong style="color: #000000;">${record.shelf_address}</strong>` : ''}
              </div>
              ${record.notes ? `<div style="margin-top: 10px; font-size: 13px; color: #333333;">${record.notes}</div>` : ''}
              <div style="margin-top: 12px; font-size: 11px; color: #666666;">
                Received by ${record.received_by} • ${new Date(record.created_date).toLocaleString('sv-SE')}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
    <div class="footer">
      Generated: ${new Date().toLocaleString('sv-SE')}
    </div>
  </div>
</body>
</html>`;

  return { html, po };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchaseOrderId, accountingEmail, ccEmails, note, paymentPercentage } = await req.json();

    if (!purchaseOrderId || !accountingEmail) {
      return Response.json({ error: 'Missing purchaseOrderId or accountingEmail' }, { status: 400 });
    }

    const result = await generatePOHtml(base44, purchaseOrderId);
    if (!result) {
      return Response.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    const { html, po } = result;
    const items = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ purchase_order_id: purchaseOrderId });

    const currency = 'SEK';
    const poNum = po.po_number || `PO-${purchaseOrderId.slice(0, 8)}`;

    // Upload PO HTML document (opens in browser, prints as PDF)
    const htmlFile = new File([html], `PO_${poNum}.html`, { type: 'text/html' });
    const { file_url: poDocUrl } = await base44.integrations.Core.UploadFile({ file: htmlFile });

    // Build email items table
     const itemsTableRows = items.map(item => `
       <tr>
         <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-weight:600;">${item.article_sku || '—'}</td>
         <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${item.article_name || '—'}</td>
         <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.article_batch_number || '—'}</td>
         <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity_ordered}</td>
         <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${(item.unit_price || 0).toLocaleString('sv-SE')} ${currency}</td>
         <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${((item.unit_price || 0) * item.quantity_ordered).toLocaleString('sv-SE')} ${currency}</td>
       </tr>
     `).join('');

    const invoiceButtonHtml = po.invoice_file_url ? `
      <a href="${po.invoice_file_url}" style="display:inline-block;background:#d97706;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;white-space:nowrap;">📎 Leverantörsfaktura</a>
    ` : `
      <span style="display:inline-block;background:#e5e7eb;color:#9ca3af;padding:10px 20px;border-radius:6px;font-size:13px;">Ingen faktura uppladdad</span>
    `;

    const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0;">
  <div style="max-width:700px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <div style="background:#1e293b;padding:32px 40px;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Inköpsorder från IM Vision Group AB</h1>
    </div>

    <div style="padding:32px 40px;">

      <!-- Download buttons side by side -->
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:28px;padding:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
        <div style="flex:1;min-width:200px;">
          <p style="margin:0 0 8px;font-weight:600;color:#1e293b;font-size:13px;">📄 Purchase Order Dokument</p>
          <p style="margin:0 0 12px;font-size:11px;color:#64748b;">${poNum} – ${po.supplier_name}</p>
          <a href="${poDocUrl}" style="display:inline-block;background:#1e293b;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;white-space:nowrap;">⬇ Öppna PO-dokument</a>
        </div>
        ${po.invoice_file_url ? `
        <div style="flex:1;min-width:200px;">
          <p style="margin:0 0 8px;font-weight:600;color:#1e293b;font-size:13px;">📎 Leverantörsfaktura</p>
          <p style="margin:0 0 12px;font-size:11px;color:#64748b;">${po.invoice_number ? `Faktura: ${po.invoice_number}` : 'Bifogad faktura'}</p>
          <a href="${po.invoice_file_url}" style="display:inline-block;background:#d97706;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;white-space:nowrap;">⬇ Öppna faktura</a>
        </div>
        ` : `
        <div style="flex:1;min-width:200px;">
          <p style="margin:0 0 8px;font-weight:600;color:#b91c1c;font-size:13px;">⚠️ Leverantörsfaktura</p>
          <p style="margin:0;font-size:11px;color:#ef4444;">Ingen faktura uppladdad på denna order.</p>
        </div>
        `}
      </div>

      <h2 style="font-size:16px;color:#1e293b;margin:0 0 16px;">Orderinformation</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:6px 0;color:#64748b;width:180px;">PO-nummer</td><td style="padding:6px 0;font-weight:600;color:#1e293b;">${po.po_number || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Leverantör</td><td style="padding:6px 0;font-weight:600;color:#1e293b;">${po.supplier_name}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Orderdatum</td><td style="padding:6px 0;color:#1e293b;">${po.order_date || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Projektnummer Fortnox</td><td style="padding:6px 0;font-weight:600;color:#2563eb;">${po.fortnox_project_number || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Leveransvillkor</td><td style="padding:6px 0;color:#1e293b;">${po.delivery_terms || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Betalningsvillkor</td><td style="padding:6px 0;color:#1e293b;">${po.payment_terms || '—'}</td></tr>
        ${paymentPercentage ? `<tr><td style="padding:6px 0;color:#64748b;font-weight:700;">Betalningsbeteckning</td><td style="padding:6px 0;font-weight:800;font-size:16px;color:#059669;">${paymentPercentage}</td></tr>` : ''}
        ${po.invoice_number ? `<tr><td style="padding:6px 0;color:#64748b;">Fakturanummer</td><td style="padding:6px 0;font-weight:600;color:#1e293b;">${po.invoice_number}</td></tr>` : ''}
        ${po.cost_center ? `<tr><td style="padding:6px 0;color:#64748b;">Kostnadsställe</td><td style="padding:6px 0;color:#1e293b;">${po.cost_center}</td></tr>` : ''}
      </table>

      <h2 style="font-size:16px;color:#1e293b;margin:0 0 12px;">Orderrader</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
           <tr style="background:#f1f5f9;">
             <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Article Number</th>
             <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Product Name</th>
             <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Batch ID</th>
             <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Antal</th>
             <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Enhetspris</th>
             <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Summa</th>
           </tr>
         </thead>
        <tbody>${itemsTableRows}</tbody>
        <tfoot>
          <tr style="background:#1e293b;">
            <td colspan="4" style="padding:12px;text-align:right;font-weight:700;color:#ffffff;font-size:15px;">Totalt</td>
            <td style="padding:12px;text-align:right;font-weight:700;color:#ffffff;font-size:16px;">${(po.total_cost || 0).toLocaleString('sv-SE')} ${currency}</td>
          </tr>
        </tfoot>
      </table>

      ${note ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-weight:600;font-size:12px;color:#15803d;text-transform:uppercase;">Meddelande från avsändaren</p>
        <p style="margin:0;font-size:13px;color:#166534;">${note}</p>
      </div>` : ''}

      ${po.notes ? `<div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#475569;">${po.notes}</p>
      </div>` : ''}

      <div style="border-top:1px solid #e2e8f0;padding-top:20px;color:#94a3b8;font-size:12px;">
        Genererat ${new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })} av ${user.full_name} (${user.email})
      </div>
    </div>
  </div>
</body>
</html>`;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const ccList = (ccEmails || []).filter(e => e && e !== accountingEmail);

    const resendPayload = {
      from: 'IMvision Lager <noreply@imvision.se>',
      to: [accountingEmail],
      cc: ccList.length > 0 ? ccList : undefined,
      subject: `Ekonomipaket${paymentPercentage ? ` (${paymentPercentage})` : ''}: ${poNum} – ${po.supplier_name}`,
      html: emailBody,
    };

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      return Response.json({ error: `Resend error: ${err}` }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending accounting package:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});