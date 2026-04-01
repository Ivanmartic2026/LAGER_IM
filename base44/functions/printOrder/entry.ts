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

    // Fetch articles to get SKU numbers
    const articleIds = orderItems.map(item => item.article_id).filter(Boolean);
    const articles = await Promise.all(
      articleIds.map(id => base44.entities.Article.get(id).catch(() => null))
    );
    const articleMap = Object.fromEntries(
      articles.filter(Boolean).map(a => [a.id, a])
    );

    // Fetch full names for created_by and picked_by
    const createdByUser = order.created_by ? (await base44.asServiceRole.entities.User.filter({ email: order.created_by }))[0] : null;
    const createdByName = createdByUser?.full_name || order.created_by || '-';

    const pickedByUser = order.picked_by ? (await base44.asServiceRole.entities.User.filter({ email: order.picked_by }))[0] : null;
    const pickedByName = pickedByUser?.full_name || order.picked_by || '-';

    const itemsHtml = orderItems.map(item => {
      const article = articleMap[item.article_id];
      return `
        <tr>
          <td style="padding: 14px 12px; border-bottom: 1px solid #e0e0e0; background: white; color: #000000; font-size: 14px;">
            <strong>${item.article_name || '-'}</strong>
          </td>
          <td style="padding: 14px 12px; border-bottom: 1px solid #e0e0e0; background: white; color: #000000; font-size: 14px;">
            ${article?.sku || '-'}
          </td>
          <td style="padding: 14px 12px; border-bottom: 1px solid #e0e0e0; background: white; color: #000000; font-size: 14px;">
            ${item.article_batch_number || '-'}
          </td>
          <td style="padding: 14px 12px; border-bottom: 1px solid #e0e0e0; background: white; color: #000000; font-size: 14px;">
            ${item.shelf_address || '-'}
          </td>
          <td style="padding: 14px 12px; border-bottom: 1px solid #e0e0e0; background: white; color: #000000; font-size: 14px; text-align: center;">
            <strong>${item.quantity_ordered}</strong>
          </td>
          <td style="padding: 14px 12px; border-bottom: 1px solid #e0e0e0; background: white; color: #000000; font-size: 14px; text-align: center;">
            ${item.quantity_picked || 0}
          </td>
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
          .customer-box {
            background: #f5f5f5;
            padding: 25px;
            margin-bottom: 30px;
            border-left: 3px solid #000000;
          }
          .customer-label {
            font-size: 11px;
            text-transform: uppercase;
            color: #666666;
            font-weight: 500;
            letter-spacing: 0.8px;
            margin-bottom: 10px;
          }
          .customer-name {
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
            <h1>PLOCKLISTA</h1>
          </div>
          
          <div class="content">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Ordernummer</div>
                <div class="info-value">${order.order_number || order.id.slice(0, 8)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Skapad av</div>
                <div class="info-value">${createdByName}</div>
                <div class="info-label" style="margin-top: 5px;">Skapad datum</div>
                <div class="info-value">${new Date(order.created_date).toLocaleDateString('sv-SE')}</div>
              </div>
              ${order.picked_by ? `
              <div class="info-item">
                <div class="info-label">Plockad av</div>
                <div class="info-value">${pickedByName}</div>
                <div class="info-label" style="margin-top: 5px;">Plockat datum</div>
                <div class="info-value">${order.picked_date ? new Date(order.picked_date).toLocaleDateString('sv-SE') : '-'}</div>
              </div>
              ` : ''}
              ${order.delivery_date ? `
              <div class="info-item">
                <div class="info-label">Leveransdatum</div>
                <div class="info-value">${new Date(order.delivery_date).toLocaleDateString('sv-SE')}</div>
              </div>
              ` : ''}
              ${order.customer_reference ? `
              <div class="info-item">
                <div class="info-label">Kundreferens</div>
                <div class="info-value">${order.customer_reference}</div>
              </div>
              ` : ''}
              ${order.fortnox_project_number ? `
              <div class="info-item">
                <div class="info-label">Fortnox projektnr</div>
                <div class="info-value">${order.fortnox_project_number}</div>
                ${order.fortnox_project_name ? `<div class="info-label" style="margin-top:5px;">Projektnamn</div><div class="info-value">${order.fortnox_project_name}</div>` : ''}
              </div>
              ` : ''}
              ${order.fortnox_order_id ? `
              <div class="info-item">
                <div class="info-label">Fortnox Order-ID</div>
                <div class="info-value">${order.fortnox_order_id}</div>
                ${order.fortnox_document_number ? `<div class="info-label" style="margin-top:5px;">Dokument-ID</div><div class="info-value">${order.fortnox_document_number}</div>` : ''}
              </div>
              ` : ''}
            </div>

            <div class="customer-box">
              <div class="customer-label">Kund</div>
              <div class="customer-name">${order.customer_name}</div>
              ${order.delivery_address ? `
                <div style="margin-top: 10px; color: #333333; font-size: 14px; line-height: 1.5;">
                  ${order.delivery_address.replace(/\n/g, '<br>')}
                </div>
              ` : ''}
            </div>

            ${order.site_visit_info || (order.site_names && order.site_names.length > 0) ? `
            <div class="customer-box" style="margin-bottom: 30px;">
              <div class="customer-label">Site / Platsbesök</div>
              ${order.site_names && order.site_names.length > 0 ? `
                <div style="font-size: 15px; font-weight: 500; color: #000; margin-bottom: 6px;">${order.site_names.join(', ')}</div>
              ` : ''}
              ${order.site_visit_info ? `
                <div style="color: #333333; font-size: 14px; line-height: 1.6; margin-top: 6px; white-space: pre-line;">${order.site_visit_info}</div>
              ` : ''}
            </div>
            ` : ''}

            <table>
              <thead>
                <tr>
                  <th>Artikel</th>
                  <th>Artikelnr</th>
                  <th>Batch</th>
                  <th>Hyllplats</th>
                  <th style="text-align: center;">Beställt</th>
                  <th style="text-align: center;">Plockat</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            ${order.notes ? `
              <div class="notes">
                <div class="notes-label">Anteckningar</div>
                <div class="notes-text">${order.notes}</div>
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