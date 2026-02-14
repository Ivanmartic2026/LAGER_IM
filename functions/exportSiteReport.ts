import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_id } = await req.json();

    if (!report_id) {
      return Response.json({ error: 'report_id required' }, { status: 400 });
    }

    // Fetch report and images
    const report = await base44.asServiceRole.entities.SiteReport.get(report_id);
    const images = await base44.asServiceRole.entities.SiteReportImage.filter({ 
      site_report_id: report_id 
    });
    const allArticles = await base44.asServiceRole.entities.Article.list();

    // Create PDF
    const doc = new jsPDF();
    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.text('Site-Rapport', 20, y);
    y += 15;

    // Report info
    doc.setFontSize(12);
    doc.text(`Plats: ${report.site_name}`, 20, y);
    y += 8;
    
    if (report.site_address) {
      doc.setFontSize(10);
      doc.text(`Adress: ${report.site_address}`, 20, y);
      y += 6;
    }
    
    doc.text(`Tekniker: ${report.technician_name || report.technician_email}`, 20, y);
    y += 6;
    doc.text(`Datum: ${new Date(report.report_date).toLocaleDateString('sv-SE')}`, 20, y);
    y += 10;

    if (report.notes) {
      doc.setFontSize(10);
      doc.text('Anteckningar:', 20, y);
      y += 6;
      const notesLines = doc.splitTextToSize(report.notes, 170);
      doc.text(notesLines, 20, y);
      y += (notesLines.length * 6) + 4;
    }

    // GPS coordinates
    if (report.gps_latitude && report.gps_longitude) {
      y += 5;
      doc.text(`GPS: ${report.gps_latitude.toFixed(6)}, ${report.gps_longitude.toFixed(6)}`, 20, y);
      y += 10;
    }

    // Statistics
    y += 5;
    doc.setFontSize(14);
    doc.text('Sammanfattning', 20, y);
    y += 8;
    
    doc.setFontSize(10);
    const confirmed = images.filter(i => i.match_status === 'confirmed');
    const needsReplacement = confirmed.filter(i => i.component_status === 'needs_replacement');
    const needsRepair = confirmed.filter(i => i.component_status === 'needs_repair');
    
    doc.text(`Totalt bilder: ${images.length}`, 20, y);
    y += 6;
    doc.text(`Bekräftade matchningar: ${confirmed.length}`, 20, y);
    y += 6;
    doc.text(`Behöver bytas: ${needsReplacement.length}`, 20, y);
    y += 6;
    doc.text(`Behöver repareras: ${needsRepair.length}`, 20, y);
    y += 12;

    // Confirmed components
    if (confirmed.length > 0) {
      doc.setFontSize(14);
      doc.text('Dokumenterade komponenter', 20, y);
      y += 8;

      doc.setFontSize(9);
      confirmed.forEach(image => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        const article = allArticles.find(a => a.id === image.matched_article_id);
        if (article) {
          doc.setFont(undefined, 'bold');
          doc.text(article.name, 20, y);
          y += 5;
          
          doc.setFont(undefined, 'normal');
          
          if (article.batch_number) {
            doc.text(`Batch: ${article.batch_number}`, 25, y);
            y += 5;
          }
          
          const statusText = image.component_status === 'ok' ? 'OK - Fungerar' :
                           image.component_status === 'needs_replacement' ? 'Behöver bytas ut' :
                           image.component_status === 'needs_repair' ? 'Behöver repareras' : 'Dokumenterad';
          doc.text(`Status: ${statusText}`, 25, y);
          y += 5;

          // Form data details
          if (image.form_data) {
            Object.keys(image.form_data).forEach(key => {
              if (key !== 'component_status' && image.form_data[key]) {
                doc.text(`${key}: ${image.form_data[key]}`, 25, y);
                y += 5;
              }
            });
          }
          
          y += 3;
        }
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=site-rapport-${report.site_name}-${new Date(report.report_date).toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});