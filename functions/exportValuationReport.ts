import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { warehouse, category } = await req.json();

    // Fetch articles
    const articles = await base44.asServiceRole.entities.Article.list('-updated_date', 10000);

    // Filter articles
    const filteredArticles = articles.filter(article => {
      if (!article.stock_qty || article.stock_qty <= 0) return false;
      if (warehouse && warehouse !== "all" && article.warehouse !== warehouse) return false;
      if (category && category !== "all" && article.category !== category) return false;
      return true;
    });

    // Prepare data
    const data = filteredArticles.map(article => {
      const qty = article.stock_qty || 0;
      const price = article.supplier_price || article.calculated_cost || 0;
      const value = qty * price;

      return {
        'Artikelnummer': article.sku || '',
        'Benämning': article.name,
        'Batch': article.batch_number || '',
        'Lagerställe': article.warehouse || '',
        'Lagerplats': article.shelf_address || '',
        'Kategori': article.category || '',
        'Antal i lager': qty,
        'Pris/st': price,
        'Totalt värde': value,
        'Leverantör': article.supplier_name || article.manufacturer || ''
      };
    });

    // Sort by value descending
    data.sort((a, b) => b['Totalt värde'] - a['Totalt värde']);

    // Calculate totals
    const totalQty = data.reduce((sum, row) => sum + row['Antal i lager'], 0);
    const totalValue = data.reduce((sum, row) => sum + row['Totalt värde'], 0);

    // Add summary row
    data.push({
      'Artikelnummer': '',
      'Benämning': 'TOTALT',
      'Batch': '',
      'Lagerställe': '',
      'Lagerplats': '',
      'Kategori': '',
      'Antal i lager': totalQty,
      'Pris/st': '',
      'Totalt värde': totalValue,
      'Leverantör': ''
    });

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lagervärdering');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=lagervardering_${new Date().toISOString().split('T')[0]}.xlsx`
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});