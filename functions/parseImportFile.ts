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
        customer_name: row['Kundnamn']?.toString().trim() || undefined,
        sku: row['SKU']?.toString().trim() || undefined,
        batch_number: row['Batchnummer']?.toString().trim() || `AUTO-${Date.now()}-${i}`,
        name: row['Artikelnamn']?.toString().trim() || row['Kundnamn']?.toString().trim() || `Artikel ${i + 1}`,
        pitch_value: row['Pitch']?.toString().trim() || undefined,
        series: row['Serie']?.toString().trim() || undefined,
        product_version: row['Version']?.toString().trim() || undefined,
        brightness_nits: row['Ljusstyrka (nits)'] ? parseFloat(row['Ljusstyrka (nits)']) : undefined,
        manufacturer: row['Tillverkare']?.toString().trim() || undefined,
        manufacturing_date: row['Tillverkningsdatum'] || undefined,
        pixel_pitch_mm: row['Pixel Pitch (mm)'] ? parseFloat(row['Pixel Pitch (mm)']) : undefined,
        shelf_address: row['Hyllplats']?.toString().trim() || undefined,
        dimensions_width_mm: row['Bredd (mm)'] ? parseFloat(row['Bredd (mm)']) : undefined,
        dimensions_height_mm: row['Höjd (mm)'] ? parseFloat(row['Höjd (mm)']) : undefined,
        dimensions_depth_mm: row['Djup (mm)'] ? parseFloat(row['Djup (mm)']) : undefined,
        weight_kg: row['Vikt (kg)'] ? parseFloat(row['Vikt (kg)']) : undefined,
        stock_qty: row['Lagersaldo'] !== undefined ? parseInt(row['Lagersaldo']) : 0,
        min_stock_level: row['Min. Lagernivå'] ? parseInt(row['Min. Lagernivå']) : undefined,
        warehouse: row['Lager']?.toString().trim() || undefined,
        category: row['Kategori']?.toString().trim() || undefined,
        status: row['Status']?.toString().trim() || 'active',
        supplier_price: row['Leverantörspris'] ? parseFloat(row['Leverantörspris']) : undefined,
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