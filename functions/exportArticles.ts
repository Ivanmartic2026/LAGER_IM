import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all articles and suppliers
    const articles = await base44.asServiceRole.entities.Article.list('-created_date', 10000);
    const suppliers = await base44.asServiceRole.entities.Supplier.list();

    // Create supplier lookup map
    const supplierMap = {};
    suppliers.forEach(s => supplierMap[s.id] = s.name);

    // Prepare data for Excel
    const excelData = articles.map(article => ({
      'Kundnamn': article.customer_name || '',
      'SKU': article.sku || '',
      'Batchnummer': article.batch_number || '',
      'Artikelnamn': article.name || '',
      'Pitch': article.pitch_value || '',
      'Serie': article.series || '',
      'Version': article.product_version || '',
      'Ljusstyrka (nits)': article.brightness_nits || '',
      'Tillverkare': article.manufacturer || '',
      'Tillverkningsdatum': article.manufacturing_date || '',
      'Pixel Pitch (mm)': article.pixel_pitch_mm || '',
      'Hyllplats': article.shelf_address || '',
      'Bredd (mm)': article.dimensions_width_mm || '',
      'Höjd (mm)': article.dimensions_height_mm || '',
      'Djup (mm)': article.dimensions_depth_mm || '',
      'Vikt (kg)': article.weight_kg || '',
      'Lagersaldo': article.stock_qty || 0,
      'Min. Lagernivå': article.min_stock_level || '',
      'Lager': article.warehouse || '',
      'Kategori': article.category || '',
      'Status': article.status || 'active',
      'Leverantör': article.supplier_id ? supplierMap[article.supplier_id] : '',
      'Leverantörspris': article.supplier_price || '',
      'Produktkod': article.supplier_product_code || '',
      'Anteckningar': article.notes || '',
      'Skapad': article.created_date || '',
      'Uppdaterad': article.updated_date || '',
      'ID': article.id || ''
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Kundnamn
      { wch: 25 }, // SKU
      { wch: 15 }, // Batchnummer
      { wch: 30 }, // Artikelnamn
      { wch: 10 }, // Pitch
      { wch: 15 }, // Serie
      { wch: 10 }, // Version
      { wch: 12 }, // Ljusstyrka
      { wch: 20 }, // Tillverkare
      { wch: 15 }, // Tillverkningsdatum
      { wch: 12 }, // Pixel Pitch
      { wch: 15 }, // Hyllplats
      { wch: 10 }, // Bredd
      { wch: 10 }, // Höjd
      { wch: 10 }, // Djup
      { wch: 10 }, // Vikt
      { wch: 12 }, // Lagersaldo
      { wch: 12 }, // Min. Lagernivå
      { wch: 15 }, // Lager
      { wch: 15 }, // Kategori
      { wch: 12 }, // Status
      { wch: 20 }, // Leverantör
      { wch: 12 }, // Leverantörspris
      { wch: 15 }, // Produktkod
      { wch: 40 }, // Anteckningar
      { wch: 20 }, // Skapad
      { wch: 20 }, // Uppdaterad
      { wch: 30 }  // ID
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Artiklar');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return as downloadable file
    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=artiklar_${new Date().toISOString().split('T')[0]}.xlsx`
      }
    });

  } catch (error) {
    console.error('Error exporting articles:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});