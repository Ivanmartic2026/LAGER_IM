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
    
    // Fetch linked order if exists
    let linkedOrder = null;
    let orderItems = [];
    if (report.linked_order_id) {
      try {
        linkedOrder = await base44.asServiceRole.entities.Order.get(report.linked_order_id);
        orderItems = await base44.asServiceRole.entities.OrderItem.filter({
          order_id: report.linked_order_id
        });
      } catch (e) {
        console.log('Could not fetch linked order:', e);
      }
    }

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
    y += 6;
    
    if (linkedOrder) {
      doc.text(`Kopplad till order: ${linkedOrder.order_number || linkedOrder.customer_name}`, 20, y);
      y += 6;
      if (linkedOrder.customer_name && linkedOrder.order_number) {
        doc.text(`Kund: ${linkedOrder.customer_name}`, 20, y);
        y += 6;
      }
    }
    
    y += 4;

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

    // Order items if linked
    if (linkedOrder && orderItems.length > 0) {
      y += 5;
      doc.setFontSize(14);
      doc.text('Artiklar från order', 20, y);
      y += 8;
      
      doc.setFontSize(9);
      orderItems.forEach(item => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFont(undefined, 'bold');
        doc.text(item.article_name || 'Okänd artikel', 25, y);
        y += 5;
        
        doc.setFont(undefined, 'normal');
        if (item.article_batch_number) {
          doc.text(`Batch: ${item.article_batch_number}`, 30, y);
          y += 5;
        }
        
        doc.text(`Antal: ${item.quantity_ordered} st`, 30, y);
        y += 5;
        
        if (item.shelf_address) {
          doc.text(`Plats: ${item.shelf_address}`, 30, y);
          y += 5;
        }
        
        y += 2;
      });
      
      y += 5;
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

    // Confirmed components with images
    if (confirmed.length > 0) {
      doc.setFontSize(14);
      doc.text('Dokumenterade komponenter', 20, y);
      y += 8;

      for (const image of confirmed) {
        if (y > 200) {
          doc.addPage();
          y = 20;
        }

        const article = allArticles.find(a => a.id === image.matched_article_id);
        if (article) {
          doc.setFontSize(9);
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
          
          y += 5;

          // Add image from site
          try {
            const imageResponse = await fetch(image.image_url);
            if (!imageResponse.ok) {
              throw new Error(`Failed to fetch image: ${imageResponse.status}`);
            }
            
            const imageArrayBuffer = await imageResponse.arrayBuffer();
            const uint8Array = new Uint8Array(imageArrayBuffer);
            
            // Convert to base64
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            const imageBase64 = btoa(binary);
            
            // Determine image format from URL or content type
            const contentType = imageResponse.headers.get('content-type') || '';
            let imageFormat = 'JPEG';
            if (contentType.includes('png') || image.image_url.toLowerCase().includes('.png')) {
              imageFormat = 'PNG';
            }
            
            // Add image to PDF
            const imgWidth = 80;
            const imgHeight = 60;
            doc.addImage(
              `data:${contentType || 'image/jpeg'};base64,${imageBase64}`, 
              imageFormat, 
              25, 
              y, 
              imgWidth, 
              imgHeight
            );
            y += imgHeight + 10;
          } catch (imgError) {
            console.error('Error adding image:', imgError);
            doc.setFontSize(8);
            doc.text(`(Bild kunde inte laddas: ${imgError.message})`, 25, y);
            y += 5;
          }
        }
      }
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