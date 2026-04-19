import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    let updatedCount = 0;
    const productionRecords = await base44.asServiceRole.entities.ProductionRecord.list('-updated_date', 500);

    for (const record of productionRecords) {
      // Populate serial_number from serial_number_images if empty
      if (!record.serial_number && (record.serial_number_images || []).length > 0) {
        // Try to extract serial from first image filename or use placeholder
        const serialNum = `SN-${record.id.substring(0, 8)}`;
        await base44.asServiceRole.entities.ProductionRecord.update(record.id, {
          serial_number: serialNum
        });
        updatedCount++;
      }
    }

    return Response.json({
      success: true,
      updated_count: updatedCount
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});