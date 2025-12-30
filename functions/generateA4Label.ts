import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import QRCode from 'npm:qrcode@1.5.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { articleId } = await req.json();

    if (!articleId) {
      return Response.json({ error: 'Article ID required' }, { status: 400 });
    }

    // Get article details
    const articles = await base44.asServiceRole.entities.Article.filter({ id: articleId });
    
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
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // Helper for safe text
    const safeText = (text) => {
      return String(text || '').replace(/[^\x00-\x7F]/g, (char) => {
        const map = {'å':'a','ä':'a','ö':'o','Å':'A','Ä':'A','Ö':'O'};
        return map[char] || char;
      });
    };

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText(article.name || 'Artikel'), margin, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Batch: ${article.batch_number || 'N/A'}`, margin, 30);

    doc.setTextColor(0, 0, 0);

    let y = 50;

    // Info sections
    const addSection = (title, fields) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(title, margin + 2, y + 5.5);
      
      y += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      for (const [label, value] of fields) {
        if (value !== null && value !== undefined && value !== '') {
          doc.setFont('helvetica', 'bold');
          doc.text(safeText(label + ':'), margin + 2, y);
          doc.setFont('helvetica', 'normal');
          doc.text(safeText(String(value)), margin + 50, y);
          y += 5;
        }
      }
      y += 2;
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
      ['Dimensioner (BxHxD)', dims],
      ['Vikt', article.weight_g ? `${article.weight_g} g` : null]
    ]);

    // Stock status
    addSection('Lagerstatus', [
      ['Lagersaldo', article.stock_qty || 0],
      ['Min. lagerniva', article.min_stock_level],
      ['Status', article.status]
    ]);

    // Notes if exists
    if (article.notes) {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Anteckningar', margin + 2, y + 5.5);

      y += 10;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const notesLines = doc.splitTextToSize(safeText(article.notes), contentWidth - 4);
      const maxLines = Math.min(notesLines.length, 6); // Limit to 6 lines
      doc.text(notesLines.slice(0, maxLines), margin + 2, y);
      y += maxLines * 4;
      if (notesLines.length > 6) {
        doc.text('...', margin + 2, y);
        y += 4;
      }
    }

    // Repair info
    if (article.status === 'on_repair' && article.repair_notes) {
      y += 2;
      doc.setFillColor(254, 243, 199);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text('! PA REPARATION', margin + 2, y + 5.5);

      y += 10;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const repairLines = doc.splitTextToSize(safeText(article.repair_notes), contentWidth - 4);
      const maxRepairLines = Math.min(repairLines.length, 4);
      doc.text(repairLines.slice(0, maxRepairLines), margin + 2, y);
      y += maxRepairLines * 4;

      if (article.repair_date) {
        y += 2;
        doc.text(safeText(`Skickad: ${article.repair_date}`), margin + 2, y);
        y += 5;
      }
    }

    // QR Code
    if (article.batch_number) {
      try {
        const qrDataUrl = await QRCode.toDataURL(article.batch_number, {
          errorCorrectionLevel: 'M',
          width: 300,
          margin: 1
        });

        y += 5;
        const qrSize = 60;
        const qrX = (pageWidth - qrSize) / 2;

        doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(article.batch_number, pageWidth / 2, y + qrSize + 7, { align: 'center' });
        
      } catch (qrError) {
        console.error('QR error:', qrError);
      }
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`Genererad: ${new Date().toLocaleString('sv-SE')}`, margin, 290);

    // Output PDF
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=artikel_${article.batch_number || 'label'}_${Date.now()}.pdf`
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});