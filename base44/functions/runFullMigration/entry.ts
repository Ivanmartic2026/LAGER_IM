import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const steps = [];
    const startTime = Date.now();

    // 1. Migrate Article batch_numbers
    const step1 = await base44.asServiceRole.functions.invoke('migrateArticleBatchNumbersToBatchEntity', {});
    steps.push({ name: 'migrateArticleBatchNumbersToBatchEntity', result: step1.data });

    // 2. Merge batch duplicates
    const step2 = await base44.asServiceRole.functions.invoke('migrateBatchDuplicates', {});
    steps.push({ name: 'migrateBatchDuplicates', result: step2.data });

    // 3. Migrate RepairLog batches
    const step3 = await base44.asServiceRole.functions.invoke('migrateRepairLogsToBatch', {});
    steps.push({ name: 'migrateRepairLogsToBatch', result: step3.data });

    // 4. Migrate ReceivingRecord images
    const step4 = await base44.asServiceRole.functions.invoke('migrateReceivingRecordImagesToLabelScan', {});
    steps.push({ name: 'migrateReceivingRecordImagesToLabelScan', result: step4.data });

    // 5. Migrate SiteReportImage batch links
    const step5 = await base44.asServiceRole.functions.invoke('migrateSiteReportImagesToBatchLinks', {});
    steps.push({ name: 'migrateSiteReportImagesToBatchLinks', result: step5.data });

    // 6. Migrate ProductionRecord serial_numbers
    const step6 = await base44.asServiceRole.functions.invoke('migrateProductionRecordBatches', {});
    steps.push({ name: 'migrateProductionRecordBatches', result: step6.data });

    // 7. Delete test batches
    const testBatches = await base44.asServiceRole.entities.Batch.filter({}, '-updated_date', 100);
    let deletedTestCount = 0;
    for (const batch of testBatches) {
      if ((batch.batch_number || '').startsWith('TEST-')) {
        await base44.asServiceRole.entities.Batch.delete(batch.id);
        deletedTestCount++;
      }
    }
    steps.push({ name: 'deleteTestBatches', result: { deleted_count: deletedTestCount } });

    // 8. Create MigrationRun log
    const duration = Date.now() - startTime;
    const migrationRun = await base44.asServiceRole.entities.MigrationRun.create({
      run_date: new Date().toISOString(),
      ran_by: user.email,
      steps_json: steps,
      success_count: steps.length,
      error_count: 0,
      status: 'completed',
      notes: `Full migration completed in ${duration}ms`
    });

    return Response.json({
      success: true,
      migration_run_id: migrationRun.id,
      steps: steps,
      duration_ms: duration,
      total_steps: steps.length
    });

  } catch (error) {
    console.error('Full migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});