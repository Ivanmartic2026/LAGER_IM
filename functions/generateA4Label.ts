import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import QRCode from 'npm:qrcode';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { articleId } = await req.json();

    if (!articleId) {
      return Response.json({ error: 'Article ID required' }, { status: 400 });
    }

    // Get article details using service role
    const articles = await base44.asServiceRole.entities.Article.filter({ id: articleId });
    
    if (!articles || articles.length === 0) {
      return Response.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = articles[0];

    // Generate QR code as base64 buffer if we have batch number
    let qrImageData = null;
    if (article.batch_number) {
      try {
        // Generate QR code as PNG buffer
        qrImageData = await QRCode.toDataURL(article.batch_number, {
          width: 512,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
      }
    }

    // Create PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
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
    doc.setFont('helvetica', 'bold');
    // Handle Swedish characters
    const safeName = (article.name || 'Artikel').replace(/[^\x00-\x7F]/g, (char) => {
      const map = {'å':'a','ä':'a','ö':'o','Å':'A','Ä':'A','Ö':'O'};
      return map[char] || char;
    });
    doc.text(safeName, margin, 25);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    const safeBatch = `Batch: ${article.batch_number || ''}`;
    doc.text(safeBatch, margin, 35);

    // Add QR code if it was generated
    if (qrImageData) {
      const qrSize = 45;
      try {
        doc.addImage(qrImageData, 'PNG', pageWidth - margin - qrSize, 5, qrSize, qrSize);
      } catch (imgError) {
        console.error('Error adding QR image:', imgError);
      }
    }

    // Reset text color
    doc.setTextColor(0, 0, 0);

    let y = 65;

    // Section: Artikelinformation
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, y, contentWidth, 10, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text('Artikelinformation', margin + 3, y + 7);
    
    y += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const safeText = (text) => {
      return String(text).replace(/[^\x00-\x7F]/g, (char) => {
        const map = {'å':'a','ä':'a','ö':'o','Å':'A','Ä':'A','Ö':'O'};
        return map[char] || char;
      });
    };

    const addField = (label, value) => {
      if (value !== null && value !== undefined && value !== '') {
        doc.setFont('helvetica', 'bold');
        doc.text(safeText(`${label}:`), margin + 5, y);
        doc.setFont('helvetica', 'normal');
        doc.text(safeText(String(value)), margin + 60, y);
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
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Lagerplats & Matt', margin + 3, y + 7);
    
    y += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    addField('Hyllplats', article.shelf_address);
    addField('Lager', article.warehouse);
    
    if (article.dimensions_width_mm || article.dimensions_height_mm || article.dimensions_depth_mm) {
      const dims = `${article.dimensions_width_mm || '-'} x ${article.dimensions_height_mm || '-'} x ${article.dimensions_depth_mm || '-'} mm`;
      addField('Dimensioner (BxHxD)', dims);
    }
    
    addField('Vikt', article.weight_g ? `${article.weight_g} g` : null);

    y += 5;

    // Section: Lagerstatus
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 10, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Lagerstatus', margin + 3, y + 7);
    
    y += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
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
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Anteckningar', margin + 3, y + 7);

      y += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const notesLines = doc.splitTextToSize(safeText(article.notes), contentWidth - 10);
      doc.text(notesLines, margin + 5, y);
      y += notesLines.length * 5;
    }

    // Repair info if on repair
    if (article.status === 'on_repair' && article.repair_notes) {
      y += 5;
      doc.setFillColor(254, 243, 199); // amber-100
      doc.rect(margin, y, contentWidth, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text('! PA REPARATION', margin + 3, y + 7);

      y += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const repairLines = doc.splitTextToSize(safeText(article.repair_notes), contentWidth - 10);
      doc.text(repairLines, margin + 5, y);

      if (article.repair_date) {
        y += repairLines.length * 5 + 5;
        doc.text(safeText(`Skickad: ${article.repair_date}`), margin + 5, y);
      }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const footerLeft = `Genererad: ${new Date().toLocaleString('sv-SE')}`;
    doc.text(footerLeft, margin, 285);

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