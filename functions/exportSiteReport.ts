import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_id } = await req.json();

    if (!report_id) {
      return Response.json({ error: 'report_id required' }, { status: 400 });
    }

    // Fetch report and images
    const report = await base44.asServiceRole.entities.SiteReport.get(report_id);
    const images = await base44.asServiceRole.entities.SiteReportImage.filter({ 
      site_report_id: report_id 
    });
    const allArticles = await base44.asServiceRole.entities.Article.list();
    
    // Fetch linked order if exists
    let linkedOrder = null;
    let orderItems = [];
    if (report.linked_order_id) {
      try {
        linkedOrder = await base44.asServiceRole.entities.Order.get(report.linked_order_id);
        orderItems = await base44.asServiceRole.entities.OrderItem.filter({
          order_id: report.linked_order_id
        });
      } catch (e) {
        console.log('Could not fetch linked order:', e);
      }
    }

    const confirmed = images.filter(i => i.match_status === 'confirmed');
    const needsReplacement = confirmed.filter(i => i.component_status === 'needs_replacement');
    const needsRepair = confirmed.filter(i => i.component_status === 'needs_repair');

    // Create HTML content for rendering
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            background: white; 
            padding: 40px; 
            max-width: 800px;
            margin: 0 auto;
          }
          .header { 
            margin-bottom: 30px; 
            border-bottom: 3px solid #10b981;
            padding-bottom: 20px;
          }
          h1 { 
            color: #1f2937; 
            font-size: 32px; 
            margin-bottom: 20px;
            font-weight: bold;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 12px; 
            margin-bottom: 20px;
            font-size: 14px;
          }
          .info-item { 
            background: #f3f4f6;
            padding: 12px;
            border-radius: 8px;
          }
          .label { 
            color: #6b7280; 
            font-size: 12px; 
            margin-bottom: 4px;
          }
          .value { 
            color: #111827; 
            font-weight: 600;
          }
          .section { 
            margin: 30px 0; 
            padding: 20px;
            background: #f9fafb;
            border-radius: 12px;
          }
          .section-title { 
            font-size: 20px; 
            font-weight: bold; 
            color: #1f2937; 
            margin-bottom: 15px;
          }
          .stats { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 12px; 
            margin-bottom: 30px;
          }
          .stat-box { 
            background: #10b981; 
            color: white; 
            padding: 16px; 
            border-radius: 12px; 
            text-align: center;
          }
          .stat-box.warning { background: #f59e0b; }
          .stat-box.error { background: #ef4444; }
          .stat-number { 
            font-size: 28px; 
            font-weight: bold; 
            margin-bottom: 4px;
          }
          .stat-label { 
            font-size: 12px; 
            opacity: 0.9;
          }
          .component { 
            margin: 20px 0; 
            padding: 20px; 
            background: white; 
            border: 2px solid #e5e7eb;
            border-radius: 12px;
          }
          .component.warning { border-color: #f59e0b; background: #fffbeb; }
          .component.error { border-color: #ef4444; background: #fef2f2; }
          .component-header { 
            font-weight: bold; 
            font-size: 16px; 
            color: #1f2937; 
            margin-bottom: 12px;
          }
          .component-details { 
            font-size: 13px; 
            color: #4b5563; 
            margin-bottom: 16px;
            line-height: 1.6;
          }
          .component-image { 
            width: 100%; 
            max-width: 600px;
            height: auto;
            border-radius: 8px; 
            margin-top: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            margin: 8px 0;
          }
          .status-ok { background: #d1fae5; color: #065f46; }
          .status-replacement { background: #fee2e2; color: #991b1b; }
          .status-repair { background: #fef3c7; color: #92400e; }
          .notes { 
            background: #f3f4f6; 
            padding: 16px; 
            border-radius: 8px; 
            margin: 20px 0;
            font-size: 14px;
            line-height: 1.6;
            color: #374151;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Site-Rapport</h1>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Plats</div>
              <div class="value">${report.site_name}</div>
            </div>
            ${report.site_address ? `
            <div class="info-item">
              <div class="label">Adress</div>
              <div class="value">${report.site_address}</div>
            </div>` : ''}
            <div class="info-item">
              <div class="label">Tekniker</div>
              <div class="value">${report.technician_name || report.technician_email}</div>
            </div>
            <div class="info-item">
              <div class="label">Datum</div>
              <div class="value">${new Date(report.report_date).toLocaleDateString('sv-SE')}</div>
            </div>
            ${linkedOrder ? `
            <div class="info-item">
              <div class="label">Kopplad order</div>
              <div class="value">${linkedOrder.order_number || linkedOrder.customer_name}</div>
            </div>` : ''}
            ${report.gps_latitude && report.gps_longitude ? `
            <div class="info-item">
              <div class="label">GPS-koordinater</div>
              <div class="value">${report.gps_latitude.toFixed(6)}, ${report.gps_longitude.toFixed(6)}</div>
            </div>` : ''}
          </div>
        </div>

        ${report.notes ? `
        <div class="notes">
          <strong>Anteckningar:</strong><br><br>
          ${report.notes.replace(/\n/g, '<br>')}
        </div>` : ''}

        <div class="stats">
          <div class="stat-box">
            <div class="stat-number">${images.length}</div>
            <div class="stat-label">Totalt bilder</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${confirmed.length}</div>
            <div class="stat-label">Bekräftade</div>
          </div>
          <div class="stat-box warning">
            <div class="stat-number">${needsRepair.length}</div>
            <div class="stat-label">Behöver repareras</div>
          </div>
          <div class="stat-box error">
            <div class="stat-number">${needsReplacement.length}</div>
            <div class="stat-label">Behöver bytas</div>
          </div>
        </div>

        ${linkedOrder && orderItems.length > 0 ? `
        <div class="section">
          <div class="section-title">Artiklar från order</div>
          ${orderItems.map(item => `
            <div style="margin: 12px 0; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
              <strong>${item.article_name || 'Okänd artikel'}</strong><br>
              ${item.article_batch_number ? `Batch: ${item.article_batch_number}<br>` : ''}
              Antal: ${item.quantity_ordered} st
              ${item.shelf_address ? `<br>Plats: ${item.shelf_address}` : ''}
            </div>
          `).join('')}
        </div>` : ''}

        ${confirmed.length > 0 ? `
        <div class="section">
          <div class="section-title">Dokumenterade komponenter</div>
          ${confirmed.map(image => {
            const article = allArticles.find(a => a.id === image.matched_article_id);
            if (!article) return '';
            
            const statusClass = image.component_status === 'ok' ? 'status-ok' : 
                               image.component_status === 'needs_replacement' ? 'status-replacement' : 
                               'status-repair';
            const statusText = image.component_status === 'ok' ? 'OK - Fungerar' :
                             image.component_status === 'needs_replacement' ? 'Behöver bytas ut' :
                             image.component_status === 'needs_repair' ? 'Behöver repareras' : 'Dokumenterad';
            
            const componentClass = image.component_status === 'needs_replacement' ? 'error' :
                                  image.component_status === 'needs_repair' ? 'warning' : '';
            
            return `
              <div class="component ${componentClass}">
                <div class="component-header">${article.name}</div>
                <div class="component-details">
                  ${article.batch_number ? `<strong>Batch:</strong> ${article.batch_number}<br>` : ''}
                  <span class="status-badge ${statusClass}">${statusText}</span>
                  ${image.form_data ? Object.keys(image.form_data)
                    .filter(key => key !== 'component_status' && image.form_data[key])
                    .map(key => `<br><strong>${key}:</strong> ${image.form_data[key]}`)
                    .join('') : ''}
                </div>
                <img src="${image.image_url}" class="component-image" alt="Komponent" />
              </div>
            `;
          }).join('')}
        </div>` : ''}
      </body>
      </html>
    `;

    return Response.json({ 
      html: htmlContent,
      filename: `site-rapport-${report.site_name}-${new Date(report.report_date).toISOString().split('T')[0]}`
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});