import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import QRCode from 'npm:qrcode@1.5.3';

function buildArticleHTML(article, qrCodeDataUrl, width, height, margin) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      width: ${width}px; 
      height: ${height}px; 
      padding: ${margin}px;
      background: white;
    }
    .header {
      background: #1e293b;
      color: white;
      padding: 40px;
      margin: -${margin}px -${margin}px ${margin}px -${margin}px;
    }
    .header h1 { font-size: 48px; margin-bottom: 10px; }
    .header .batch { font-size: 24px; opacity: 0.9; }
    .section {
      background: #f1f5f9;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
    }
    .section h2 { 
      font-size: 24px; 
      color: #334155; 
      margin-bottom: 15px;
      font-weight: bold;
    }
    .field { 
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 18px;
    }
    .field:last-child { border-bottom: none; }
    .field-label { 
      font-weight: bold; 
      width: 250px;
      color: #475569;
    }
    .field-value { 
      color: #0f172a;
      flex: 1;
    }
    .qr-section {
      text-align: center;
      margin: 40px 0;
    }
    .qr-section img {
      width: 400px;
      height: 400px;
    }
    .qr-section .label {
      font-size: 28px;
      font-weight: bold;
      margin-top: 20px;
      color: #0f172a;
    }
    .footer {
      text-align: center;
      color: #64748b;
      font-size: 14px;
      margin-top: 40px;
    }
    .repair-warning {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .repair-warning h2 {
      color: #b45309;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${article.customer_name || article.name || 'Artikel'}</h1>
    <div class="batch">Batch: ${article.batch_number || 'N/A'}</div>
  </div>

  <div class="section">
    <h2>Artikelinformation</h2>
    ${article.sku ? `<div class="field"><div class="field-label">Artikelnummer (SKU):</div><div class="field-value">${article.sku}</div></div>` : ''}
    ${article.name ? `<div class="field"><div class="field-label">Benämning:</div><div class="field-value">${article.name}</div></div>` : ''}
    ${article.supplier_name ? `<div class="field"><div class="field-label">Leverantör:</div><div class="field-value">${article.supplier_name}</div></div>` : ''}
    ${article.category ? `<div class="field"><div class="field-label">Kategori:</div><div class="field-value">${article.category}</div></div>` : ''}
  </div>
  
  <div class="section">
    <h2>Teknisk Information</h2>
    ${article.pixel_pitch_mm ? `<div class="field"><div class="field-label">Pixel Pitch:</div><div class="field-value">${article.pixel_pitch_mm} mm</div></div>` : ''}
    ${article.series ? `<div class="field"><div class="field-label">Serie:</div><div class="field-value">${article.series}</div></div>` : ''}
    ${article.product_version ? `<div class="field"><div class="field-label">Version:</div><div class="field-value">${article.product_version}</div></div>` : ''}
    ${article.brightness_nits ? `<div class="field"><div class="field-label">Ljusstyrka:</div><div class="field-value">${article.brightness_nits} nits</div></div>` : ''}
    ${article.manufacturing_date ? `<div class="field"><div class="field-label">Tillverkningsdatum:</div><div class="field-value">${article.manufacturing_date}</div></div>` : ''}
  </div>

  <div class="section">
    <h2>Lagerplats & Mått</h2>
    ${article.warehouse ? `<div class="field"><div class="field-label">Lagerställe:</div><div class="field-value">${article.warehouse}</div></div>` : ''}
    ${article.shelf_address ? `<div class="field"><div class="field-label">Hyllplats:</div><div class="field-value">${article.shelf_address}</div></div>` : ''}
    ${(article.dimensions_width_mm || article.dimensions_height_mm || article.dimensions_depth_mm) ? `<div class="field"><div class="field-label">Dimensioner (BxHxD):</div><div class="field-value">${article.dimensions_width_mm || '-'} x ${article.dimensions_height_mm || '-'} x ${article.dimensions_depth_mm || '-'} mm</div></div>` : ''}
    ${article.weight_g ? `<div class="field"><div class="field-label">Vikt:</div><div class="field-value">${article.weight_g} g</div></div>` : ''}
  </div>

  ${article.notes ? `
  <div class="section">
    <h2>Anteckningar</h2>
    <div style="padding: 10px 0; font-size: 16px; color: #0f172a;">${article.notes}</div>
  </div>
  ` : ''}

  ${article.status === 'on_repair' && article.repair_notes ? `
  <div class="repair-warning">
    <h2>⚠️ PÅ REPARATION</h2>
    <div style="font-size: 16px; color: #0f172a; margin-top: 10px;">${article.repair_notes}</div>
    ${article.repair_date ? `<div style="font-size: 14px; color: #78716c; margin-top: 10px;">Skickad: ${article.repair_date}</div>` : ''}
  </div>
  ` : ''}

  ${qrCodeDataUrl ? `
  <div class="qr-section">
    <img src="${qrCodeDataUrl}" alt="QR Code" />
    <div class="label">${article.batch_number}</div>
  </div>
  ` : ''}

  <div class="footer">
    Genererad: ${new Date().toLocaleString('sv-SE')}
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both single articleId and multiple articleIds
    const articleIds = body.articleIds || (body.articleId ? [body.articleId] : []);

    if (!articleIds || articleIds.length === 0) {
      return Response.json({ error: 'Article ID(s) required' }, { status: 400 });
    }

    const width = 1240;
    const height = 1754;
    const margin = 80;

    // Fetch all articles
    const articleHtmlList = [];
    for (const articleId of articleIds) {
      const articles = await base44.asServiceRole.entities.Article.filter({ id: articleId });
      if (!articles || articles.length === 0) continue;

      const article = articles[0];
      const qrCodeDataUrl = article.batch_number
        ? await QRCode.toDataURL(article.batch_number, {
            width: 400,
            margin: 2,
            errorCorrectionLevel: 'H'
          })
        : null;

      articleHtmlList.push({
        id: article.id,
        name: article.batch_number || article.name || article.id,
        html: buildArticleHTML(article, qrCodeDataUrl, width, height, margin)
      });
    }

    if (articleHtmlList.length === 0) {
      return Response.json({ error: 'No articles found' }, { status: 404 });
    }

    // If single article, return HTML directly (backwards compatible)
    if (articleHtmlList.length === 1) {
      return new Response(articleHtmlList[0].html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // Multiple articles: return JSON with array of html strings
    return Response.json({ articles: articleHtmlList });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});