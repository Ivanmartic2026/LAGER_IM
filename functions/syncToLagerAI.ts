import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const lagerAiUrl = Deno.env.get("LAGER_AI_URL");
    if (!lagerAiUrl) {
      return Response.json({ error: 'LAGER_AI_URL is not configured' }, { status: 500 });
    }

    // Get all articles as JSON
    const articles = await base44.asServiceRole.entities.Article.list('-created_date', 10000);
    const suppliers = await base44.asServiceRole.entities.Supplier.list();

    const supplierMap = {};
    suppliers.forEach(s => supplierMap[s.id] = s.name);

    const payload = articles.map(article => ({
      id: article.id,
      sku: article.sku || '',
      name: article.name || '',
      supplier: article.supplier_id ? supplierMap[article.supplier_id] : (article.supplier_name || ''),
      category: article.category || '',
      stock_qty: article.stock_qty || 0,
      warehouse: article.warehouse || '',
      shelf_address: Array.isArray(article.shelf_address) ? article.shelf_address.join(', ') : (article.shelf_address || ''),
      batch_number: article.batch_number || '',
      pixel_pitch_mm: article.pixel_pitch_mm || '',
      customer_name: article.customer_name || '',
      pitch_value: article.pitch_value || '',
      series: article.series || '',
      product_version: article.product_version || '',
      manufacturer: article.manufacturer || '',
      manufacturing_date: article.manufacturing_date || '',
      brightness_nits: article.brightness_nits || '',
      status: article.status || 'active',
      supplier_product_code: article.supplier_product_code || '',
      dimensions_width_mm: article.dimensions_width_mm || '',
      dimensions_height_mm: article.dimensions_height_mm || '',
      dimensions_depth_mm: article.dimensions_depth_mm || '',
      weight_g: article.weight_g || '',
      min_stock_level: article.min_stock_level || '',
      notes: article.notes || '',
      created_date: article.created_date || '',
      updated_date: article.updated_date || ''
    }));

    let response;
    try {
      response = await fetch(lagerAiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ articles: payload }),
        signal: AbortSignal.timeout(30000)
      });
    } catch (fetchError) {
      console.warn('Lager AI server unreachable:', fetchError.message);
      return Response.json({ 
        success: false, 
        warning: 'Lager AI server is unreachable. Sync skipped.',
        article_count: payload.length
      }, { status: 200 });
    }

    if (!response.ok) {
      const text = await response.text();
      return Response.json({ error: `Lager AI responded with ${response.status}: ${text}` }, { status: 502 });
    }

    return Response.json({ success: true, article_count: payload.length });

  } catch (error) {
    console.error('Error syncing to Lager AI:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});