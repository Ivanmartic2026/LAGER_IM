import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchaseOrderId, emailTo } = await req.json();

    if (!purchaseOrderId) {
      return Response.json({ error: 'Purchase order ID required' }, { status: 400 });
    }

    // Fetch purchase order
    const allPOs = await base44.entities.PurchaseOrder.list();
    const po = allPOs.find(p => p.id === purchaseOrderId);

    if (!po) {
      return Response.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    // Determine email recipient
    let recipientEmail = emailTo;
    
    if (!recipientEmail) {
      // Fetch supplier email if not provided
      const allSuppliers = await base44.entities.Supplier.list();
      const supplier = allSuppliers.find(s => s.id === po.supplier_id || s.name === po.supplier_name);

      if (!supplier || !supplier.email) {
        return Response.json({ error: 'No email provided and supplier email not found' }, { status: 400 });
      }
      recipientEmail = supplier.email;
    }

    // Fetch PO items
    const allItems = await base44.entities.PurchaseOrderItem.list();
    const poItems = allItems.filter(item => item.purchase_order_id === purchaseOrderId);

    // Build email content
    let itemsTable = '';
    let totalCost = 0;

    poItems.forEach(item => {
      const lineTotal = item.quantity_ordered * (item.unit_price || 0);
      totalCost += lineTotal;
      itemsTable += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.article_batch_number || '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.article_name}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity_ordered}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(item.unit_price || 0).toLocaleString('sv-SE')} kr</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${lineTotal.toLocaleString('sv-SE')} kr</td>
        </tr>
      `;
    });

    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2563eb;">Inköpsorder ${po.po_number || po.id.slice(0, 8)}</h2>
          
          <p>Hej,</p>
          <p>Vi skickar härmed vår inköpsorder:</p>
          
          <table style="margin: 20px 0;">
            <tr>
              <td style="padding: 5px 10px 5px 0;"><strong>Ordernummer:</strong></td>
              <td>${po.po_number || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 10px 5px 0;"><strong>Leverantör:</strong></td>
              <td>${po.supplier_name || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 10px 5px 0;"><strong>Projektnummer:</strong></td>
              <td>${po.fortnox_project_number || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 10px 5px 0;"><strong>Orderdatum:</strong></td>
              <td>${po.order_date || '-'}</td>
            </tr>
            ${po.expected_delivery_date ? `
            <tr>
              <td style="padding: 5px 10px 5px 0;"><strong>Önskat leveransdatum:</strong></td>
              <td>${po.expected_delivery_date}</td>
            </tr>
            ` : ''}
          </table>

          <h3 style="margin-top: 30px;">Artiklar:</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Artikelnr</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Benämning</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Antal</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Enhetspris</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Summa</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTable}
            </tbody>
            <tfoot>
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td colspan="4" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Totalt:</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${totalCost.toLocaleString('sv-SE')} kr</td>
              </tr>
            </tfoot>
          </table>

          ${po.notes ? `
          <h3>Anteckningar:</h3>
          <p style="background-color: #f9fafb; padding: 15px; border-left: 3px solid #2563eb;">${po.notes}</p>
          ` : ''}

          <p style="margin-top: 30px;">
            <strong>För att bekräfta denna order, vänligen svara på detta mail.</strong><br>
            Email: ${recipientEmail}<br><br>
            Vänliga hälsningar,<br>${user.full_name}
          </p>
        </body>
      </html>
    `;

    // Return the HTML to be opened in email client
    return Response.json({ 
      success: true, 
      emailBody: emailBody,
      subject: `Inköpsorder ${po.po_number || po.id.slice(0, 8)}`,
      recipientEmail: recipientEmail,
      message: `Email förberedd för ${recipientEmail}` 
    });

  } catch (error) {
    console.error('Prepare PO email error:', error);
    return Response.json({ 
      error: error.message || 'Failed to prepare email' 
    }, { status: 500 });
  }
});