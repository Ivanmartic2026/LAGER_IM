import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'Ingen fil-URL angiven' }, { status: 400 });
    }

    // Fetch file from URL
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json({ error: 'Kunde inte ladda fil' }, { status: 400 });
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return Response.json({ error: 'Excel-filen är tom' }, { status: 400 });
    }

    // Get available columns
    const availableColumns = data.length > 0 ? Object.keys(data[0]) : [];
    console.log('Excel columns found:', availableColumns);

    // Get existing articles and suppliers for context
    const existingArticles = await base44.asServiceRole.entities.Article.list('-created_date', 10000);
    const suppliers = await base44.asServiceRole.entities.Supplier.list();

    const articleMap = {};
    existingArticles.forEach(a => {
      if (a.id) articleMap[a.id] = a;
      if (a.batch_number) articleMap[a.batch_number] = a;
    });

    const supplierNameMap = {};
    suppliers.forEach(s => supplierNameMap[s.name?.toLowerCase()] = s.id);

    // Parse and prepare articles for preview
    const parsedArticles = data.map((row, i) => {
      const articleData = {
        sku: row['Artikelnummer']?.toString().trim() || undefined,
        name: row['Benämning']?.toString().trim() || row['Artikelnamn']?.toString().trim() || row['Kundnamn']?.toString().trim() || `Artikel ${i + 1}`,
        supplier_name: row['Leverantör']?.toString().trim() || undefined,
        supplier_price: row['Leverantörspris'] ? parseFloat(row['Leverantörspris']) : undefined,
        category: row['Typ av artikel']?.toString().trim() || row['Kategori']?.toString().trim() || undefined,
        is_stock_item: row['Lagervara']?.toString().toLowerCase().includes('ja') || row['Lagervara']?.toString() === '1' || row['Lagervara'] === true,
        dimensions_width_mm: row['Bredd (mm)']?.toString() ? parseFloat(row['Bredd (mm)']) : undefined,
        dimensions_height_mm: row['Höjd (mm)']?.toString() ? parseFloat(row['Höjd (mm)']) : undefined,
        dimensions_depth_mm: row['Djup (mm)']?.toString() ? parseFloat(row['Djup (mm)']) : undefined,
        weight_g: row['Vikt (g)']?.toString() ? parseFloat(row['Vikt (g)']) : undefined,
        stock_qty: row['I lager'] !== undefined ? parseInt(row['I lager']) : (row['Lagersaldo'] !== undefined ? parseInt(row['Lagersaldo']) : 0),
        warehouse: row['Lagerställe']?.toString().trim() || row['Lager']?.toString().trim() || undefined,
        shelf_address: row['Lagerplats']?.toString().trim() || row['Hyllplats']?.toString().trim() ? [row['Lagerplats']?.toString().trim() || row['Hyllplats']?.toString().trim()] : [],
        storage_type: row['Lagertyp']?.toString().trim() === 'Kundägt lager' ? 'customer_owned' : 'company_owned',
        calculated_cost: row['Kalkylkostnad']?.toString() ? parseFloat(row['Kalkylkostnad']) : undefined,
        batch_number: row['Batch Nummer']?.toString().trim() || row['Batchnummer']?.toString().trim() || `AUTO-${Date.now()}-${i}`,
        pixel_pitch_mm: row['Pixel Pitch']?.toString() ? parseFloat(row['Pixel Pitch']) : (row['Pixel Pitch (mm)']?.toString() ? parseFloat(row['Pixel Pitch (mm)']) : undefined),
        customer_name: row['Kundnamn']?.toString().trim() || undefined,
        pitch_value: row['Pitch värde']?.toString().trim() || row['Pitch']?.toString().trim() || undefined,
        series: row['Serie']?.toString().trim() || undefined,
        product_version: row['Version']?.toString().trim() || undefined,
        brightness_nits: row['Ljusstyrka (nits)']?.toString() ? parseFloat(row['Ljusstyrka (nits)']) : undefined,
        manufacturer: row['Tillverkare']?.toString().trim() || undefined,
        manufacturing_date: row['Tillverkningsdatum'] || undefined,
        min_stock_level: row['Min. Lagernivå']?.toString() ? parseInt(row['Min. Lagernivå']) : undefined,
        status: row['Status']?.toString().trim() || 'active',
        supplier_product_code: row['Produktkod']?.toString().trim() || undefined,
        notes: row['Anteckningar']?.toString().trim() || undefined
      };

      // Handle supplier lookup
      if (row['Leverantör']) {
        const supplierName = row['Leverantör'].toString().toLowerCase().trim();
        articleData.supplier_id = supplierNameMap[supplierName] || undefined;
      }

      // Check if article exists
      const existingArticleById = row['ID'] ? articleMap[row['ID']] : null;
      const existingArticleByBatch = articleMap[articleData.batch_number];
      const existingArticle = existingArticleById || existingArticleByBatch;

      return {
        rowNumber: i + 2,
        data: articleData,
        existingArticle: existingArticle ? {
          id: existingArticle.id,
          name: existingArticle.name,
          batch_number: existingArticle.batch_number,
          stock_qty: existingArticle.stock_qty
        } : null,
        action: existingArticle ? 'update' : 'create'
      };
    });

    return Response.json({
      success: true,
      columns: availableColumns,
      articles: parsedArticles,
      total: parsedArticles.length
    });

  } catch (error) {
    console.error('Error parsing file:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});