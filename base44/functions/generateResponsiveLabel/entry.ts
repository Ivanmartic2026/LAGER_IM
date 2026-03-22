import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import QRCode from 'npm:qrcode@1.5.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { articleId } = await req.json();

    if (!articleId) {
      return Response.json({ error: 'Article ID required' }, { status: 400 });
    }

    const articles = await base44.asServiceRole.entities.Article.filter({ id: articleId });
    
    if (!articles || articles.length === 0) {
      return Response.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = articles[0];

    const qrCodeDataUrl = article.batch_number 
      ? await QRCode.toDataURL(article.batch_number, { 
          width: 400,
          margin: 2,
          errorCorrectionLevel: 'H'
        })
      : null;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Etikett - ${article.name || 'Artikel'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body { 
      font-family: Arial, sans-serif; 
      background: #0f172a;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .controls {
      background: #1e293b;
      padding: 1rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
    }

    .controls button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .controls button:hover {
      background: #2563eb;
    }

    .controls input[type="range"] {
      width: 200px;
    }

    .controls label {
      color: white;
      font-size: 0.875rem;
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .scale-value {
      background: #334155;
      padding: 0.25rem 0.75rem;
      border-radius: 0.25rem;
      font-weight: 600;
    }

    .label-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      overflow: auto;
    }

    .label {
      background: white;
      transform-origin: center;
      transition: transform 0.2s ease;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
    }

    .header {
      background: #1e293b;
      color: white;
      padding: 10mm;
      margin: -20mm -20mm 10mm -20mm;
    }

    .header h1 { 
      font-size: 2rem; 
      margin-bottom: 0.25rem;
      font-weight: bold;
    }

    .header .batch { 
      font-size: 1rem; 
      opacity: 0.9; 
    }

    .section {
      background: #f1f5f9;
      padding: 5mm;
      margin-bottom: 5mm;
      border-radius: 2mm;
    }

    .section h2 { 
      font-size: 1.125rem; 
      color: #334155; 
      margin-bottom: 0.5rem;
      font-weight: bold;
    }

    .field { 
      display: flex;
      padding: 0.375rem 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.875rem;
    }

    .field:last-child { border-bottom: none; }

    .field-label { 
      font-weight: bold; 
      width: 50%;
      color: #475569;
    }

    .field-value { 
      color: #0f172a;
      flex: 1;
    }

    .qr-section {
      text-align: center;
      margin: 10mm 0;
    }

    .qr-section img {
      width: 100mm;
      height: 100mm;
    }

    .qr-section .label {
      font-size: 1.25rem;
      font-weight: bold;
      margin-top: 1rem;
      color: #0f172a;
    }

    .footer {
      text-align: center;
      color: #64748b;
      font-size: 0.75rem;
      margin-top: 10mm;
    }

    .repair-warning {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      padding: 5mm;
      margin: 5mm 0;
      border-radius: 2mm;
    }

    .repair-warning h2 {
      color: #b45309;
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }

    @media print {
      body {
        background: white;
      }

      .controls {
        display: none !important;
      }

      .label-container {
        padding: 0;
        display: block;
      }

      .label {
        box-shadow: none;
        transform: none !important;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="controls">
    <label>
      Skala:
      <input type="range" id="scaleSlider" min="50" max="200" value="100" step="5">
      <span class="scale-value" id="scaleValue">100%</span>
    </label>
    <button onclick="window.print()">🖨️ Skriv ut</button>
    <button onclick="resetScale()">↺ Återställ skala</button>
  </div>

  <div class="label-container">
    <div class="label" id="label">
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
        <div style="padding: 0.5rem 0; font-size: 0.875rem; color: #0f172a;">${article.notes}</div>
      </div>
      ` : ''}

      ${article.status === 'on_repair' && article.repair_notes ? `
      <div class="repair-warning">
        <h2>⚠️ PÅ REPARATION</h2>
        <div style="font-size: 0.875rem; color: #0f172a; margin-top: 0.5rem;">${article.repair_notes}</div>
        ${article.repair_date ? `<div style="font-size: 0.75rem; color: #78716c; margin-top: 0.5rem;">Skickad: ${article.repair_date}</div>` : ''}
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
    </div>
  </div>

  <script>
    const slider = document.getElementById('scaleSlider');
    const scaleValue = document.getElementById('scaleValue');
    const label = document.getElementById('label');

    slider.addEventListener('input', (e) => {
      const scale = e.target.value / 100;
      label.style.transform = \`scale(\${scale})\`;
      scaleValue.textContent = e.target.value + '%';
    });

    function resetScale() {
      slider.value = 100;
      label.style.transform = 'scale(1)';
      scaleValue.textContent = '100%';
    }
  </script>
</body>
</html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});