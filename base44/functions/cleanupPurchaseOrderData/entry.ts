import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all PurchaseOrder records
    const allPos = await base44.asServiceRole.entities.PurchaseOrder.list();

    const fixed = [];
    const updates = [];

    // Check each PO for cleanup conditions
    for (const po of allPos) {
      let needsUpdate = false;
      const updateData = {};

      // 1. fortnox_project_number === "-" → null
      if (po.fortnox_project_number === '-') {
        updateData.fortnox_project_number = null;
        needsUpdate = true;
      }

      // 2. payment_terms === "100_percent" → "100_procent_forskott"
      if (po.payment_terms === '100_percent') {
        updateData.payment_terms = '100_procent_forskott';
        needsUpdate = true;
      }

      // 3. delivery_terms === "" (tom sträng) → null
      if (po.delivery_terms === '') {
        updateData.delivery_terms = null;
        needsUpdate = true;
      }

      // 4. mode_of_transport === "" (tom sträng) → null
      if (po.mode_of_transport === '') {
        updateData.mode_of_transport = null;
        needsUpdate = true;
      }

      // 5. warehouse_id is null or missing → set to default warehouse
      if (!po.warehouse_id) {
        updateData.warehouse_id = '6957cd0c7959e14755b284e2';
        updateData.warehouse_name = 'IMV Huvudlager – Jönköping – Herkulesvägen 56';
        needsUpdate = true;
      }

      // 6. cost_center is null or missing → set to default
      if (!po.cost_center) {
        updateData.cost_center = '30_sales';
        needsUpdate = true;
      }

      if (needsUpdate) {
        updates.push({
          id: po.id,
          po_number: po.po_number,
          updateData
        });
        fixed.push(po.po_number || po.id);
      }
    }

    // Apply all updates
    for (const update of updates) {
      await base44.asServiceRole.entities.PurchaseOrder.update(update.id, update.updateData);
    }

    return Response.json({
      success: true,
      fixed: fixed.length,
      details: fixed
    });
  } catch (error) {
    console.error('cleanupPurchaseOrderData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});