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

    // A4 size at 300 DPI: 2480 x 3508 pixels
    const width = 2480;
    const height = 3508;
    const margin = 120;

    // Create canvas
    const { createCanvas } = await import('https://deno.land/x/canvas@v1.4.1/mod.ts');
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Header background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, 300);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px sans-serif';
    ctx.fillText(article.name || 'Artikel', margin, 150);

    // Batch
    ctx.font = '50px sans-serif';
    ctx.fillText(`Batch: ${article.batch_number || 'N/A'}`, margin, 230);

    let y = 400;
    ctx.fillStyle = '#000000';

    // Helper to add section
    const addSection = (title, fields) => {
      // Section header
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(margin, y, width - margin * 2, 80);
      
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 50px sans-serif';
      ctx.fillText(title, margin + 20, y + 55);
      
      y += 100;
      ctx.fillStyle = '#000000';
      ctx.font = '40px sans-serif';

      for (const [label, value] of fields) {
        if (value !== null && value !== undefined && value !== '') {
          ctx.font = 'bold 40px sans-serif';
          ctx.fillText(label + ':', margin + 20, y);
          ctx.font = '40px sans-serif';
          ctx.fillText(String(value), margin + 500, y);
          y += 60;
        }
      }
      y += 40;
    };

    // Article info
    addSection('Artikelinformation', [
      ['Tillverkare', article.manufacturer],
      ['Tillverkningsdatum', article.manufacturing_date],
      ['Kategori', article.category],
      ['Pixel Pitch', article.pixel_pitch_mm ? `${article.pixel_pitch_mm} mm` : null]
    ]);

    // Location & dimensions
    const dims = (article.dimensions_width_mm || article.dimensions_height_mm || article.dimensions_depth_mm)
      ? `${article.dimensions_width_mm || '-'} x ${article.dimensions_height_mm || '-'} x ${article.dimensions_depth_mm || '-'} mm`
      : null;
    
    addSection('Lagerplats & Matt', [
      ['Hyllplats', article.shelf_address],
      ['Lager', article.warehouse],
      ['Dimensioner', dims],
      ['Vikt', article.weight_g ? `${article.weight_g} g` : null]
    ]);

    // Stock status
    addSection('Lagerstatus', [
      ['Lagersaldo', article.stock_qty || 0],
      ['Min. lagerniva', article.min_stock_level],
      ['Status', article.status]
    ]);

    // Notes
    if (article.notes) {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(margin, y, width - margin * 2, 80);
      
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 50px sans-serif';
      ctx.fillText('Anteckningar', margin + 20, y + 55);
      
      y += 100;
      ctx.fillStyle = '#000000';
      ctx.font = '35px sans-serif';
      
      const maxWidth = width - margin * 2 - 40;
      const words = article.notes.split(' ');
      let line = '';
      let lineCount = 0;
      const maxLines = 4;
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line, margin + 20, y);
          line = word + ' ';
          y += 50;
          lineCount++;
          if (lineCount >= maxLines) break;
        } else {
          line = testLine;
        }
      }
      if (lineCount < maxLines && line !== '') {
        ctx.fillText(line, margin + 20, y);
        y += 50;
      }
      y += 40;
    }

    // QR Code
    if (article.batch_number) {
      try {
        const qrDataUrl = await QRCode.toDataURL(article.batch_number, {
          errorCorrectionLevel: 'H',
          width: 600,
          margin: 2
        });

        // Load QR image
        const qrImage = await loadImage(qrDataUrl);
        const qrSize = 600;
        const qrX = (width - qrSize) / 2;
        
        y += 60;
        ctx.drawImage(qrImage, qrX, y, qrSize, qrSize);
        
        // Batch text below QR
        ctx.font = 'bold 55px sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(article.batch_number, width / 2, y + qrSize + 80);
        ctx.textAlign = 'left';
        
      } catch (qrError) {
        console.error('QR error:', qrError);
      }
    }

    // Footer
    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText(`Genererad: ${new Date().toLocaleString('sv-SE')}`, margin, height - 60);

    // Convert to PNG
    const pngBuffer = canvas.toBuffer('image/png');

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename=artikel_${article.batch_number || 'label'}_${Date.now()}.png`
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helper to load image from data URL
async function loadImage(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const imageData = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const { Image } = await import('https://deno.land/x/canvas@v1.4.1/mod.ts');
  const img = new Image();
  img.src = imageData;
  return img;
}