/**
 * LAGER-SPEC-2026-001
 * Recalculates materials_needed stock fields for one or more WorkOrders.
 *
 * Called either:
 *   - Directly from frontend: { work_order_id: "..." }
 *   - From Article-change automation: { article_id: "..." }  → finds affected WOs
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));

    // Support direct calls { work_order_id } or { article_id }
    // Also support entity automation payload: { event: { entity_name, entity_id }, data: {...} }
    let work_order_id = body.work_order_id;
    let article_id = body.article_id;

    if (!work_order_id && !article_id && body.event) {
      const entityName = body.event?.entity_name;
      const entityId = body.event?.entity_id;
      if (entityName === 'WorkOrder') {
        work_order_id = entityId;
      } else if (entityName === 'Article') {
        article_id = entityId;
      }
    }

    // --- Resolve which WorkOrders to process ---
    let workOrders = [];

    if (work_order_id) {
      try {
        const all = await db.entities.WorkOrder.list();
        workOrders = all.filter(w => w.id === work_order_id);
      } catch (_) {
        workOrders = [];
      }
    } else if (article_id) {
      // Find all active WOs that reference this article in materials_needed
      const allActive = await db.entities.WorkOrder.list();
      workOrders = allActive.filter(wo =>
        (wo.status === 'väntande' || wo.status === 'pågår') &&
        Array.isArray(wo.materials_needed) &&
        wo.materials_needed.some(m => m.article_id === article_id)
      );
    } else {
      return Response.json({ error: 'Provide work_order_id or article_id' }, { status: 400 });
    }

    if (!workOrders.length) {
      return Response.json({ updated: 0 });
    }

    // --- Load all relevant Articles in one batch ---
    const articleIds = [...new Set(
      workOrders.flatMap(wo =>
        (wo.materials_needed || []).map(m => m.article_id).filter(Boolean)
      )
    )];

    if (articleIds.length) {
      const articles = await db.entities.Article.list();
      articles
        .filter(a => articleIds.includes(a.id))
        .forEach(a => { articleMap[a.id] = a; });
    }

    // --- Load inkopare users once (for needs_procurement notifications) ---
    let inkopareUsers = [];
    try {
      const allUsers = await db.entities.User.list();
      inkopareUsers = (allUsers || []).filter(u => u.role === 'inkopare');
    } catch (_) {}

    let updatedCount = 0;

    for (const wo of workOrders) {
      if (!Array.isArray(wo.materials_needed) || wo.materials_needed.length === 0) continue;

      const prevAllReady = !!wo.all_materials_ready;
      const prevNeedsProcurement = !!wo.needs_procurement;

      let changed = false;
      const newMaterials = wo.materials_needed.map(row => {
        const art = row.article_id ? articleMap[row.article_id] : null;
        if (!art) return row;

        const inStock = Math.max(0, (art.stock_qty || 0) - (art.reserved_stock_qty || 0));
        const missing = Math.max(0, (row.quantity || 0) - inStock);
        const needsPurchase = missing > 0;
        const shelfAddress = Array.isArray(art.shelf_address) && art.shelf_address.length > 0
          ? art.shelf_address[0]
          : (row.shelf_address || '');
        // Only fill article_name if currently empty
        const articleName = (!row.article_name || row.article_name === '')
          ? (art.name || '')
          : row.article_name;

        if (
          row.in_stock !== inStock ||
          row.missing !== missing ||
          row.needs_purchase !== needsPurchase ||
          row.shelf_address !== shelfAddress ||
          ((!row.article_name || row.article_name === '') && articleName)
        ) {
          changed = true;
        }

        return {
          ...row,
          in_stock: inStock,
          missing,
          needs_purchase: needsPurchase,
          shelf_address: shelfAddress,
          article_name: articleName,
          // quantity, batch_number, serial_number are NOT touched
        };
      });

      const allReady = newMaterials.length > 0 && newMaterials.every(m => (m.missing || 0) === 0);
      const needsProcurement = newMaterials.some(m => !!m.needs_purchase);

      if (
        !changed &&
        allReady === prevAllReady &&
        needsProcurement === prevNeedsProcurement
      ) {
        continue; // Nothing changed, skip
      }

      await db.entities.WorkOrder.update(wo.id, {
        materials_needed: newMaterials,
        all_materials_ready: allReady,
        needs_procurement: needsProcurement,
      });

      updatedCount++;

      // --- Log activity ---
      try {
        await db.entities.WorkOrderActivity.create({
          work_order_id: wo.id,
          type: 'system',
          message: 'Materialstatus omräknad mot lagersaldo',
          actor_email: 'system',
          actor_name: 'System',
          metadata: { allReady, needsProcurement },
        });
      } catch (_) {}

      // --- Notification: all_materials_ready flipped false → true ---
      if (!prevAllReady && allReady) {
        const recipientEmail = wo.assigned_to_lager || wo.assigned_to_konstruktion;
        if (recipientEmail) {
          try {
            await db.entities.Notification.create({
              user_email: recipientEmail,
              title: 'Material klart för plockning',
              message: `Alla material är nu tillgängliga för arbetsorder ${wo.order_number || wo.name || wo.id}.`,
              type: 'stock_alert',
              priority: 'high',
              is_read: false,
              link_to: wo.id,
              link_page: 'WorkOrders',
            });
          } catch (_) {}
        }
      }

      // --- Notification: needs_procurement flipped false → true ---
      if (!prevNeedsProcurement && needsProcurement) {
        for (const buyer of inkopareUsers) {
          try {
            await db.entities.Notification.create({
              user_email: buyer.email,
              title: 'Material saknas — inköp behövs',
              message: `Arbetsorder ${wo.order_number || wo.name || wo.id} saknar material och kräver inköp.`,
              type: 'stock_alert',
              priority: 'high',
              is_read: false,
              link_to: wo.id,
              link_page: 'WorkOrders',
            });
          } catch (_) {}
        }
      }
    }

    return Response.json({ updated: updatedCount });
  } catch (error) {
    console.error('recalcMaterialStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});