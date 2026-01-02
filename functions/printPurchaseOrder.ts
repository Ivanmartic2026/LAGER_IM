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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            padding: 40px;
            background: #ffffff;
            margin: 0;
            min-height: 100vh;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border: 1px solid #000000;
            overflow: hidden;
          }
          .header {
            background: #000000;
            padding: 40px;
            color: white;
            position: relative;
          }
          .logo {
            height: 45px;
            margin-bottom: 20px;
            filter: brightness(0) invert(1);
          }
          h1 {
            font-size: 32px;
            margin: 0;
            font-weight: 600;
            letter-spacing: -0.5px;
          }
          .content {
            padding: 40px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            background: #fafafa;
            padding: 25px;
            border: 1px solid #e0e0e0;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-size: 11px;
            text-transform: uppercase;
            color: #666666;
            font-weight: 500;
            letter-spacing: 0.8px;
            margin-bottom: 6px;
          }
          .info-value {
            font-size: 15px;
            color: #000000;
            font-weight: 500;
          }
          .supplier-box {
            background: #f5f5f5;
            padding: 25px;
            margin-bottom: 30px;
            border-left: 3px solid #000000;
          }
          .supplier-label {
            font-size: 11px;
            text-transform: uppercase;
            color: #666666;
            font-weight: 500;
            letter-spacing: 0.8px;
            margin-bottom: 10px;
          }
          .supplier-name {
            font-size: 17px;
            color: #000000;
            font-weight: 500;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            border: 1px solid #e0e0e0;
          }
          th {
            background: #000000;
            padding: 14px 12px;
            text-align: left;
            font-weight: 500;
            color: white;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          td {
            padding: 14px 12px;
            border-bottom: 1px solid #e0e0e0;
            background: white;
            color: #000000;
            font-size: 14px;
          }
          tbody tr:last-child td {
            border-bottom: none;
          }
          .total-row {
            background: #000000 !important;
            font-weight: 600;
            font-size: 18px;
          }
          .total-row td {
            color: white !important;
            border-bottom: none;
            padding: 18px 12px;
          }
          .notes {
            margin-top: 30px;
            padding: 25px;
            background: #fafafa;
            border-left: 3px solid #000000;
          }
          .notes-label {
            font-weight: 500;
            margin-bottom: 10px;
            color: #000000;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .notes-text {
            color: #333333;
            line-height: 1.6;
            font-size: 14px;
          }
          .footer {
            margin-top: 40px;
            padding: 25px 40px;
            background: #fafafa;
            text-align: center;
            color: #666666;
            font-size: 11px;
            border-top: 1px solid #e0e0e0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png" alt="IM Vision" class="logo" crossorigin="anonymous" />
            <h1>INKÖPSORDER</h1>
          </div>
          
          <div class="content">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Ordernummer</div>
                <div class="info-value">${po.po_number || po.id.slice(0, 8)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Orderdatum</div>
                <div class="info-value">${new Date(po.order_date || po.created_date).toLocaleDateString('sv-SE')}</div>
              </div>
              ${po.expected_delivery_date ? `
              <div class="info-item">
                <div class="info-label">Förväntat leveransdatum</div>
                <div class="info-value">${new Date(po.expected_delivery_date).toLocaleDateString('sv-SE')}</div>
              </div>
              ` : ''}
            </div>

            <div class="supplier-box">
              <div class="supplier-label">Leverantör</div>
              <div class="supplier-name">${po.supplier_name}</div>
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
                  <td colspan="4" style="text-align: right;">TOTALT:</td>
                  <td style="text-align: right;">${totalCost.toLocaleString('sv-SE')} kr</td>
                </tr>
              </tbody>
            </table>

            ${po.notes ? `
              <div class="notes">
                <div class="notes-label">Anteckningar</div>
                <div class="notes-text">${po.notes}</div>
              </div>
            ` : ''}
          </div>

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