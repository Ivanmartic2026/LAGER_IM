import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchaseOrderId, accountingEmail, note } = await req.json();

    if (!purchaseOrderId || !accountingEmail) {
      return Response.json({ error: 'Missing purchaseOrderId or accountingEmail' }, { status: 400 });
    }

    const po = await base44.asServiceRole.entities.PurchaseOrder.get(purchaseOrderId);
    const items = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ purchase_order_id: purchaseOrderId });

    if (!po) {
      return Response.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    const currency = po.invoice_currency || 'SEK';
    const poNum = po.po_number || `PO-${purchaseOrderId.slice(0, 8)}`;

    // ── Generate PDF with pdf-lib ─────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const black = rgb(0.12, 0.16, 0.23);
    const white = rgb(1, 1, 1);
    const grey = rgb(0.4, 0.45, 0.57);
    const lightGrey = rgb(0.97, 0.98, 0.99);

    // Header bar
    page.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: black });
    page.drawText('PURCHASE ORDER', { x: 30, y: height - 35, size: 18, font: fontBold, color: white });
    page.drawText(`IMvision Group AB  •  ${new Date().toLocaleDateString('sv-SE')}`, { x: 30, y: height - 52, size: 8, font: fontReg, color: rgb(0.6, 0.7, 0.8) });

    // Info section
    const infoData = [
      ['PO-nummer', poNum],
      ['Leverantör', po.supplier_name || '—'],
      ['Orderdatum', po.order_date || '—'],
      ['Förv. leveransdatum', po.expected_delivery_date || '—'],
      ['Fortnox projekt', po.fortnox_project_number || '—'],
      ['Betalningsvillkor', po.payment_terms || '—'],
      ['Leveransvillkor', po.delivery_terms || '—'],
    ];
    if (po.invoice_number) infoData.push(['Fakturanummer', po.invoice_number]);
    if (po.cost_center) infoData.push(['Kostnadsställe', po.cost_center]);

    let y = height - 80;
    for (const [label, value] of infoData) {
      page.drawText(label + ':', { x: 30, y, size: 8, font: fontReg, color: grey });
      const safeVal = String(value).replace(/[^\x20-\x7E]/g, '');
      page.drawText(safeVal, { x: 160, y, size: 8, font: fontBold, color: black });
      y -= 13;
    }

    // Table header
    const tableTop = y - 10;
    const cols = { name: 30, sku: 200, batch: 280, qty: 350, price: 420, total: 490 };
    page.drawRectangle({ x: 30, y: tableTop - 14, width: width - 60, height: 16, color: black });
    page.drawText('BENÄMNING', { x: cols.name, y: tableTop - 10, size: 7, font: fontBold, color: white });
    page.drawText('SKU', { x: cols.sku, y: tableTop - 10, size: 7, font: fontBold, color: white });
    page.drawText('BATCH', { x: cols.batch, y: tableTop - 10, size: 7, font: fontBold, color: white });
    page.drawText('ANTAL', { x: cols.qty, y: tableTop - 10, size: 7, font: fontBold, color: white });
    page.drawText('ENHETSPRIS', { x: cols.price, y: tableTop - 10, size: 7, font: fontBold, color: white });
    page.drawText('SUMMA', { x: cols.total, y: tableTop - 10, size: 7, font: fontBold, color: white });

    let rowY = tableTop - 14;
    let totalCost = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineTotal = (item.unit_price || 0) * item.quantity_ordered;
      totalCost += lineTotal;
      rowY -= 14;

      if (i % 2 === 0) {
        page.drawRectangle({ x: 30, y: rowY, width: width - 60, height: 13, color: lightGrey });
      }

      const safeName = (item.article_name || '—').replace(/[^\x20-\x7E]/g, '').substring(0, 28);
      const safeSku = (item.article_sku || '—').replace(/[^\x20-\x7E]/g, '').substring(0, 14);
      const safeBatch = (item.article_batch_number || '—').replace(/[^\x20-\x7E]/g, '').substring(0, 12);

      page.drawText(safeName, { x: cols.name, y: rowY + 4, size: 7, font: fontReg, color: black });
      page.drawText(safeSku, { x: cols.sku, y: rowY + 4, size: 7, font: fontReg, color: black });
      page.drawText(safeBatch, { x: cols.batch, y: rowY + 4, size: 7, font: fontReg, color: black });
      page.drawText(String(item.quantity_ordered), { x: cols.qty, y: rowY + 4, size: 7, font: fontReg, color: black });
      page.drawText(`${(item.unit_price || 0).toLocaleString('sv-SE')}`, { x: cols.price, y: rowY + 4, size: 7, font: fontReg, color: black });
      page.drawText(`${lineTotal.toLocaleString('sv-SE')} ${currency}`, { x: cols.total, y: rowY + 4, size: 7, font: fontBold, color: black });
    }

    // Total row
    rowY -= 16;
    page.drawRectangle({ x: 30, y: rowY, width: width - 60, height: 14, color: black });
    page.drawText('TOTALT', { x: cols.name, y: rowY + 4, size: 8, font: fontBold, color: white });
    page.drawText(`${totalCost.toLocaleString('sv-SE')} ${currency}`, { x: cols.total, y: rowY + 4, size: 8, font: fontBold, color: white });

    // Footer
    page.drawText(
      `Genererat ${new Date().toLocaleString('sv-SE')} av ${user.full_name} (${user.email})`,
      { x: 30, y: 20, size: 7, font: fontReg, color: grey }
    );

    const pdfBytes = await pdfDoc.save();
    const pdfFile = new File([pdfBytes], `PO_${poNum}.pdf`, { type: 'application/pdf' });
    const { file_url: pdfUrl } = await base44.integrations.Core.UploadFile({ file: pdfFile });

    // ── Build email ──────────────────────────────────────────────────────────
    const itemsTableRows = items.map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${item.article_name || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${item.article_sku || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.article_batch_number || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity_ordered}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${(item.unit_price || 0).toLocaleString('sv-SE')} ${currency}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${((item.unit_price || 0) * item.quantity_ordered).toLocaleString('sv-SE')} ${currency}</td>
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

      <!-- PDF Download Button -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
        <p style="margin:0 0 4px;font-weight:700;color:#1e40af;font-size:14px;">📄 PO-dokument (PDF)</p>
        <p style="margin:0 0 12px;font-size:12px;color:#3b82f6;">${poNum} – ${po.supplier_name}</p>
        <a href="${pdfUrl}" style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">⬇ Ladda ner PDF</a>
      </div>

      <h2 style="font-size:16px;color:#1e293b;margin:0 0 16px;">Orderinformation</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:6px 0;color:#64748b;width:180px;">PO-nummer</td><td style="padding:6px 0;font-weight:600;color:#1e293b;">${po.po_number || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Leverantör</td><td style="padding:6px 0;font-weight:600;color:#1e293b;">${po.supplier_name}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Orderdatum</td><td style="padding:6px 0;color:#1e293b;">${po.order_date || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Projektnummer Fortnox</td><td style="padding:6px 0;font-weight:600;color:#2563eb;">${po.fortnox_project_number || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Leveransvillkor</td><td style="padding:6px 0;color:#1e293b;">${po.delivery_terms || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Betalningsvillkor</td><td style="padding:6px 0;color:#1e293b;">${po.payment_terms || '—'}</td></tr>
        ${po.invoice_number ? `<tr><td style="padding:6px 0;color:#64748b;">Fakturanummer</td><td style="padding:6px 0;font-weight:600;color:#1e293b;">${po.invoice_number}</td></tr>` : ''}
        ${po.cost_center ? `<tr><td style="padding:6px 0;color:#64748b;">Kostnadsställe</td><td style="padding:6px 0;color:#1e293b;">${po.cost_center}</td></tr>` : ''}
      </table>

      <h2 style="font-size:16px;color:#1e293b;margin:0 0 12px;">Orderrader</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Benämning</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">SKU</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Batch</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Antal</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Enhetspris</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Summa</th>
          </tr>
        </thead>
        <tbody>${itemsTableRows}</tbody>
        <tfoot>
          <tr style="background:#1e293b;">
            <td colspan="5" style="padding:12px;text-align:right;font-weight:700;color:#ffffff;font-size:15px;">Totalt</td>
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

      ${po.invoice_file_url ? `
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-weight:600;color:#92400e;">📎 Leverantörsfaktura</p>
        <a href="${po.invoice_file_url}" style="display:inline-block;margin-top:4px;color:#d97706;font-weight:600;font-size:13px;">Öppna leverantörsfaktura ↗</a>
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
      subject: `Ekonomipaket: ${poNum} – ${po.supplier_name}`,
      body: emailBody,
      from_name: 'IMvision Lager'
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending accounting package:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});