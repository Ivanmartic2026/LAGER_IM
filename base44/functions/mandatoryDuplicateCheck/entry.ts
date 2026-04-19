import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { extracted_fields, context } = await req.json();
    if (!extracted_fields) return Response.json({ error: 'extracted_fields required' }, { status: 400 });

    const batchNumber = extracted_fields.batch_number;
    const sku = extracted_fields.article_sku;
    const duplicates = [];

    // Check Batch entity
    if (batchNumber) {
      const existingBatches = await base44.asServiceRole.entities.Batch.filter({ batch_number: batchNumber });
      existingBatches.forEach(b => duplicates.push({
        source: 'Batch',
        id: b.id,
        field: 'batch_number',
        value: b.batch_number,
        article_name: b.article_name
      }));

      // Check Article.batch_number
      const articlesByBatch = await base44.asServiceRole.entities.Article.filter({ batch_number: batchNumber });
      articlesByBatch.forEach(a => duplicates.push({
        source: 'Article',
        id: a.id,
        field: 'batch_number',
        value: a.batch_number,
        article_name: a.name
      }));

      // Check OrderItem
      const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ batch_number: batchNumber });
      orderItems.forEach(o => duplicates.push({ source: 'OrderItem', id: o.id, field: 'batch_number', value: batchNumber }));

      // Check InternalWithdrawal
      const withdrawals = await base44.asServiceRole.entities.InternalWithdrawal.filter({ batch_number: batchNumber });
      withdrawals.forEach(w => duplicates.push({ source: 'InternalWithdrawal', id: w.id, field: 'batch_number', value: batchNumber }));

      // Check RepairLog
      const repairs = await base44.asServiceRole.entities.RepairLog.filter({ batch_number: batchNumber });
      repairs.forEach(r => duplicates.push({ source: 'RepairLog', id: r.id, field: 'batch_number', value: batchNumber }));
    }

    // Check Article by SKU
    if (sku) {
      const articlesBySku = await base44.asServiceRole.entities.Article.filter({ sku });
      articlesBySku.forEach(a => duplicates.push({
        source: 'Article',
        id: a.id,
        field: 'sku',
        value: a.sku,
        article_name: a.name
      }));
    }

    return Response.json({
      hasDuplicates: duplicates.length > 0,
      duplicateCount: duplicates.length,
      details: duplicates
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});