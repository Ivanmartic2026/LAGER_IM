import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { articleId } = await req.json();

    if (!articleId) {
      return Response.json({ error: 'Article ID required' }, { status: 400 });
    }

    // Get article details
    const articles = await base44.entities.Article.filter({ id: articleId });
    
    if (!articles || articles.length === 0) {
      return Response.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = articles[0];

    // Create PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Header with gradient effect (simulated with rectangles)
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text(article.name || 'Artikel', margin, 25);
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    doc.text(`Batch: ${article.batch_number}`, margin, 35);

    // QR Code URL (simplified)
    const qrUrl = `https://app.base44.com/article/${articleId}`;
    doc.setFontSize(8);
    doc.text(qrUrl, margin, 42);

    // Reset text color
    doc.setTextColor(0, 0, 0);

    let y = 65;

    // Section: Artikelinformation
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, y, contentWidth, 10, 'F');
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text('Artikelinformation', margin + 3, y + 7);
    
    y += 15;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    const addField = (label, value) => {
      if (value !== null && value !== undefined && value !== '') {
        doc.setFont(undefined, 'bold');
        doc.text(`${label}:`, margin + 5, y);
        doc.setFont(undefined, 'normal');
        doc.text(String(value), margin + 60, y);
        y += 8;
      }
    };

    addField('Tillverkare', article.manufacturer);
    addField('Tillverkningsdatum', article.manufacturing_date);
    addField('Kategori', article.category);
    addField('Pixel Pitch', article.pixel_pitch_mm ? `${article.pixel_pitch_mm} mm` : null);

    y += 5;

    // Section: Lagerplats & Mått
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 10, 'F');
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Lagerplats & Mått', margin + 3, y + 7);
    
    y += 15;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    addField('Hyllplats', article.shelf_address);
    addField('Lager', article.warehouse);
    
    if (article.dimensions_width_mm || article.dimensions_height_mm || article.dimensions_depth_mm) {
      const dims = `${article.dimensions_width_mm || '-'} × ${article.dimensions_height_mm || '-'} × ${article.dimensions_depth_mm || '-'} mm`;
      addField('Dimensioner (B×H×D)', dims);
    }
    
    addField('Vikt', article.weight_kg ? `${article.weight_kg} kg` : null);

    y += 5;

    // Section: Lagerstatus
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 10, 'F');
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Lagerstatus', margin + 3, y + 7);
    
    y += 15;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    addField('Lagersaldo', article.stock_qty || 0);
    addField('Min. lagernivå', article.min_stock_level);
    addField('Status', article.status);

    // Notes section if exists
    if (article.notes) {
      y += 5;
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 10, 'F');
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Anteckningar', margin + 3, y + 7);
      
      y += 15;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      
      const notesLines = doc.splitTextToSize(article.notes, contentWidth - 10);
      doc.text(notesLines, margin + 5, y);
      y += notesLines.length * 5;
    }

    // Repair info if on repair
    if (article.status === 'on_repair' && article.repair_notes) {
      y += 5;
      doc.setFillColor(254, 243, 199); // amber-100
      doc.rect(margin, y, contentWidth, 10, 'F');
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text('⚠ PÅ REPARATION', margin + 3, y + 7);
      
      y += 15;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      
      const repairLines = doc.splitTextToSize(article.repair_notes, contentWidth - 10);
      doc.text(repairLines, margin + 5, y);
      
      if (article.repair_date) {
        y += repairLines.length * 5 + 5;
        doc.text(`Skickad: ${article.repair_date}`, margin + 5, y);
      }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Genererad: ${new Date().toLocaleString('sv-SE')}`, margin, 285);
    doc.text(`Användare: ${user.email}`, pageWidth - margin, 285, { align: 'right' });

    // Generate PDF
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=artikel_${article.batch_number}_${Date.now()}.pdf`
      }
    });

  } catch (error) {
    console.error('Error generating A4 label:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});