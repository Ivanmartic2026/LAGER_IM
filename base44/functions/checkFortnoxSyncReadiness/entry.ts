import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { purchase_order_id } = await req.json();
    if (!purchase_order_id) return Response.json({ error: 'purchase_order_id krävs' }, { status: 400 });

    const po = await base44.asServiceRole.entities.PurchaseOrder.get(purchase_order_id);
    if (!po) return Response.json({ error: 'PO hittades inte' }, { status: 404 });

    const blockers = [];
    const warnings = [];

    // Check supplier
    const supplier = po.supplier_id
      ? await base44.asServiceRole.entities.Supplier.get(po.supplier_id).catch(() => null)
      : null;
    if (!supplier?.fortnox_supplier_number) {
      blockers.push({ type: 'missing_supplier_number', message: 'Leverantören saknar Fortnox-leverantörsnummer', entity_id: po.supplier_id });
    }

    // Check items
    const items = await base44.asServiceRole.entities.PurchaseOrderItem.filter({ purchase_order_id });
    const itemsWithSku = items.filter(i => i.article_sku);
    if (itemsWithSku.length === 0) {
      blockers.push({ type: 'no_sku', message: 'Inga artiklar med SKU hittades', entity_id: purchase_order_id });
    }
    const itemsMissingSku = items.filter(i => !i.article_sku);
    if (itemsMissingSku.length > 0) {
      warnings.push({ type: 'missing_sku', message: `${itemsMissingSku.length} artiklar saknar SKU och hoppas över vid synk` });
    }

    // Check quarantine batches
    const receivingRecords = await base44.asServiceRole.entities.ReceivingRecord.filter({ purchase_order_id });
    const allBatchIds = receivingRecords.flatMap(r => r.batch_ids || []);
    if (allBatchIds.length > 0) {
      const quarantineBatches = await base44.asServiceRole.entities.Batch.filter({ status: 'quarantine' });
      const blocked = quarantineBatches.filter(b => allBatchIds.includes(b.id));
      if (blocked.length > 0) {
        blockers.push({
          type: 'quarantine_batch',
          message: `${blocked.length} batcher i karantän måste godkännas först`,
          entity_id: blocked[0].id
        });
      }
    }

    // Already synced
    if (po.fortnox_po_sync_status === 'synced') {
      warnings.push({ type: 'already_synced', message: 'PO är redan synkad till Fortnox' });
    }

    return Response.json({
      can_sync: blockers.length === 0,
      blockers,
      warnings,
      po_number: po.po_number,
      supplier_name: po.supplier_name
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});