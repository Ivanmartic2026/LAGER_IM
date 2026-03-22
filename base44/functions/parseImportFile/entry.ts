import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { file_url, columnMapping } = await req.json();

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
    
    // Get all columns from the worksheet range (including empty cells in first row)
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const availableColumns = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        availableColumns.push(cell.v.toString());
      }
    }
    console.log('Excel columns found:', availableColumns);
    
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return Response.json({ error: 'Excel-filen är tom' }, { status: 400 });
    }

    // If no column mapping provided, return columns for mapping UI
    if (!columnMapping) {
      return Response.json({
        success: true,
        needsMapping: true,
        columns: availableColumns,
        previewData: data.slice(0, 5) // Send first 5 rows for preview
      });
    }

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

    // Helper function to get value from row based on mapping
    const getValueFromMapping = (row, excelColumn, fieldType) => {
      if (!excelColumn || excelColumn === 'ignore') return undefined;
      const value = row[excelColumn];
      if (value === undefined || value === null || value === '') return undefined;
      
      const stringValue = value.toString().trim();
      
      // Handle different field types
      switch (fieldType) {
        case 'number':
          return parseFloat(stringValue) || undefined;
        case 'integer':
          return parseInt(stringValue) || undefined;
        case 'boolean':
          return stringValue.toLowerCase().includes('ja') || stringValue === '1' || value === true;
        case 'array':
          return stringValue ? [stringValue] : [];
        default:
          return stringValue || undefined;
      }
    };

    // Helper function to combine all columns mapped to 'notes'
    const getCombinedNotes = (row, mapping) => {
      const noteColumns = Object.keys(mapping).filter(excelCol => mapping[excelCol] === 'notes');
      const notes = noteColumns
        .map(col => getValueFromMapping(row, col, 'string'))
        .filter(Boolean);
      return notes.length > 0 ? notes.join('\n') : undefined;
    };

    // Reverse the mapping to find Excel column for each field (excluding 'notes' which is handled separately)
    const reverseMapping = {};
    Object.entries(columnMapping).forEach(([excelCol, field]) => {
      if (field !== 'ignore' && field !== 'notes') {
        reverseMapping[field] = excelCol;
      }
    });

    // Parse and prepare articles for preview
    const parsedArticles = data.map((row, i) => {
      const articleData = {
        sku: getValueFromMapping(row, reverseMapping.sku, 'string'),
        name: getValueFromMapping(row, reverseMapping.name, 'string') || `Artikel ${i + 1}`,
        supplier_name: getValueFromMapping(row, reverseMapping.supplier_name, 'string'),
        supplier_price: getValueFromMapping(row, reverseMapping.supplier_price, 'number'),
        supplier_product_code: getValueFromMapping(row, reverseMapping.supplier_product_code, 'string'),
        category: getValueFromMapping(row, reverseMapping.category, 'string'),
        storage_type: (() => {
          const storageTypeValue = getValueFromMapping(row, reverseMapping.storage_type, 'string');
          if (!storageTypeValue) return 'company_owned';
          const normalized = storageTypeValue.toLowerCase();
          return normalized.includes('kund') ? 'customer_owned' : 'company_owned';
        })(),
        dimensions_width_mm: getValueFromMapping(row, reverseMapping.dimensions_width_mm, 'number'),
        dimensions_height_mm: getValueFromMapping(row, reverseMapping.dimensions_height_mm, 'number'),
        dimensions_depth_mm: getValueFromMapping(row, reverseMapping.dimensions_depth_mm, 'number'),
        weight_g: getValueFromMapping(row, reverseMapping.weight_g, 'number'),
        stock_qty: getValueFromMapping(row, reverseMapping.stock_qty, 'integer') || 0,
        warehouse: getValueFromMapping(row, reverseMapping.warehouse, 'string'),
        shelf_address: getValueFromMapping(row, reverseMapping.shelf_address, 'array'),
        calculated_cost: getValueFromMapping(row, reverseMapping.calculated_cost, 'number'),
        batch_number: getValueFromMapping(row, reverseMapping.batch_number, 'string') || `AUTO-${Date.now()}-${i}`,
        pixel_pitch_mm: getValueFromMapping(row, reverseMapping.pixel_pitch_mm, 'number'),
        customer_name: getValueFromMapping(row, reverseMapping.customer_name, 'string'),
        pitch_value: getValueFromMapping(row, reverseMapping.pitch_value, 'string'),
        series: getValueFromMapping(row, reverseMapping.series, 'string'),
        product_version: getValueFromMapping(row, reverseMapping.product_version, 'string'),
        brightness_nits: getValueFromMapping(row, reverseMapping.brightness_nits, 'number'),
        manufacturer: getValueFromMapping(row, reverseMapping.manufacturer, 'string'),
        manufacturing_date: getValueFromMapping(row, reverseMapping.manufacturing_date, 'string'),
        min_stock_level: getValueFromMapping(row, reverseMapping.min_stock_level, 'integer'),
        status: getValueFromMapping(row, reverseMapping.status, 'string') || 'active',
        notes: getCombinedNotes(row, columnMapping)
      };

      // Handle supplier lookup
      if (articleData.supplier_name) {
        const supplierName = articleData.supplier_name.toLowerCase().trim();
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
      needsMapping: false,
      columns: availableColumns,
      articles: parsedArticles,
      total: parsedArticles.length
    });

  } catch (error) {
    console.error('Error parsing file:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});