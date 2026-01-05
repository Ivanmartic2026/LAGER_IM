import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'orderId required' }, { status: 400 });
    }

    const order = await base44.entities.Order.get(orderId);
    const orderItems = await base44.entities.OrderItem.filter({ order_id: orderId });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            color: #1e293b;
            font-size: 28px;
          }
          .order-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
          }
          .info-field {
            margin-bottom: 10px;
          }
          .info-label {
            font-weight: bold;
            color: #64748b;
            font-size: 12px;
            text-transform: uppercase;
          }
          .info-value {
            color: #1e293b;
            font-size: 16px;
            margin-top: 4px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .items-table th {
            background: #2563eb;
            color: white;
            padding: 12px;
            text-align: left;
            font-size: 14px;
          }
          .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .items-table tr:hover {
            background: #f8fafc;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
          }
          .status-draft { background: #f1f5f9; color: #64748b; }
          .status-ready_to_pick { background: #dbeafe; color: #2563eb; }
          .status-picking { background: #fef3c7; color: #d97706; }
          .status-picked { background: #d1fae5; color: #059669; }
          .status-delivered { background: #d1fae5; color: #059669; }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ORDER</h1>
          <p style="color: #64748b; margin-top: 10px;">
            ${order.order_number || `#${order.id.slice(0, 8)}`}
          </p>
        </div>

        <div class="order-info">
          <div>
            <div class="info-field">
              <div class="info-label">Kund</div>
              <div class="info-value">${order.customer_name || '-'}</div>
            </div>
            ${order.customer_reference ? `
            <div class="info-field">
              <div class="info-label">Kundreferens</div>
              <div class="info-value">${order.customer_reference}</div>
            </div>
            ` : ''}
            ${order.delivery_address ? `
            <div class="info-field">
              <div class="info-label">Leveransadress</div>
              <div class="info-value">${order.delivery_address}</div>
            </div>
            ` : ''}
          </div>
          <div>
            <div class="info-field">
              <div class="info-label">Status</div>
              <div class="info-value">
                <span class="status-badge status-${order.status}">
                  ${order.status === 'draft' ? 'Utkast' : 
                    order.status === 'ready_to_pick' ? 'Redo att plocka' :
                    order.status === 'picking' ? 'Plockar' :
                    order.status === 'picked' ? 'Plockad' :
                    order.status === 'delivered' ? 'Levererad' : order.status}
                </span>
              </div>
            </div>
            ${order.delivery_date ? `
            <div class="info-field">
              <div class="info-label">Leveransdatum</div>
              <div class="info-value">${new Date(order.delivery_date).toLocaleDateString('sv-SE')}</div>
            </div>
            ` : ''}
            <div class="info-field">
              <div class="info-label">Skapad</div>
              <div class="info-value">${new Date(order.created_date).toLocaleDateString('sv-SE')}</div>
            </div>
          </div>
        </div>

        ${order.notes ? `
        <div style="background: #fef9c3; padding: 15px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #eab308;">
          <div class="info-label" style="margin-bottom: 5px;">Anteckningar</div>
          <div style="color: #1e293b;">${order.notes}</div>
        </div>
        ` : ''}

        <table class="items-table">
          <thead>
            <tr>
              <th>Artikel</th>
              <th>Batch</th>
              <th>Hyllplats</th>
              <th style="text-align: center;">Beställt</th>
              <th style="text-align: center;">Plockat</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${orderItems.map(item => `
              <tr>
                <td><strong>${item.article_name || '-'}</strong></td>
                <td>${item.article_batch_number || '-'}</td>
                <td>${item.shelf_address || '-'}</td>
                <td style="text-align: center;"><strong>${item.quantity_ordered}</strong></td>
                <td style="text-align: center;">${item.quantity_picked || 0}</td>
                <td>
                  <span class="status-badge ${
                    item.status === 'picked' ? 'status-picked' :
                    item.status === 'partial' ? 'status-picking' :
                    'status-draft'
                  }">
                    ${item.status === 'picked' ? 'Plockad' :
                      item.status === 'partial' ? 'Delvis' : 'Väntar'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Genererad ${new Date().toLocaleDateString('sv-SE')} ${new Date().toLocaleTimeString('sv-SE')}</p>
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});