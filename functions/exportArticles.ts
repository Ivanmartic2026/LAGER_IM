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
      'Artikelnummer': article.sku || '',
      'Benämning': article.name || '',
      'Leverantör': article.supplier_id ? supplierMap[article.supplier_id] : (article.supplier_name || ''),
      'Leverantörspris': article.supplier_price || '',
      'Typ av artikel': article.category || '',
      'Lagervara': article.is_stock_item !== false ? 'Ja' : 'Nej',
      'Bredd (mm)': article.dimensions_width_mm || '',
      'Höjd (mm)': article.dimensions_height_mm || '',
      'Djup (mm)': article.dimensions_depth_mm || '',
      'Vikt (g)': article.weight_g || (article.weight_kg ? article.weight_kg * 1000 : ''),
      'I lager': article.stock_qty || 0,
      'Lagerställe': article.warehouse || '',
      'Lagerplats': article.shelf_address || '',
      'Kalkylkostnad': article.calculated_cost || '',
      'Batch Nummer': article.batch_number || '',
      'Pixel Pitch': article.pixel_pitch_mm || '',
      'Kundnamn': article.customer_name || '',
      'Pitch värde': article.pitch_value || '',
      'Serie': article.series || '',
      'Version': article.product_version || '',
      'Ljusstyrka (nits)': article.brightness_nits || '',
      'Tillverkare': article.manufacturer || '',
      'Tillverkningsdatum': article.manufacturing_date || '',
      'Min. Lagernivå': article.min_stock_level || '',
      'Status': article.status || 'active',
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
      { wch: 20 }, // Artikelnummer
      { wch: 30 }, // Benämning
      { wch: 20 }, // Leverantör
      { wch: 12 }, // Leverantörspris
      { wch: 15 }, // Typ av artikel
      { wch: 10 }, // Lagervara
      { wch: 10 }, // Bredd
      { wch: 10 }, // Höjd
      { wch: 10 }, // Djup
      { wch: 10 }, // Vikt
      { wch: 10 }, // I lager
      { wch: 15 }, // Lagerställe
      { wch: 15 }, // Lagerplats
      { wch: 12 }, // Kalkylkostnad
      { wch: 15 }, // Batch Nummer
      { wch: 12 }, // Pixel Pitch
      { wch: 30 }, // Kundnamn
      { wch: 10 }, // Pitch värde
      { wch: 15 }, // Serie
      { wch: 10 }, // Version
      { wch: 12 }, // Ljusstyrka
      { wch: 20 }, // Tillverkare
      { wch: 15 }, // Tillverkningsdatum
      { wch: 12 }, // Min. Lagernivå
      { wch: 12 }, // Status
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