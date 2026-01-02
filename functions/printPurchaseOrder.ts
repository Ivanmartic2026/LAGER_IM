import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { purchaseOrderId } = await req.json();

    if (!purchaseOrderId) {
      return Response.json({ error: 'Purchase Order ID required' }, { status: 400 });
    }

    const [po] = await base44.asServiceRole.entities.PurchaseOrder.filter({ id: purchaseOrderId });
    
    if (!po) {
      return Response.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    const items = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ 
      purchase_order_id: purchaseOrderId 
    });

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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            background: white;
            margin: 0;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            font-size: 32px;
            margin-bottom: 30px;
            color: #111827;
          }
          .info {
            margin-bottom: 30px;
            line-height: 1.8;
          }
          .info-label {
            font-weight: 600;
            color: #374151;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
          }
          th {
            background: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #d1d5db;
          }
          .total-row {
            background: #f9fafb;
            font-weight: 700;
            font-size: 18px;
          }
          .notes {
            margin-top: 30px;
            padding: 20px;
            background: #f9fafb;
            border-left: 4px solid #3b82f6;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>INKÖPSORDER</h1>
          
          <div class="info">
            <div><span class="info-label">Ordernummer:</span> ${po.po_number || po.id.slice(0, 8)}</div>
            <div><span class="info-label">Datum:</span> ${new Date(po.order_date || po.created_date).toLocaleDateString('sv-SE')}</div>
          </div>

          <div class="info">
            <div class="info-label">Leverantör:</div>
            <div style="font-size: 14px; margin-top: 5px;">${po.supplier_name}</div>
            ${po.expected_delivery_date ? `<div style="margin-top: 10px;"><span class="info-label">Önskat leveransdatum:</span> ${new Date(po.expected_delivery_date).toLocaleDateString('sv-SE')}</div>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Artikel</th>
                <th>Batch</th>
                <th style="text-align: center;">Antal</th>
                <th style="text-align: right;">Pris</th>
                <th style="text-align: right;">Summa</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="4" style="padding: 16px; text-align: right;">Totalt:</td>
                <td style="padding: 16px; text-align: right; color: #1f2937;">${totalCost.toLocaleString('sv-SE')} kr</td>
              </tr>
            </tbody>
          </table>

          ${po.notes ? `
            <div class="notes">
              <div style="font-weight: 600; margin-bottom: 8px;">Anteckningar:</div>
              <div>${po.notes}</div>
            </div>
          ` : ''}

          <div class="footer">
            Genererad: ${new Date().toLocaleString('sv-SE')}
          </div>
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});