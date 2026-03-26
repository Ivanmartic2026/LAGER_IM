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

    // Email body with supplier portal link - Apple design
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue','Lucida Grande',sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:640px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="padding:40px 48px;text-align:center;border-bottom:1px solid #f5f5f7;">
      <h1 style="margin:0;font-size:28px;font-weight:700;color:#1d1d1f;letter-spacing:-0.5px;">Purchase Order</h1>
      <p style="margin:8px 0 0;font-size:13px;color:#86868b;">From IM Vision Group AB</p>
      <p style="margin:12px 0 0;font-size:15px;color:#0071e3;font-weight:600;">Order #${poNum}</p>
      ${po.supplier_name ? `<p style="margin:8px 0 0;font-size:15px;color:#1d1d1f;font-weight:500;">→ ${po.supplier_name}</p>` : ''}
    </div>

    <!-- Main Content -->
    <div style="padding:40px 48px;">
      
      <!-- Action Card -->
      <div style="margin-bottom:40px;padding:32px;background:#f5f5f7;border-radius:12px;text-align:center;">
        <h2 style="margin:0 0 12px;font-size:17px;font-weight:600;color:#1d1d1f;">✓ Confirm & Upload Documents</h2>
        <p style="margin:0 0 8px;font-size:13px;color:#86868b;line-height:1.6;">Use the portal below to confirm this purchase order and upload all required documentation:</p>
        <ul style="margin:12px 0;padding:0;font-size:13px;color:#86868b;list-style:none;text-align:left;display:inline-block;">
          <li style="margin:4px 0;">• Packing Lists & Shipping Docs</li>
          <li style="margin:4px 0;">• Quality Reports & Test Protocols</li>
          <li style="margin:4px 0;">• Batch Traceability Files</li>
          <li style="margin:4px 0;">• Certificates (CE, RoHS, etc.)</li>
        </ul>
        <div style="margin-top:20px;">
          <a href="${supplierPortalUrl}" style="display:inline-block;background:#0071e3;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;transition:background-color 0.2s;">Open Supplier Portal</a>
        </div>
      </div>

      <!-- Order Details -->
      <div style="margin-bottom:32px;">
        <h3 style="margin:0 0 16px;font-size:13px;font-weight:600;color:#1d1d1f;text-transform:uppercase;letter-spacing:0.5px;">Order Details</h3>
        <div style="border-radius:8px;border:1px solid #f5f5f7;overflow:hidden;">
          <div style="padding:12px 16px;border-bottom:1px solid #f5f5f7;display:flex;justify-content:space-between;">
            <span style="color:#86868b;font-size:13px;">Order Date</span>
            <span style="color:#1d1d1f;font-weight:500;font-size:13px;">${po.order_date || '—'}</span>
          </div>
          ${po.expected_delivery_date ? `<div style="padding:12px 16px;border-bottom:1px solid #f5f5f7;display:flex;justify-content:space-between;">
            <span style="color:#86868b;font-size:13px;">Expected Delivery</span>
            <span style="color:#1d1d1f;font-weight:500;font-size:13px;">${new Date(po.expected_delivery_date).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'})}</span>
          </div>` : ''}
          ${po.delivery_terms ? `<div style="padding:12px 16px;border-bottom:1px solid #f5f5f7;display:flex;justify-content:space-between;">
            <span style="color:#86868b;font-size:13px;">Delivery Terms</span>
            <span style="color:#1d1d1f;font-weight:500;font-size:13px;">${po.delivery_terms}</span>
          </div>` : ''}
          ${po.payment_terms ? `<div style="padding:12px 16px;display:flex;justify-content:space-between;">
            <span style="color:#86868b;font-size:13px;">Payment Terms</span>
            <span style="color:#1d1d1f;font-weight:500;font-size:13px;">${po.payment_terms}</span>
          </div>` : ''}
        </div>
      </div>

      <!-- Items Table -->
      <div style="margin-bottom:32px;">
        <h3 style="margin:0 0 12px;font-size:13px;font-weight:600;color:#1d1d1f;text-transform:uppercase;letter-spacing:0.5px;">Items</h3>
        <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #f5f5f7;">
          <thead>
            <tr style="background:#f5f5f7;">
              <th style="padding:12px 16px;text-align:left;font-size:11px;color:#86868b;font-weight:600;text-transform:uppercase;">SKU</th>
              <th style="padding:12px 16px;text-align:left;font-size:11px;color:#86868b;font-weight:600;text-transform:uppercase;">Description</th>
              <th style="padding:12px 16px;text-align:center;font-size:11px;color:#86868b;font-weight:600;text-transform:uppercase;">Qty</th>
              <th style="padding:12px 16px;text-align:right;font-size:11px;color:#86868b;font-weight:600;text-transform:uppercase;">Price</th>
              <th style="padding:12px 16px;text-align:right;font-size:11px;color:#86868b;font-weight:600;text-transform:uppercase;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => {
              const itemTotal = item.quantity_ordered * (item.unit_price || 0);
              return `<tr style="border-top:1px solid #f5f5f7;${idx === items.length - 1 ? '' : ''}">
                <td style="padding:12px 16px;font-size:13px;color:#1d1d1f;font-family:monospace;font-weight:500;">${item.article_sku || '—'}</td>
                <td style="padding:12px 16px;font-size:13px;color:#1d1d1f;">${item.article_name || '—'}</td>
                <td style="padding:12px 16px;text-align:center;font-size:13px;color:#1d1d1f;">${item.quantity_ordered}</td>
                <td style="padding:12px 16px;text-align:right;font-size:13px;color:#86868b;">${(item.unit_price || 0).toLocaleString('en-US', {style:'currency',currency:'SEK'})}</td>
                <td style="padding:12px 16px;text-align:right;font-size:13px;color:#1d1d1f;font-weight:500;">${itemTotal.toLocaleString('en-US', {style:'currency',currency:'SEK'})}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="border-top:2px solid #f5f5f7;background:#f5f5f7;">
              <td colspan="4" style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600;color:#1d1d1f;">Total</td>
              <td style="padding:12px 16px;text-align:right;font-size:15px;font-weight:700;color:#1d1d1f;">${totalCost.toLocaleString('en-US', {style:'currency',currency:'SEK'})}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      ${po.notes ? `<div style="margin-bottom:32px;padding:16px;background:#f5f5f7;border-radius:8px;border-left:3px solid #0071e3;">
        <p style="margin:0 0 4px;font-weight:600;font-size:11px;color:#0071e3;text-transform:uppercase;">Notes</p>
        <p style="margin:0;font-size:13px;color:#1d1d1f;">${po.notes}</p>
      </div>` : ''}

      <!-- Next Steps -->
      <div style="margin-bottom:32px;padding:24px;background:#f5f5f7;border-radius:8px;">
        <h3 style="margin:0 0 12px;font-size:13px;font-weight:600;color:#1d1d1f;text-transform:uppercase;">Next Steps</h3>
        <ol style="margin:0;padding-left:20px;font-size:13px;color:#1d1d1f;line-height:1.8;">
          <li style="margin:6px 0;">Confirm receipt of this purchase order</li>
          <li style="margin:6px 0;">Upload all required documents to the supplier portal</li>
          <li style="margin:6px 0;">Notify us before shipment</li>
        </ol>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #f5f5f7;padding-top:24px;text-align:center;color:#86868b;font-size:11px;line-height:1.6;">
        <p style="margin:0;">For questions, contact:</p>
        <p style="margin:4px 0;font-weight:500;">Ivan Martic</p>
        <p style="margin:0;"><a href="mailto:ivan@imvision.se" style="color:#0071e3;text-decoration:none;">ivan@imvision.se</a> | +46 73 913 01 29</p>
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
        from: 'IMvision Warehouse <noreply@imvision.se>',
        to: [email],
        subject: `Purchase Order ${poNum} – Action Required`,
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