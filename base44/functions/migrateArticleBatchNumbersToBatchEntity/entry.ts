import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Classification constants ────────────────────────────────────────────────
const AUTO_PLACEHOLDER_REGEX = /^AUTO-\d{13}-\d+$/;
const JUNK_SET = new Set([
  "0","123","123456","1234567","#0809","VA Batchnummer saknas",
  "K.v.K number:67460178","BATCH-2026-TEST","Receiving Card and hub",
  "HGW-fördelare","VA-Kabinett-TBH","VA-Kabinett-TBH1",
  "VA-Modulex120260403","Va-TBH20260403","VA-Led20260403",
  "VA-Kabinett-Tillbehör1","Testing from base64"
]);
const BAD_DATE_VALUES = new Set([
  "Unknown","N/A","Oklart","Not visible","Not Available","Unspecified Date",""
]);

function classifyBatchNumber(batchNum, article) {
  if (!batchNum || batchNum.trim() === '') return 'SKIP';
  const trimmed = batchNum.trim();
  if (AUTO_PLACEHOLDER_REGEX.test(trimmed)) return 'AUTO_PLACEHOLDER';
  if (JUNK_SET.has(trimmed)) return 'JUNK';
  if (trimmed.startsWith('TEST')) return 'JUNK';
  if (article.sku && trimmed === article.sku) return 'JUNK';
  return 'REAL';
}

function parseManufacturingDate(raw) {
  if (!raw || BAD_DATE_VALUES.has(raw.trim())) return { date: null, bad: true };
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return { date: null, bad: true };
    return { date: d.toISOString().split('T')[0], bad: false };
  } catch {
    return { date: null, bad: true };
  }
}

function normalizeBatchNumber(raw) {
  return (raw || '').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'dry_run'; // 'dry_run' | 'execute'
    const migrationRunId = body.migration_run_id; // required for execute

    // ── Concurrency lock ────────────────────────────────────────────────────
    const locks = await base44.asServiceRole.entities.SystemAutomation.filter({
      automation_type: 'batch_migration_lock'
    });
    if (locks.length > 0) {
      return Response.json({ error: 'Migration already in progress. Check SystemAutomation lock.' }, { status: 409 });
    }

    // ── Fetch all articles ───────────────────────────────────────────────────
    const articles = await base44.asServiceRole.entities.Article.list('-updated_date', 2000);
    const eligible = articles.filter(a => {
      if (!a.batch_number || a.batch_number.trim() === '') return false;
      if (mode === 'execute' && a.primary_batch_id) return false; // idempotency
      return true;
    });

    // ── Classify ─────────────────────────────────────────────────────────────
    const classified = { AUTO_PLACEHOLDER: [], JUNK: [], REAL: [] };
    for (const a of eligible) {
      const cat = classifyBatchNumber(a.batch_number, a);
      if (cat === 'SKIP') continue;
      classified[cat].push(a);
    }

    // ── Detect duplicates within REAL ────────────────────────────────────────
    const groupsByBatch = {};
    for (const a of classified.REAL) {
      const key = normalizeBatchNumber(a.batch_number);
      if (!groupsByBatch[key]) groupsByBatch[key] = [];
      groupsByBatch[key].push(a);
    }
    const trueDuplicates = []; // [ {batch_number, articles: [...]} ]
    const falseDuplicates = [];
    const realSingles = [];

    for (const [batchNum, group] of Object.entries(groupsByBatch)) {
      if (group.length === 1) {
        realSingles.push(group[0]);
        continue;
      }
      // same supplier_id in all → TRUE_DUPLICATE
      const supplierId = group[0].supplier_id;
      const allSameSupplier = group.every(a => a.supplier_id === supplierId);
      if (allSameSupplier) {
        trueDuplicates.push({ batch_number: batchNum, articles: group });
      } else {
        falseDuplicates.push({ batch_number: batchNum, articles: group });
      }
    }

    // ── DRY RUN ──────────────────────────────────────────────────────────────
    if (mode === 'dry_run') {
      const buildList = (arr) => arr.map(a => ({
        id: a.id, name: a.name, batch_number: a.batch_number,
        supplier_name: a.supplier_name, sku: a.sku
      }));

      const summaryInput = {
        total_eligible: eligible.length,
        auto_placeholder_count: classified.AUTO_PLACEHOLDER.length,
        junk_count: classified.JUNK.length,
        real_singles_count: realSingles.length,
        true_duplicate_groups: trueDuplicates.length,
        true_duplicate_articles: trueDuplicates.reduce((s, g) => s + g.articles.length, 0),
        false_duplicate_groups: falseDuplicates.length,
        false_duplicate_articles: falseDuplicates.reduce((s, g) => s + g.articles.length, 0),
        articles_auto_placeholder: buildList(classified.AUTO_PLACEHOLDER),
        articles_junk: classified.JUNK.map(a => ({
          id: a.id, name: a.name, batch_number: a.batch_number,
          supplier_name: a.supplier_name, sku: a.sku,
          reason: a.batch_number.startsWith('TEST') ? 'starts_with_TEST'
            : a.sku && a.batch_number.trim() === a.sku ? 'equals_sku'
            : 'junk_list'
        })),
        articles_real: buildList(realSingles),
        true_duplicate_groups_detail: trueDuplicates.map(g => ({
          batch_number: g.batch_number,
          articles: buildList(g.articles),
          total_qty: g.articles.reduce((s, a) => s + (a.stock_qty || 0), 0)
        })),
        false_duplicate_groups_detail: falseDuplicates.map(g => ({
          batch_number: g.batch_number,
          articles: buildList(g.articles)
        }))
      };

      const expectedNewBatches = realSingles.length
        + trueDuplicates.length
        + falseDuplicates.reduce((s, g) => s + g.articles.length, 0)
        + classified.AUTO_PLACEHOLDER.length;

      // Upsert MigrationRun preview
      const existing = await base44.asServiceRole.entities.MigrationRun.filter({
        migration_name: 'migrateArticleBatchNumbersToBatchEntity'
      });
      const previewRun = existing.find(r => r.input_summary?.mode === 'preview');

      const runData = {
        migration_name: 'migrateArticleBatchNumbersToBatchEntity',
        run_date: new Date().toISOString(),
        ran_by: user.email,
        input_summary: { ...summaryInput, mode: 'preview' },
        output_summary: {
          expected_new_batches: expectedNewBatches,
          articles_to_clean: classified.JUNK.length,
          merge_queue_entries: falseDuplicates.length
        },
        rollback_available: false,
        errors: []
      };

      if (previewRun) {
        await base44.asServiceRole.entities.MigrationRun.update(previewRun.id, runData);
      } else {
        await base44.asServiceRole.entities.MigrationRun.create(runData);
      }

      return Response.json({ success: true, mode: 'dry_run', summary: summaryInput, expected: runData.output_summary });
    }

    // ── EXECUTE ───────────────────────────────────────────────────────────────
    if (mode !== 'execute') {
      return Response.json({ error: 'Unknown mode' }, { status: 400 });
    }
    if (!migrationRunId) {
      return Response.json({ error: 'migration_run_id required for execute' }, { status: 400 });
    }

    // Acquire lock
    const lock = await base44.asServiceRole.entities.SystemAutomation.create({
      automation_type: 'batch_migration_lock',
      name: 'migrateArticleBatchNumbersToBatchEntity',
      is_active: true
    });

    try {
      // Build rollback snapshot before ANY writes
      const allToMigrate = [
        ...classified.AUTO_PLACEHOLDER,
        ...classified.JUNK,
        ...realSingles,
        ...trueDuplicates.flatMap(g => g.articles),
        ...falseDuplicates.flatMap(g => g.articles)
      ];
      const rollbackSnapshot = {};
      for (const a of allToMigrate) {
        rollbackSnapshot[a.id] = {
          id: a.id, batch_number: a.batch_number,
          primary_batch_id: a.primary_batch_id || null,
          legacy_batch_number: a.legacy_batch_number || null
        };
      }

      const errors = [];
      const createdBatchIds = [];
      const createdBatchEventIds = [];
      const createdQueueIds = [];
      let batchesCreated = 0;
      let articlesClean = 0;
      let queueEntries = 0;

      const createBatchAndEvent = async (batchData, sourceArticleId) => {
        const batch = await base44.asServiceRole.entities.Batch.create(batchData);
        createdBatchIds.push(batch.id);
        batchesCreated++;
        const ev = await base44.asServiceRole.entities.BatchEvent.create({
          batch_id: batch.id,
          event_type: 'created',
          source_entity: 'MigrationRun',
          source_id: migrationRunId,
          payload: { migrated_from_article: true, original_value: rollbackSnapshot[sourceArticleId]?.batch_number }
        });
        createdBatchEventIds.push(ev.id);
        return batch;
      };

      // Process REAL singles
      for (const a of realSingles) {
        try {
          const { date: mfgDate, bad } = parseManufacturingDate(a.manufacturing_date);
          const riskFlags = bad ? ['batch_pattern_deviation'] : [];
          const batch = await createBatchAndEvent({
            batch_number: normalizeBatchNumber(a.batch_number),
            raw_batch_number: a.batch_number,
            aliases: [a.batch_number],
            article_id: a.id,
            article_sku: a.sku,
            article_name: a.name,
            supplier_id: a.supplier_id,
            supplier_name: a.supplier_name,
            supplier_source: 'manual',
            quantity: a.stock_qty || 0,
            manufacturing_date: mfgDate,
            source_context: 'migrated_from_article',
            legacy_unmigrated: false,
            status: a.supplier_id ? 'verified' : 'pending_verification',
            notes: `Migrerad från Article ${a.id}`,
            purchase_order_id: a.source_purchase_order_id || undefined,
            risk_flags: riskFlags
          }, a.id);
          await base44.asServiceRole.entities.Article.update(a.id, {
            primary_batch_id: batch.id,
            legacy_batch_number: a.batch_number,
            batch_number: ''
          });
        } catch (e) {
          errors.push({ article_id: a.id, batch_number: a.batch_number, error: e.message });
        }
      }

      // Process AUTO_PLACEHOLDER
      for (const a of classified.AUTO_PLACEHOLDER) {
        try {
          const batch = await createBatchAndEvent({
            batch_number: normalizeBatchNumber(a.batch_number),
            raw_batch_number: a.batch_number,
            aliases: [a.batch_number],
            article_id: a.id,
            article_sku: a.sku,
            article_name: a.name,
            supplier_id: a.supplier_id,
            supplier_name: a.supplier_name,
            supplier_source: 'manual',
            quantity: a.stock_qty || 0,
            source_context: 'migrated_from_article',
            legacy_unmigrated: true,
            status: 'pending_verification',
            notes: 'Auto-genererat placeholder från Fortnox-import 2026-01-02',
            risk_flags: ['low_ai_confidence'],
            purchase_order_id: a.source_purchase_order_id || undefined
          }, a.id);
          await base44.asServiceRole.entities.Article.update(a.id, {
            primary_batch_id: batch.id,
            legacy_batch_number: a.batch_number,
            batch_number: ''
          });
        } catch (e) {
          errors.push({ article_id: a.id, batch_number: a.batch_number, error: e.message });
        }
      }

      // Process JUNK — no batch created
      for (const a of classified.JUNK) {
        try {
          await base44.asServiceRole.entities.Article.update(a.id, {
            legacy_batch_number: a.batch_number,
            batch_number: ''
          });
          articlesClean++;
          errors.push({ article_id: a.id, batch_number: a.batch_number, error: 'JUNK — no batch created', level: 'info' });
        } catch (e) {
          errors.push({ article_id: a.id, batch_number: a.batch_number, error: e.message });
        }
      }

      // Process TRUE_DUPLICATE groups
      for (const group of trueDuplicates) {
        try {
          const rep = group.articles[0];
          const totalQty = group.articles.reduce((s, a) => s + (a.stock_qty || 0), 0);
          const { date: mfgDate, bad } = parseManufacturingDate(rep.manufacturing_date);
          const riskFlags = bad ? ['batch_pattern_deviation'] : [];
          const batch = await createBatchAndEvent({
            batch_number: normalizeBatchNumber(group.batch_number),
            raw_batch_number: group.batch_number,
            aliases: [group.batch_number],
            article_id: rep.id,
            article_sku: rep.sku,
            article_name: rep.name,
            supplier_id: rep.supplier_id,
            supplier_name: rep.supplier_name,
            supplier_source: 'manual',
            quantity: totalQty,
            manufacturing_date: mfgDate,
            source_context: 'migrated_from_article',
            legacy_unmigrated: false,
            status: rep.supplier_id ? 'verified' : 'pending_verification',
            notes: `TRUE_DUPLICATE — ${group.articles.length} artiklar konsoliderade`,
            risk_flags: riskFlags,
            merged_from_batch_ids: []
          }, rep.id);
          for (const a of group.articles) {
            await base44.asServiceRole.entities.Article.update(a.id, {
              primary_batch_id: batch.id,
              legacy_batch_number: a.batch_number,
              batch_number: ''
            });
          }
        } catch (e) {
          errors.push({ batch_number: group.batch_number, error: e.message });
        }
      }

      // Process FALSE_DUPLICATE groups
      for (const group of falseDuplicates) {
        try {
          const createdInGroup = [];
          for (const a of group.articles) {
            const { date: mfgDate, bad } = parseManufacturingDate(a.manufacturing_date);
            const riskFlags = bad ? ['batch_pattern_deviation'] : [];
            const batch = await createBatchAndEvent({
              batch_number: normalizeBatchNumber(a.batch_number),
              raw_batch_number: a.batch_number,
              aliases: [a.batch_number],
              article_id: a.id,
              article_sku: a.sku,
              article_name: a.name,
              supplier_id: a.supplier_id,
              supplier_name: a.supplier_name,
              supplier_source: 'manual',
              quantity: a.stock_qty || 0,
              manufacturing_date: mfgDate,
              source_context: 'migrated_from_article',
              legacy_unmigrated: false,
              status: a.supplier_id ? 'verified' : 'pending_verification',
              notes: `FALSE_DUPLICATE grupp — manuell granskning krävs`,
              risk_flags: [...riskFlags, 'supplier_mismatch']
            }, a.id);
            await base44.asServiceRole.entities.Article.update(a.id, {
              primary_batch_id: batch.id,
              legacy_batch_number: a.batch_number,
              batch_number: ''
            });
            createdInGroup.push({ batch_id: batch.id, article_id: a.id, stock_qty: a.stock_qty });
          }
          // MergeApprovalQueue
          const coupling_breakdown = {};
          createdInGroup.forEach(c => { coupling_breakdown[c.batch_id] = { stock_qty: c.stock_qty, article_id: c.article_id }; });
          const qe = await base44.asServiceRole.entities.MergeApprovalQueue.create({
            queue_type: 'batch_duplicate',
            candidate_ids: createdInGroup.map(c => c.batch_id),
            candidate_entity: 'Batch',
            similarity_key: group.batch_number,
            status: 'pending_review',
            coupling_breakdown
          });
          createdQueueIds.push(qe.id);
          queueEntries++;
        } catch (e) {
          errors.push({ batch_number: group.batch_number, error: e.message });
        }
      }

      // Update MigrationRun with results
      await base44.asServiceRole.entities.MigrationRun.update(migrationRunId, {
        run_date: new Date().toISOString(),
        ran_by: user.email,
        rollback_available: true,
        rolled_back: false,
        errors,
        rollback_snapshot: rollbackSnapshot,
        output_summary: {
          batches_created: batchesCreated,
          articles_cleaned: articlesClean,
          queue_entries_created: queueEntries,
          error_count: errors.filter(e => !e.level || e.level !== 'info').length,
          created_batch_ids: createdBatchIds,
          created_batch_event_ids: createdBatchEventIds,
          created_queue_ids: createdQueueIds
        }
      });

      return Response.json({
        success: true, mode: 'execute',
        batches_created: batchesCreated,
        articles_cleaned: articlesClean,
        queue_entries: queueEntries,
        errors
      });

    } finally {
      // Release lock
      await base44.asServiceRole.entities.SystemAutomation.delete(lock.id).catch(() => {});
    }

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});