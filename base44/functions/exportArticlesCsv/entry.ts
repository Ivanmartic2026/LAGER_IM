import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all articles and suppliers
    const articles = await base44.asServiceRole.entities.Article.list('-created_date', 10000);
    const suppliers = await base44.asServiceRole.entities.Supplier.list();

    // Create supplier lookup map
    const supplierMap = {};
    suppliers.forEach(s => supplierMap[s.id] = s.name);

    // CSV headers
    const headers = [
      'Artikelnummer', 'Benämning', 'Leverantör', 'Leverantörspris', 'Typ av artikel', 'Lagervara',
      'Bredd (mm)', 'Höjd (mm)', 'Djup (mm)', 'Vikt (g)', 'I lager', 'Lagerställe', 'Lagerplats',
      'Kalkylkostnad', 'Batch Nummer', 'Pixel Pitch', 'Kundnamn', 'Pitch värde', 'Serie', 'Version',
      'Ljusstyrka (nits)', 'Tillverkare', 'Tillverkningsdatum', 'Min. Lagernivå', 'Status',
      'Produktkod', 'Anteckningar', 'Skapad', 'Uppdaterad', 'ID'
    ];

    // Helper to escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Generate CSV rows
    const rows = articles.map(article => [
      article.sku || '',
      article.name || '',
      article.supplier_id ? supplierMap[article.supplier_id] : (article.supplier_name || ''),
      article.supplier_price || '',
      article.category || '',
      article.is_stock_item !== false ? 'Ja' : 'Nej',
      article.dimensions_width_mm || '',
      article.dimensions_height_mm || '',
      article.dimensions_depth_mm || '',
      article.weight_g || (article.weight_kg ? article.weight_kg * 1000 : ''),
      article.stock_qty || 0,
      article.warehouse || '',
      article.shelf_address || '',
      article.calculated_cost || '',
      article.batch_number || '',
      article.pixel_pitch_mm || '',
      article.customer_name || '',
      article.pitch_value || '',
      article.series || '',
      article.product_version || '',
      article.brightness_nits || '',
      article.manufacturer || '',
      article.manufacturing_date || '',
      article.min_stock_level || '',
      article.status || 'active',
      article.supplier_product_code || '',
      article.notes || '',
      article.created_date || '',
      article.updated_date || '',
      article.id || ''
    ].map(escapeCSV).join(','));

    // Build CSV content
    const csvContent = [headers.map(escapeCSV).join(','), ...rows].join('\n');

    // Return as downloadable file with UTF-8 BOM for Excel compatibility
    const bom = '\uFEFF';
    return new Response(bom + csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=artiklar_${new Date().toISOString().split('T')[0]}.csv`
      }
    });

  } catch (error) {
    console.error('Error exporting articles to CSV:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});