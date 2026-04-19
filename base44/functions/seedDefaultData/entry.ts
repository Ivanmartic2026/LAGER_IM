import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = { task_templates: 0, test_batches: 0 };

    // Seed TaskTemplates (only if none exist)
    const existing = await base44.asServiceRole.entities.TaskTemplate.list();
    if (existing.length === 0) {
      const templates = [
        {
          name: "Kontakta konstruktör om ny order",
          phase: "säljare",
          trigger_event: "sales_completed",
          default_role: "konstruktor",
          auto_assign_rule: "assigned_to_field",
          assigned_to_field_name: "assigned_to_konstruktion",
          title_template: "Planera konstruktion för {customer_name}",
          description_template: "Ny order {order_number} är säljklar. Kontakta säljare och påbörja konstruktionsplanering.",
          due_days_offset: 1,
          priority: "high",
          is_active: true
        },
        {
          name: "Skapa WorkOrder från order",
          phase: "konstruktion",
          trigger_event: "sales_completed",
          default_role: "konstruktor",
          auto_assign_rule: "round_robin",
          title_template: "Skapa WorkOrder för {customer_name}",
          description_template: "Order {order_number} kräver en WorkOrder. Skapa och tilldela resurser.",
          due_days_offset: 2,
          priority: "normal",
          is_active: true
        },
        {
          name: "Beställ material från leverantör",
          phase: "konstruktion",
          trigger_event: "workorder_created",
          default_role: "inkopare",
          auto_assign_rule: "round_robin",
          title_template: "Beställ material för {customer_name}",
          description_template: "WorkOrder är skapad. Kontrollera BOM och lägg order vid behov.",
          due_days_offset: 3,
          priority: "normal",
          is_active: true
        },
        {
          name: "Bekräfta leverantörsorder",
          phase: "konstruktion",
          trigger_event: "po_sent",
          default_role: "inkopare",
          auto_assign_rule: "assigned_to_field",
          assigned_to_field_name: "sent_for_payment_by",
          title_template: "Följ upp bekräftelse från {supplier_name}",
          description_template: "PO skickades. Vänta på bekräftelse inom 3 dagar.",
          due_days_offset: 3,
          priority: "normal",
          is_active: true
        },
        {
          name: "Verifiera batch",
          phase: "lager",
          trigger_event: "batch_pending_verification",
          default_role: "lager",
          auto_assign_rule: "round_robin",
          title_template: "Verifiera batch {batch_number}",
          description_template: "Batch väntar på manuell verifiering. Kontrollera etikett och bekräfta.",
          due_days_offset: 1,
          priority: "high",
          is_active: true
        },
        {
          name: "Godkänn high-risk batch",
          phase: "lager",
          trigger_event: "batch_quarantine",
          default_role: "ivan",
          auto_assign_rule: "round_robin",
          title_template: "Granska karantän-batch {batch_number}",
          description_template: "Batch har placerats i karantän. Kräver godkännande av ansvarig.",
          due_days_offset: 1,
          priority: "urgent",
          is_active: true
        },
        {
          name: "Starta produktion",
          phase: "produktion",
          trigger_event: "production_started",
          default_role: "produktion",
          auto_assign_rule: "assigned_to_field",
          assigned_to_field_name: "assigned_to_produktion",
          title_template: "Starta produktionsjobb",
          description_template: "Produktion har startats. Kontrollera material och påbörja montering.",
          due_days_offset: 1,
          priority: "normal",
          is_active: true
        },
        {
          name: "Följ upp site-rapport",
          phase: "tekniker",
          trigger_event: "site_report_created",
          default_role: "tekniker",
          auto_assign_rule: "assigned_to_field",
          assigned_to_field_name: "assigned_to",
          title_template: "Slutför site-rapport",
          description_template: "En ny site-rapport har skapats och behöver kompletteras.",
          due_days_offset: 2,
          priority: "normal",
          is_active: true
        }
      ];

      for (const t of templates) {
        await base44.asServiceRole.entities.TaskTemplate.create(t);
        results.task_templates++;
      }
    }

    // Seed test Batches
    const existingBatches = await base44.asServiceRole.entities.Batch.list();
    const hasPending = existingBatches.some(b => b.batch_number === 'TEST-PENDING-001');
    const hasQuarantine = existingBatches.some(b => b.batch_number === 'TEST-QUARANTINE-001');

    if (!hasPending) {
      await base44.asServiceRole.entities.Batch.create({
        batch_number: 'TEST-PENDING-001',
        raw_batch_number: 'TEST-PENDING-001',
        article_name: 'LED Cabinet P2.6',
        supplier_name: 'Testleverantör AB',
        status: 'pending_verification',
        risk_score: 45,
        risk_flags: ['low_ai_confidence'],
        notes: 'Testpost — pending_verification för UI-testning'
      });
      results.test_batches++;
    }

    if (!hasQuarantine) {
      await base44.asServiceRole.entities.Batch.create({
        batch_number: 'TEST-QUARANTINE-001',
        raw_batch_number: 'TEST-QUARANTINE-001',
        article_name: 'Power Supply 200W',
        supplier_name: 'Testleverantör AB',
        status: 'quarantine',
        risk_score: 85,
        risk_flags: ['low_ai_confidence', 'supplier_mismatch', 'batch_pattern_deviation'],
        notes: 'Testpost — quarantine för UI-testning'
      });
      results.test_batches++;
    }

    return Response.json({ success: true, ...results, message: 'Seed complete' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});