/**
 * LAGER-SPEC-2026-002 — Article Status Watch
 * Monitors articles in resting statuses and escalates based on deadlines.
 * Also fixes PO received → article still in_transit inconsistency.
 * Runs daily via scheduled automation.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const IVAN_EMAIL = 'ivan@imvision.se';

function daysDiff(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function isSnoozed(article) {
  if (!article.escalation_snoozed_until) return false;
  return new Date(article.escalation_snoozed_until) > new Date();
}

// Queue notifications grouped by recipient to avoid spam
function queueNotif(map, email, notif) {
  if (!email) return;
  if (!map[email]) map[email] = [];
  map[email].push(notif);
}

async function sendGroupedNotifs(db, notifMap, isInitialRun) {
  let sent = 0;
  for (const [email, notifs] of Object.entries(notifMap)) {
    if (!notifs.length) continue;
    if (isInitialRun && notifs.length > 1) {
      // Group into one summary notification
      const highestPriority = notifs.find(n => n.priority === 'critical')?.priority
        || notifs.find(n => n.priority === 'high')?.priority
        || 'normal';
      const summary = notifs.map(n => `• ${n.article_name}: ${n.message}`).join('\n');
      await db.entities.Notification.create({
        user_email: email,
        title: `Artikelstatus — ${notifs.length} poster kräver åtgärd`,
        message: summary,
        type: 'stock_alert',
        priority: highestPriority,
        is_read: false,
        link_page: 'Eskaleringar',
      });
      sent++;
    } else {
      for (const n of notifs) {
        await db.entities.Notification.create({
          user_email: email,
          title: n.title,
          message: n.message,
          type: n.type || 'stock_alert',
          priority: n.priority || 'normal',
          is_read: false,
          link_to: n.article_id,
          link_page: 'Eskaleringar',
        });
        sent++;
      }
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const isInitialRun = !!body.initial_run;

    // Load data
    const [articles, purchaseOrders, repairLogs, allUsers] = await Promise.all([
      db.entities.Article.list(),
      db.entities.PurchaseOrder.list(),
      db.entities.RepairLog.list().catch(() => []),
      db.entities.User.list().catch(() => []),
    ]);

    const inkopareUsers = allUsers.filter(u => u.role === 'inkopare');
    const konstruktorUsers = allUsers.filter(u => u.role === 'konstruktor' || u.role === 'konstruktion');
    const poMap = {};
    for (const po of purchaseOrders) poMap[po.id] = po;

    const watchedStatuses = ['in_transit', 'on_repair', 'pending_verification', 'unknown_delivery', 'on_its_way_home'];
    const watchedArticles = articles.filter(a => watchedStatuses.includes(a.status) && !a.escalation_resolved);

    const notifMap = {};
    const counts = { in_transit: 0, on_repair: 0, pending_verification: 0, unknown_delivery: 0, on_its_way_home: 0 };
    const escalationActions = { warned: 0, escalated: 0, critical: 0, task_created: 0, auto_fixed: 0 };

    const now = new Date().toISOString();

    for (const article of watchedArticles) {
      if (isSnoozed(article)) continue;
      const status = article.status;
      counts[status] = (counts[status] || 0) + 1;

      // ── IN_TRANSIT ──
      if (status === 'in_transit') {
        let deadlineStr = article.transit_expected_date;
        if (!deadlineStr && article.source_purchase_order_id) {
          const po = poMap[article.source_purchase_order_id];
          deadlineStr = po?.expected_delivery_date;
        }
        if (!deadlineStr) continue;

        const daysAfter = daysDiff(deadlineStr); // positive = overdue
        const daysBefore = -daysAfter;           // positive = days until deadline

        const responsible = article.assigned_to || inkopareUsers[0]?.email;

        // 7 days BEFORE deadline → warn
        if (daysBefore >= 0 && daysBefore <= 7 && article.escalation_level === 'none') {
          queueNotif(notifMap, responsible, {
            article_id: article.id,
            article_name: article.name,
            title: `Leverans om ${daysBefore} dagar`,
            message: 'Leverans förväntas inom en vecka',
            type: 'stock_alert',
            priority: 'normal',
          });
          await db.entities.Article.update(article.id, { escalation_level: 'warned', last_escalation_at: now });
          escalationActions.warned++;
        }

        // After deadline → escalate
        if (daysAfter > 0 && (article.escalation_level === 'none' || article.escalation_level === 'warned')) {
          // Notify inkopare
          for (const u of inkopareUsers) {
            queueNotif(notifMap, u.email, {
              article_id: article.id, article_name: article.name,
              title: 'Leverans försenad',
              message: `Leverans försenad ${daysAfter} dagar — kontakta leverantör`,
              type: 'stock_alert', priority: 'high',
            });
          }
          // Notify project leads on linked orders
          const linkedOrders = (await db.entities.Order.list().catch(() => []));
          // find orders via WorkOrders that reference this article (best effort)
          await db.entities.Article.update(article.id, { escalation_level: 'escalated', last_escalation_at: now });
          escalationActions.escalated++;
        }

        // 14+ days after deadline → critical
        if (daysAfter >= 14 && article.escalation_level !== 'critical') {
          queueNotif(notifMap, IVAN_EMAIL, {
            article_id: article.id, article_name: article.name,
            title: 'Kritisk leveransförsening',
            message: `Leverans ${daysAfter} dagar försenad — eskalering till Ivan`,
            type: 'stock_alert', priority: 'critical',
          });
          await db.entities.Task.create({
            name: `Följ upp försenad leverans: ${article.name}`,
            description: `Artikel ${article.sku || article.name} har stått i status in_transit i ${daysAfter} dagar efter deadline.`,
            phase: 'lager',
            role: 'inkopare',
            priority: 'high',
            assigned_to: IVAN_EMAIL,
            status: 'to_do',
          });
          await db.entities.Article.update(article.id, { escalation_level: 'critical', last_escalation_at: now });
          escalationActions.critical++;
          escalationActions.task_created++;
        }
      }

      // ── ON_REPAIR ──
      else if (status === 'on_repair') {
        if (!article.repair_date) continue;
        const daysInRepair = daysDiff(article.repair_date);
        if (daysInRepair === null) continue;

        const repairLog = repairLogs.find(r => r.article_id === article.id);
        const responsible = repairLog?.processed_by || repairLog?.created_by;

        if (daysInRepair >= 30 && (article.escalation_level === 'none')) {
          if (responsible) {
            queueNotif(notifMap, responsible, {
              article_id: article.id, article_name: article.name,
              title: 'Reparation >30 dagar',
              message: 'Reparation överstiger 30 dagar',
              type: 'repair_update', priority: 'normal',
            });
          }
          await db.entities.Article.update(article.id, { escalation_level: 'warned', last_escalation_at: now });
          escalationActions.warned++;
        }

        if (daysInRepair >= 60 && article.escalation_level === 'warned') {
          queueNotif(notifMap, IVAN_EMAIL, {
            article_id: article.id, article_name: article.name,
            title: 'Reparation >60 dagar',
            message: 'Reparation öppen >60 dagar — beslut behövs',
            type: 'repair_update', priority: 'high',
          });
          await db.entities.Article.update(article.id, { escalation_level: 'escalated', last_escalation_at: now });
          escalationActions.escalated++;
        }

        if (daysInRepair >= 120 && article.escalation_level !== 'critical') {
          await db.entities.Task.create({
            name: `Beslut om kassering eller färdigställande: ${article.name}`,
            description: `Artikel ${article.sku || article.name} har stått på reparation i ${daysInRepair} dagar.`,
            phase: 'lager',
            role: 'ivan',
            priority: 'high',
            assigned_to: IVAN_EMAIL,
            status: 'to_do',
          });
          await db.entities.Article.update(article.id, { escalation_level: 'critical', last_escalation_at: now });
          escalationActions.critical++;
          escalationActions.task_created++;
        }
      }

      // ── PENDING_VERIFICATION ──
      else if (status === 'pending_verification') {
        const createdDate = article.created_date;
        if (!createdDate) continue;
        const daysOld = daysDiff(createdDate);

        if (daysOld >= 7 && article.escalation_level === 'none') {
          const recipient = article.created_by;
          if (recipient) {
            queueNotif(notifMap, recipient, {
              article_id: article.id, article_name: article.name,
              title: 'Artikel saknar verifiering',
              message: 'Artikel saknar verifiering — 7 dagar sedan skapande',
              type: 'stock_alert', priority: 'normal',
            });
          }
          await db.entities.Article.update(article.id, { escalation_level: 'warned', last_escalation_at: now });
          escalationActions.warned++;
        }

        if (daysOld >= 30 && article.escalation_level !== 'critical') {
          // Auto-flip to discontinued
          await db.entities.Article.update(article.id, {
            status: 'discontinued',
            escalation_level: 'critical',
            last_escalation_at: now,
            notes: (article.notes ? article.notes + '\n' : '') + `[System] Auto-markerad som discontinued ${new Date().toISOString().split('T')[0]} — väntade på verifiering i ${daysOld} dagar.`,
          });
          await db.entities.Task.create({
            name: `Bekräfta kassering av overifierad artikel: ${article.name}`,
            description: `Artikel ${article.sku || article.name} auto-markerades som discontinued efter ${daysOld} dagars väntan på verifiering.`,
            phase: 'lager',
            role: 'ivan',
            priority: 'high',
            assigned_to: IVAN_EMAIL,
            status: 'to_do',
          });
          escalationActions.critical++;
          escalationActions.task_created++;
          escalationActions.auto_fixed++;
        }
      }

      // ── UNKNOWN_DELIVERY ──
      else if (status === 'unknown_delivery') {
        const deliveryDate = article.delivery_date;
        if (!deliveryDate) continue;
        const daysOld = daysDiff(deliveryDate);

        if (daysOld >= 5 && article.escalation_level === 'none') {
          const responsible = article.assigned_to;
          if (responsible) {
            queueNotif(notifMap, responsible, {
              article_id: article.id, article_name: article.name,
              title: 'Okänd leverans behöver utredas',
              message: `Okänd leverans ${daysOld} dagar gammal — utredning krävs`,
              type: 'stock_alert', priority: 'normal',
            });
          }
          await db.entities.Article.update(article.id, { escalation_level: 'warned', last_escalation_at: now });
          escalationActions.warned++;
        }

        if (daysOld >= 21 && article.escalation_level !== 'critical') {
          queueNotif(notifMap, IVAN_EMAIL, {
            article_id: article.id, article_name: article.name,
            title: 'Okänd leverans — eskalering',
            message: `Okänd leverans ${daysOld} dagar oidentifierad — eskalering till Ivan`,
            type: 'stock_alert', priority: 'high',
          });
          await db.entities.Article.update(article.id, { escalation_level: 'critical', last_escalation_at: now });
          escalationActions.critical++;
        }
      }

      // ── ON_ITS_WAY_HOME ──
      else if (status === 'on_its_way_home') {
        if (!article.transit_expected_date) continue;
        const daysAfter = daysDiff(article.transit_expected_date);
        if (daysAfter > 7 && article.escalation_level === 'none') {
          queueNotif(notifMap, article.assigned_to || inkopareUsers[0]?.email, {
            article_id: article.id, article_name: article.name,
            title: 'Artikel på väg hem — försenad',
            message: `Artikel förväntades hem ${daysAfter} dagar sedan`,
            type: 'stock_alert', priority: 'normal',
          });
          await db.entities.Article.update(article.id, { escalation_level: 'warned', last_escalation_at: now });
          escalationActions.warned++;
        }
      }
    }

    // ── CONSISTENCY CHECK: PO received but article still in_transit ──
    const receivedPOs = purchaseOrders.filter(po => po.status === 'received');
    const receivedPOIds = new Set(receivedPOs.map(po => po.id));
    const stuckArticles = articles.filter(a =>
      a.status === 'in_transit' &&
      a.source_purchase_order_id &&
      receivedPOIds.has(a.source_purchase_order_id)
    );

    for (const article of stuckArticles) {
      await db.entities.Article.update(article.id, {
        status: 'active',
        notes: (article.notes ? article.notes + '\n' : '') +
          `[System] Auto-fixad från in_transit → active ${new Date().toISOString().split('T')[0]} — kopplad PO är mottagen.`,
      });
      escalationActions.auto_fixed++;
    }

    // ── Send notifications ──
    const notifsSent = await sendGroupedNotifs(db, notifMap, isInitialRun);

    // ── SyncLog ──
    await db.entities.SyncLog.create({
      sync_type: 'article_status_watch',
      status: 'success',
      direction: 'internal',
      triggered_by: 'system',
      records_processed: watchedArticles.length,
      details: {
        initial_run: isInitialRun,
        counts_per_status: counts,
        escalation_actions: escalationActions,
        po_consistency_fixes: stuckArticles.length,
        notifications_sent: notifsSent,
        run_at: now,
      },
    });

    return Response.json({
      ok: true,
      watched: watchedArticles.length,
      escalation_actions: escalationActions,
      po_fixes: stuckArticles.length,
      notifications_sent: notifsSent,
      initial_run: isInitialRun,
    });

  } catch (error) {
    console.error('articleStatusWatch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});