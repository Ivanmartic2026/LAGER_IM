import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SPECIFIC_PO_IDS = [
  "69deab11f175b43448fab9ee",
  "69d6c936b5b7d8d5c2e630f4",
  "69d643d9a691acf2f0275bce",
  "69c69e222a0aba783a826b54",
  "69c68950abffe66b2e0cc7b9",
  "69c533025bd7bc574c3db91f",
  "69c529b20af84b580b1ebcc3",
  "69c51d55b58deb1bcaa552aa",
  "69c5165010e9c052ec609de3",
  "69c45ff000f89a2a02b5150a",
  "69aef48725463d294a05519e",
  "69aadcdc150e361a5766a9a1",
  "69aa8d5926db86f157591f4c",
  "69a0232c0d0d9c4920a82d60",
  "6992d9f9927ed480a3301d15",
  "69708cf50d0dd87bccd6666c",
  "69611b8ea64e408b3df32e89",
  "6961196297f13eb46cd8412b",
  "695e73b1a0fcf78f8923b786",
  "695e2a7334176dff694b4a20",
  "695baa5b3e4fa785c2204d48",
  "695b9f9e2b03f3af9d72df57"
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if migration already ran
    const existingMigration = await base44.asServiceRole.entities.SyncLog.filter({
      sync_type: "data_migration_v1"
    });

    if (existingMigration && existingMigration.length > 0) {
      return Response.json({ 
        success: false, 
        message: 'Migration already completed',
        migrationDate: existingMigration[0].created_date
      });
    }

    // Fetch all PurchaseOrders
    const allPos = await base44.asServiceRole.entities.PurchaseOrder.list();
    
    const updatedCount = { specific: 0, all: 0 };
    const errors = [];

    for (const po of allPos) {
      const updateData = {};
      let needsUpdate = false;

      // Rule 1: fortnox_project_number === "-" → null
      if (po.fortnox_project_number === "-") {
        updateData.fortnox_project_number = null;
        needsUpdate = true;
      }

      // Rule 2: payment_terms === "100_percent" → "100_procent_forskott"
      if (po.payment_terms === "100_percent") {
        updateData.payment_terms = "100_procent_forskott";
        needsUpdate = true;
      }

      // Rule 3: delivery_terms === "" → null
      if (po.delivery_terms === "") {
        updateData.delivery_terms = null;
        needsUpdate = true;
      }

      // Rule 4: mode_of_transport === "" → null
      if (po.mode_of_transport === "") {
        updateData.mode_of_transport = null;
        needsUpdate = true;
      }

      // Rule 5: warehouse_id null → set default
      if (!po.warehouse_id) {
        updateData.warehouse_id = "6957cd0c7959e14755b284e2";
        updateData.warehouse_name = "IMV Huvudlager – Jönköping – Herkulesvägen 56";
        needsUpdate = true;
      }

      // Rule 6: cost_center null → set "30_sales"
      if (!po.cost_center) {
        updateData.cost_center = "30_sales";
        needsUpdate = true;
      }

      if (needsUpdate) {
        try {
          await base44.asServiceRole.entities.PurchaseOrder.update(po.id, updateData);
          if (SPECIFIC_PO_IDS.includes(po.id)) {
            updatedCount.specific++;
          }
          updatedCount.all++;
        } catch (error) {
          errors.push(`Failed to update ${po.id}: ${error.message}`);
        }
      }
    }

    // Log the migration
    await base44.asServiceRole.entities.SyncLog.create({
      sync_type: "data_migration_v1",
      status: "success",
      records_processed: allPos.length,
      records_updated: updatedCount.all,
      details: {
        specificPoIds: updatedCount.specific,
        totalUpdated: updatedCount.all,
        errors: errors.length > 0 ? errors : null
      },
      triggered_by: user.email
    });

    return Response.json({ 
      success: true,
      message: "Migration completed successfully",
      recordsProcessed: allPos.length,
      recordsUpdated: updatedCount.all,
      specificPoIdsUpdated: updatedCount.specific,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});