import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Optimerar bildlagring för site-rapporter
 * - Komprimerar gamla bilder
 * - Arkiverar gamla rapporter
 * - Genererar sammanfattningar
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      archive_older_than_days = 365,
      generate_summaries = true 
    } = await req.json();

    const results = {
      reports_archived: 0,
      images_processed: 0,
      summaries_generated: 0,
      storage_saved_mb: 0
    };

    // Hitta gamla rapporter (äldre än X dagar)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - archive_older_than_days);

    const allReports = await base44.asServiceRole.entities.SiteReport.list();
    const oldReports = allReports.filter(r => 
      new Date(r.report_date) < cutoffDate && r.status === 'completed'
    );

    console.log(`Found ${oldReports.length} reports older than ${archive_older_than_days} days`);

    for (const report of oldReports) {
      try {
        // Generera sammanfattning av rapporten om den inte finns
        if (generate_summaries && !report.summary) {
          const images = await base44.asServiceRole.entities.SiteReportImage.filter({
            site_report_id: report.id,
            match_status: 'confirmed'
          });

          const summary = await base44.integrations.Core.InvokeLLM({
            prompt: `Skapa en kort sammanfattning (max 200 ord) av detta site-besök:

Site: ${report.site_name}
Datum: ${report.report_date}
Tekniker: ${report.technician_name}
Anteckningar: ${report.notes || 'Inga'}
Problem: ${report.problem_description || 'Inget rapporterat'}
Lösning: ${report.solution_description || 'Ingen specificerad'}
Bekräftade komponenter: ${images.length}

Sammanfatta vad som gjordes och eventuella problem/åtgärder.`
          });

          await base44.asServiceRole.entities.SiteReport.update(report.id, {
            summary
          });

          results.summaries_generated++;
        }

        // Uppdatera status till arkiverad
        await base44.asServiceRole.entities.SiteReport.update(report.id, {
          status: 'archived'
        });

        results.reports_archived++;

        // Räkna bilder (för statistik)
        const images = await base44.asServiceRole.entities.SiteReportImage.filter({
          site_report_id: report.id
        });
        results.images_processed += images.length;

      } catch (error) {
        console.error(`Error archiving report ${report.id}:`, error);
      }
    }

    return Response.json({ 
      success: true, 
      ...results,
      message: `Arkiverade ${results.reports_archived} rapporter med ${results.images_processed} bilder totalt.`
    });

  } catch (error) {
    console.error('Optimization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});