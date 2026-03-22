import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all articles on repair
    const articles = await base44.entities.Article.filter({ status: 'on_repair' }, '-updated_date');

    if (articles.length === 0) {
      return Response.json({ error: 'Inga artiklar på reparation' }, { status: 400 });
    }

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Reparationsrapport', 20, yPosition);
    yPosition += 10;

    // Date and summary
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Genererad: ${new Date().toLocaleDateString('sv-SE')}`, 20, yPosition);
    doc.text(`Totalt artiklar: ${articles.length}`, 20, yPosition + 6);
    
    // Calculate total modules
    const totalModules = articles.reduce((sum, article) => {
      const repairQty = article.repair_notes?.match(/^(\d+)\s*st/)?.[1];
      return sum + (repairQty ? parseInt(repairQty) : 0);
    }, 0);
    
    doc.text(`Totalt antal moduler: ${totalModules}`, 20, yPosition + 12);
    yPosition += 24;

    // Table headers
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.setFont(undefined, 'bold');
    doc.text('Artikel', 20, yPosition);
    doc.text('Batch', 80, yPosition);
    doc.text('Tillverkare', 110, yPosition);
    doc.text('Antal', 160, yPosition);
    doc.text('Rapporterad', 185, yPosition);

    // Line under headers
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
    yPosition += 10;

    // Table rows
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);

    articles.forEach((article, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;

        // Repeat headers on new page
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text('Artikel', 20, yPosition);
        doc.text('Batch', 80, yPosition);
        doc.text('Tillverkare', 110, yPosition);
        doc.text('Antal', 160, yPosition);
        doc.text('Rapporterad', 185, yPosition);
        doc.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);
        yPosition += 8;
        doc.setFont(undefined, 'normal');
      }

      const repairQty = article.repair_notes?.match(/^(\d+)\s*st/)?.[1] || '—';
      const repairDate = article.repair_date 
        ? new Date(article.repair_date).toLocaleDateString('sv-SE')
        : '—';

      doc.text(article.name || '—', 20, yPosition);
      doc.text(article.batch_number || '—', 80, yPosition);
      doc.text(article.manufacturer || '—', 110, yPosition);
      doc.text(String(repairQty), 160, yPosition);
      doc.text(repairDate, 185, yPosition);

      yPosition += 7;
    });

    // Footer
    yPosition = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Sida 1 av ${doc.internal.pages.length}`, pageWidth - 40, yPosition);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=reparationsrapport.pdf'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});