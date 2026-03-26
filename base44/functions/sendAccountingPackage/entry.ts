import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchaseOrderId, accountingEmail } = await req.json();

    if (!purchaseOrderId || !accountingEmail) {
      return Response.json({ error: 'Missing purchaseOrderId or accountingEmail' }, { status: 400 });
    }

    const po = await base44.asServiceRole.entities.PurchaseOrder.get(purchaseOrderId);
    const items = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ purchase_order_id: purchaseOrderId });

    if (!po) {
      return Response.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    const itemsTableRows = items.map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${item.article_name || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.article_batch_number || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity_ordered}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${(item.unit_price || 0).toLocaleString('sv-SE')} ${po.invoice_currency || 'SEK'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${((item.unit_price || 0) * item.quantity_ordered).toLocaleString('sv-SE')} ${po.invoice_currency || 'SEK'}</td>
      </tr>
    `).join('');

    const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0;">
  <div style="max-width:700px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <div style="background:#1e293b;padding:32px 40px;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Ekonomipaket – Inköpsorder</h1>
      <p style="color:#94a3b8;margin:8px 0 0;">Skickat av ${user.full_name}</p>
    </div>

    <div style="padding:32px 40px;">
      
      <h2 style="font-size:16px;color:#1e293b;margin:0 0 16px;">Orderinformation</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:6px 0;color:#64748b;width:180px;">PO-nummer</td>
          <td style="padding:6px 0;font-weight:600;color:#1e293b;">${po.po_number || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;">Leverantör</td>
          <td style="padding:6px 0;font-weight:600;color:#1e293b;">${po.supplier_name}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;">Orderdatum</td>
          <td style="padding:6px 0;color:#1e293b;">${po.order_date || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;">Projektnummer Fortnox</td>
          <td style="padding:6px 0;font-weight:600;color:#2563eb;">${po.fortnox_project_number || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;">Leveransvillkor</td>
          <td style="padding:6px 0;color:#1e293b;">${po.delivery_terms || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;">Betalningsvillkor</td>
          <td style="padding:6px 0;color:#1e293b;">${po.payment_terms || '—'}</td>
        </tr>
        ${po.invoice_number ? `<tr>
          <td style="padding:6px 0;color:#64748b;">Fakturanummer</td>
          <td style="padding:6px 0;font-weight:600;color:#1e293b;">${po.invoice_number}</td>
        </tr>` : ''}
        ${po.cost_center ? `<tr>
          <td style="padding:6px 0;color:#64748b;">Kostnadsställe</td>
          <td style="padding:6px 0;color:#1e293b;">${po.cost_center}</td>
        </tr>` : ''}
      </table>

      <h2 style="font-size:16px;color:#1e293b;margin:0 0 12px;">Orderrader</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Benämning</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Batch</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Antal</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Enhetspris</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Summa</th>
          </tr>
        </thead>
        <tbody>
          ${itemsTableRows}
        </tbody>
        <tfoot>
          <tr style="background:#f8fafc;">
            <td colspan="4" style="padding:12px;text-align:right;font-weight:700;color:#1e293b;font-size:15px;">Totalt</td>
            <td style="padding:12px;text-align:right;font-weight:700;color:#1e293b;font-size:16px;">${(po.total_cost || 0).toLocaleString('sv-SE')} ${po.invoice_currency || 'SEK'}</td>
          </tr>
        </tfoot>
      </table>

      ${po.notes ? `<div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#475569;">${po.notes}</p>
      </div>` : ''}

      ${po.invoice_file_url ? `
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-weight:600;color:#92400e;">📎 Leverantörsfaktura bifogad</p>
        <p style="margin:0;font-size:13px;color:#78350f;">Faktura finns tillgänglig via länken nedan:</p>
        <a href="${po.invoice_file_url}" style="display:inline-block;margin-top:8px;color:#d97706;font-weight:600;font-size:13px;">${po.invoice_file_url}</a>
      </div>` : '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px 20px;margin-bottom:24px;"><p style="margin:0;color:#b91c1c;font-size:13px;">⚠️ Ingen leverantörsfaktura uppladdad på denna order.</p></div>'}

      <div style="border-top:1px solid #e2e8f0;padding-top:20px;color:#94a3b8;font-size:12px;">
        Genererat ${new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })} av ${user.full_name} (${user.email})
      </div>
    </div>
  </div>
</body>
</html>`;

    await base44.integrations.Core.SendEmail({
      to: accountingEmail,
      subject: `Ekonomipaket: ${po.po_number || `PO-${purchaseOrderId.slice(0, 8)}`} – ${po.supplier_name}`,
      body: emailBody,
      from_name: 'IMvision Lager'
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending accounting package:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});