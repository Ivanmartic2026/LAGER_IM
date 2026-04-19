import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createHash } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    let scansCreated = 0;
    const receivingRecords = await base44.asServiceRole.entities.ReceivingRecord.list('-updated_date', 500);

    for (const record of receivingRecords) {
      const imageUrls = record.image_urls || [];
      const existingScanIds = record.ai_scan_ids || [];

      if (imageUrls.length === 0) continue;

      for (const imageUrl of imageUrls) {
        // Skip if already scanned
        if (existingScanIds.length > 0) continue;

        // Create LabelScan
        const imgHash = `legacy_${imageUrl}`.substring(0, 64);
        const scan = await base44.asServiceRole.entities.LabelScan.create({
          image_url: imageUrl,
          image_hash: imgHash,
          status: 'migrated_legacy',
          context: 'purchase_receiving',
          context_reference_id: record.id,
          ai_raw_response: { legacy: true, not_processed: true }
        });

        existingScanIds.push(scan.id);
        scansCreated++;
      }

      // Update receiving record
      if (scansCreated > 0) {
        await base44.asServiceRole.entities.ReceivingRecord.update(record.id, {
          ai_scan_ids: existingScanIds
        });
      }
    }

    return Response.json({
      success: true,
      scans_created: scansCreated
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});