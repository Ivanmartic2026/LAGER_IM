import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { purchaseOrderId, supplierPortalUrl } = await req.json();

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

    const receivingRecords = await base44.asServiceRole.entities.ReceivingRecord.filter({ 
      purchase_order_id: purchaseOrderId 
    });

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
              </div>
              ` : ''}
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
              </div>
            ` : ''}

            ${supplierPortalUrl ? `
              <div style="margin-top: 30px; padding: 20px 25px; background: #f0f7ff; border: 1px solid #2563eb; border-left: 4px solid #2563eb;">
                <div style="font-size: 11px; text-transform: uppercase; color: #1d4ed8; font-weight: 600; letter-spacing: 0.8px; margin-bottom: 8px;">📎 Supplier Portal — Upload Documents & Confirm Order</div>
                <div style="font-size: 13px; color: #1e40af; margin-bottom: 6px;">Use the link below to confirm this order, upload shipping documents, batch numbers and production reports:</div>
                <a href="${supplierPortalUrl}" style="font-size: 13px; color: #2563eb; word-break: break-all;">${supplierPortalUrl}</a>
              </div>
            ` : ''}

            ${receivingRecords.length > 0 ? `
              <div style="margin-top: 40px; padding-top: 40px; border-top: 2px solid #000000;">
                <h2 style="font-size: 24px; margin: 0 0 25px 0; font-weight: 600; letter-spacing: -0.5px;">DELIVERY NOTE & RECEIVING</h2>
                
                ${receivingRecords.map(record => `
                  <div style="margin-bottom: 25px; padding: 25px; background: #fafafa; border-left: 3px solid ${record.has_discrepancy ? '#ef4444' : record.quality_check_passed ? '#10b981' : '#000000'};">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                      <div>
                        <div style="font-size: 16px; font-weight: 600; color: #000000; margin-bottom: 8px;">${record.article_name}</div>
                        <div style="font-size: 14px; color: #666666;">
                          Received: <strong style="color: #000000;">${record.quantity_received} pcs</strong>
                          ${record.shelf_address ? ` • Shelf: <strong style="color: #000000;">${record.shelf_address}</strong>` : ''}
                        </div>
                      </div>
                      <div style="font-size: 24px;">
                        ${record.quality_check_passed ? '✓' : '✗'}
                      </div>
                    </div>

                    ${record.has_discrepancy ? `
                      <div style="margin-top: 12px; padding: 12px; background: #fee2e2; border: 1px solid #ef4444; border-radius: 4px;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #991b1b; font-weight: 600; letter-spacing: 0.8px; margin-bottom: 4px;">⚠ DISCREPANCY</div>
                        <div style="font-size: 13px; color: #991b1b;">${record.discrepancy_reason || 'No reason given'}</div>
                      </div>
                    ` : ''}

                    ${record.notes ? `
                      <div style="margin-top: 12px; padding: 12px; background: white; border: 1px solid #e0e0e0; border-radius: 4px;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #666666; font-weight: 500; letter-spacing: 0.8px; margin-bottom: 4px;">NOTES</div>
                        <div style="font-size: 13px; color: #333333; line-height: 1.5;">${record.notes}</div>
                      </div>
                    ` : ''}

                    ${record.image_urls && record.image_urls.length > 0 ? `
                      <div style="margin-top: 12px;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #666666; font-weight: 500; letter-spacing: 0.8px; margin-bottom: 8px;">IMAGES (${record.image_urls.length})</div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                          ${record.image_urls.map(url => `
                            <div style="width: 100%; height: 120px; background: #e5e7eb; border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden;">
                              <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}

                    <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #e0e0e0; font-size: 11px; color: #666666;">
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