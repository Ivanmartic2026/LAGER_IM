import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const { report_type, filters = {}, date_range = {}, email_recipients = [] } = await req.json();

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch articles with filters
    const allArticles = await base44.asServiceRole.entities.Article.list('-updated_date', 1000);
    let articles = allArticles.filter(article => {
      if (filters.category && article.category !== filters.category) return false;
      if (filters.warehouse && article.warehouse !== filters.warehouse) return false;
      if (filters.status && article.status !== filters.status) return false;
      return true;
    });

    // Fetch movements with date range
    const allMovements = await base44.asServiceRole.entities.StockMovement.list('-created_date', 1000);
    let movements = allMovements.filter(movement => {
      if (date_range.start_date && new Date(movement.created_date) < new Date(date_range.start_date)) return false;
      if (date_range.end_date && new Date(movement.created_date) > new Date(date_range.end_date)) return false;
      return true;
    });

    let reportContent = '';
    let reportTitle = '';

    // Generate report based on type
    switch (report_type) {
      case 'stock_summary':
        reportTitle = 'Lagersaldo - Sammanfattning';
        reportContent = generateStockSummary(articles);
        break;
      
      case 'stock_movements':
        reportTitle = 'Lagerrörelser';
        reportContent = generateMovementsReport(movements, articles);
        break;
      
      case 'low_stock':
        reportTitle = 'Lågt Lagersaldo - Varning';
        const lowStockArticles = articles.filter(a => a.status === 'low_stock' || a.status === 'out_of_stock');
        reportContent = generateLowStockReport(lowStockArticles);
        break;
      
      case 'full_inventory':
        reportTitle = 'Fullständig Inventering';
        reportContent = generateFullInventory(articles, movements);
        break;
    }

    // Send email if recipients provided
    if (email_recipients.length > 0) {
      for (const email of email_recipients) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `${reportTitle} - ${new Date().toLocaleDateString('sv-SE')}`,
          body: reportContent
        });
      }
    }

    return Response.json({
      success: true,
      report: {
        title: reportTitle,
        content: reportContent,
        generated_at: new Date().toISOString(),
        articles_count: articles.length,
        movements_count: movements.length
      }
    });

  } catch (error) {
    console.error("Error generating report:", error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});

function generateStockSummary(articles) {
  const totalArticles = articles.length;
  const totalStock = articles.reduce((sum, a) => sum + (a.stock_qty || 0), 0);
  const lowStock = articles.filter(a => a.status === 'low_stock').length;
  const outOfStock = articles.filter(a => a.status === 'out_of_stock').length;
  const onRepair = articles.filter(a => a.status === 'on_repair').length;

  const byCategory = {};
  articles.forEach(a => {
    const cat = a.category || 'Okänd';
    if (!byCategory[cat]) byCategory[cat] = { count: 0, qty: 0 };
    byCategory[cat].count++;
    byCategory[cat].qty += (a.stock_qty || 0);
  });

  let html = `
    <h1 style="color: #1e293b; font-family: sans-serif;">Lagersaldo - Sammanfattning</h1>
    <p style="color: #64748b; font-family: sans-serif;">Genererad: ${new Date().toLocaleString('sv-SE')}</p>
    
    <h2 style="color: #334155; font-family: sans-serif; margin-top: 30px;">Översikt</h2>
    <table style="width: 100%; border-collapse: collapse; font-family: sans-serif;">
      <tr style="background: #f1f5f9;">
        <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Totalt antal artiklar</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0;">${totalArticles}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Totalt lagersaldo</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0;">${totalStock} st</td>
      </tr>
      <tr style="background: #fef3c7;">
        <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">⚠️ Lågt lager</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; color: #d97706;">${lowStock} artiklar</td>
      </tr>
      <tr style="background: #fee2e2;">
        <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">🚫 Slut i lager</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; color: #dc2626;">${outOfStock} artiklar</td>
      </tr>
      <tr style="background: #ffedd5;">
        <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">🔧 På reparation</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; color: #ea580c;">${onRepair} artiklar</td>
      </tr>
    </table>

    <h2 style="color: #334155; font-family: sans-serif; margin-top: 30px;">Per Kategori</h2>
    <table style="width: 100%; border-collapse: collapse; font-family: sans-serif;">
      <tr style="background: #1e293b; color: white;">
        <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Kategori</th>
        <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: right;">Antal artiklar</th>
        <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: right;">Totalt saldo</th>
      </tr>
      ${Object.entries(byCategory).map(([cat, data]) => `
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0;">${cat}</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right;">${data.count}</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right;">${data.qty} st</td>
        </tr>
      `).join('')}
    </table>
  `;

  return html;
}

function generateMovementsReport(movements, articles) {
  const articleMap = {};
  articles.forEach(a => articleMap[a.id] = a);

  const inbound = movements.filter(m => m.movement_type === 'inbound').length;
  const outbound = movements.filter(m => m.movement_type === 'outbound').length;
  const adjustments = movements.filter(m => m.movement_type === 'adjustment').length;
  const inventory = movements.filter(m => m.movement_type === 'inventory').length;

  let html = `
    <h1 style="color: #1e293b; font-family: sans-serif;">Lagerrörelser</h1>
    <p style="color: #64748b; font-family: sans-serif;">Genererad: ${new Date().toLocaleString('sv-SE')}</p>
    <p style="color: #64748b; font-family: sans-serif;">Antal rörelser: ${movements.length}</p>

    <h2 style="color: #334155; font-family: sans-serif; margin-top: 30px;">Sammanfattning</h2>
    <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; margin-bottom: 30px;">
      <tr style="background: #f1f5f9;">
        <td style="padding: 12px; border: 1px solid #e2e8f0;">📥 Inleveranser</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right; color: #059669;">${inbound}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #e2e8f0;">📤 Uttag</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">${outbound}</td>
      </tr>
      <tr style="background: #f1f5f9;">
        <td style="padding: 12px; border: 1px solid #e2e8f0;">⚙️ Justeringar</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right;">${adjustments}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #e2e8f0;">📋 Inventeringar</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right;">${inventory}</td>
      </tr>
    </table>

    <h2 style="color: #334155; font-family: sans-serif;">Senaste rörelser</h2>
    <table style="width: 100%; border-collapse: collapse; font-family: sans-serif;">
      <tr style="background: #1e293b; color: white;">
        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-size: 14px;">Datum</th>
        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-size: 14px;">Artikel</th>
        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-size: 14px;">Typ</th>
        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-size: 14px;">Antal</th>
        <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-size: 14px;">Anledning</th>
      </tr>
      ${movements.slice(0, 50).map(m => {
        const article = articleMap[m.article_id];
        const typeLabel = {
          'inbound': '📥 Inleverans',
          'outbound': '📤 Uttag',
          'adjustment': '⚙️ Justering',
          'inventory': '📋 Inventering'
        }[m.movement_type] || m.movement_type;
        
        return `
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 13px;">${new Date(m.created_date).toLocaleString('sv-SE')}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 13px;">${article?.name || 'Okänd'}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 13px;">${typeLabel}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-size: 13px; color: ${m.quantity > 0 ? '#059669' : '#dc2626'};">${m.quantity > 0 ? '+' : ''}${m.quantity}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 13px;">${m.reason || '-'}</td>
          </tr>
        `;
      }).join('')}
    </table>
    ${movements.length > 50 ? `<p style="color: #64748b; font-family: sans-serif; margin-top: 10px; font-style: italic;">Visar de senaste 50 av ${movements.length} rörelser</p>` : ''}
  `;

  return html;
}

function generateLowStockReport(articles) {
  let html = `
    <h1 style="color: #dc2626; font-family: sans-serif;">⚠️ Lågt Lagersaldo - Varning</h1>
    <p style="color: #64748b; font-family: sans-serif;">Genererad: ${new Date().toLocaleString('sv-SE')}</p>
    <p style="color: #dc2626; font-family: sans-serif; font-weight: bold;">${articles.length} artiklar kräver uppmärksamhet</p>

    <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; margin-top: 20px;">
      <tr style="background: #dc2626; color: white;">
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Artikel</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Batch</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">Status</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">Nuvarande saldo</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">Min. nivå</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Hyllplats</th>
      </tr>
      ${articles.map(a => `
        <tr style="background: ${a.status === 'out_of_stock' ? '#fee2e2' : '#fef3c7'};">
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${a.name}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${a.batch_number}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">
            ${a.status === 'out_of_stock' ? '🚫 SLUT' : '⚠️ LÅGT'}
          </td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: ${a.status === 'out_of_stock' ? '#dc2626' : '#d97706'};">
            ${a.stock_qty || 0} st
          </td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${a.min_stock_level || '-'}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${a.shelf_address || '-'}</td>
        </tr>
      `).join('')}
    </table>
  `;

  return html;
}

function generateFullInventory(articles, movements) {
  const totalValue = articles.reduce((sum, a) => sum + (a.stock_qty || 0), 0);
  
  let html = `
    <h1 style="color: #1e293b; font-family: sans-serif;">Fullständig Inventering</h1>
    <p style="color: #64748b; font-family: sans-serif;">Genererad: ${new Date().toLocaleString('sv-SE')}</p>

    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; font-family: sans-serif;">
      <h3 style="margin: 0 0 10px 0; color: #334155;">Totalt lagersaldo: ${totalValue} enheter</h3>
      <p style="margin: 0; color: #64748b;">${articles.length} unika artiklar registrerade</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-family: sans-serif;">
      <tr style="background: #1e293b; color: white;">
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left; font-size: 13px;">Batch</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left; font-size: 13px;">Artikel</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left; font-size: 13px;">Kategori</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-size: 13px;">Saldo</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left; font-size: 13px;">Hyllplats</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left; font-size: 13px;">Lager</th>
        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-size: 13px;">Status</th>
      </tr>
      ${articles.map((a, idx) => `
        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 12px;">${a.batch_number}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 12px;">${a.name}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 12px;">${a.category || '-'}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-size: 12px; font-weight: bold;">${a.stock_qty || 0}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 12px;">${a.shelf_address || '-'}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 12px;">${a.warehouse || '-'}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 11px;">
            ${a.status === 'active' ? '✅ Aktiv' : 
              a.status === 'low_stock' ? '⚠️ Lågt' : 
              a.status === 'out_of_stock' ? '🚫 Slut' : 
              a.status === 'on_repair' ? '🔧 Reparation' : a.status}
          </td>
        </tr>
      `).join('')}
    </table>
  `;

  return html;
}