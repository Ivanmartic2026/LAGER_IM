import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { start_date, end_date } = await req.json();

    // Fetch movements
    const allMovements = await base44.asServiceRole.entities.StockMovement.list('-created_date', 50000);
    
    const movements = allMovements.filter(m => {
      const movementDate = new Date(m.created_date);
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);
      return movementDate >= startDate && movementDate <= endDate;
    });

    // Fetch articles
    const articles = await base44.asServiceRole.entities.Article.list('-updated_date', 10000);

    // Calculate turnover by article
    const turnoverByArticle = {};
    movements.forEach(movement => {
      if (!turnoverByArticle[movement.article_id]) {
        const article = articles.find(a => a.id === movement.article_id);
        turnoverByArticle[movement.article_id] = {
          article_name: article?.name || 'Okänd artikel',
          batch_number: article?.batch_number || '',
          warehouse: article?.warehouse || '',
          inbound: 0,
          outbound: 0,
          adjustments: 0,
          net: 0
        };
      }

      const qty = Math.abs(movement.quantity);

      if (movement.movement_type === 'inbound') {
        turnoverByArticle[movement.article_id].inbound += qty;
        turnoverByArticle[movement.article_id].net += qty;
      } else if (movement.movement_type === 'outbound') {
        turnoverByArticle[movement.article_id].outbound += qty;
        turnoverByArticle[movement.article_id].net -= qty;
      } else if (movement.movement_type === 'adjustment') {
        turnoverByArticle[movement.article_id].adjustments += Math.abs(movement.quantity);
        turnoverByArticle[movement.article_id].net += movement.quantity;
      }
    });

    // Prepare data
    const data = Object.values(turnoverByArticle).map(item => ({
      'Artikelnamn': item.article_name,
      'Batch': item.batch_number,
      'Lagerställe': item.warehouse,
      'Inleveranser': item.inbound,
      'Uttag': item.outbound,
      'Justeringar': item.adjustments,
      'Netto förändring': item.net,
      'Total aktivitet': item.inbound + item.outbound
    }));

    // Sort by total activity descending
    data.sort((a, b) => b['Total aktivitet'] - a['Total aktivitet']);

    // Calculate totals
    const totalInbound = data.reduce((sum, row) => sum + row['Inleveranser'], 0);
    const totalOutbound = data.reduce((sum, row) => sum + row['Uttag'], 0);
    const totalNet = data.reduce((sum, row) => sum + row['Netto förändring'], 0);

    // Add summary row
    data.push({
      'Artikelnamn': 'TOTALT',
      'Batch': '',
      'Lagerställe': '',
      'Inleveranser': totalInbound,
      'Uttag': totalOutbound,
      'Justeringar': '',
      'Netto förändring': totalNet,
      'Total aktivitet': totalInbound + totalOutbound
    });

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Omsättning');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=artikelomsattning_${start_date}_${end_date}.xlsx`
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});