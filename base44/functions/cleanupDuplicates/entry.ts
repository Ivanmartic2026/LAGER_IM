import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── 1. DrivingJournalEntry deduplication ──────────────────────────────
    const allDJ = await base44.asServiceRole.entities.DrivingJournalEntry.list();

    // Group by projectNumber + date + driverName + distanceKm
    const djGroups = {};
    for (const entry of allDJ) {
      const key = `${entry.projectNumber}|${entry.date}|${entry.driverName || ''}|${entry.distanceKm}`;
      if (!djGroups[key]) djGroups[key] = [];
      djGroups[key].push(entry);
    }

    let djRemoved = 0;
    for (const group of Object.values(djGroups)) {
      if (group.length <= 1) continue;

      // Sort: prefer records with fromAddress set, then by created_date ascending (oldest first)
      group.sort((a, b) => {
        const aScore = (a.fromAddress ? 2 : 0) + (a.toAddress ? 1 : 0);
        const bScore = (b.fromAddress ? 2 : 0) + (b.toAddress ? 1 : 0);
        if (bScore !== aScore) return bScore - aScore; // higher score first
        return new Date(a.created_date) - new Date(b.created_date); // oldest first
      });

      const [keep, ...toDelete] = group;
      console.log(`[cleanupDuplicates] DrivingJournalEntry: keeping id=${keep.id} (fromAddress="${keep.fromAddress}"), deleting ${toDelete.length} duplicates`);

      for (const dup of toDelete) {
        await base44.asServiceRole.entities.DrivingJournalEntry.delete(dup.id);
        djRemoved++;
      }
    }

    console.log(`[cleanupDuplicates] DrivingJournalEntry removed: ${djRemoved}`);

    // ── 2. ProjectExpense deduplication ───────────────────────────────────
    const allExp = await base44.asServiceRole.entities.ProjectExpense.list();

    // Group by projectNumber + date + driverName (fallback to vehicleReg) + costSEK + type
    const expGroups = {};
    for (const exp of allExp) {
      const nameKey = exp.driverName || exp.vehicleReg || '';
      const key = `${exp.projectNumber}|${exp.date}|${nameKey}|${exp.costSEK}|${exp.type || ''}`;
      if (!expGroups[key]) expGroups[key] = [];
      expGroups[key].push(exp);
    }

    let expenseRemoved = 0;
    for (const group of Object.values(expGroups)) {
      if (group.length <= 1) continue;

      // Keep oldest (by created_date)
      group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      const [keep, ...toDelete] = group;
      console.log(`[cleanupDuplicates] ProjectExpense: keeping id=${keep.id}, deleting ${toDelete.length} duplicates`);

      for (const dup of toDelete) {
        await base44.asServiceRole.entities.ProjectExpense.delete(dup.id);
        expenseRemoved++;
      }
    }

    console.log(`[cleanupDuplicates] ProjectExpense removed: ${expenseRemoved}`);

    return Response.json({
      djRemoved,
      expenseRemoved,
      message: `Cleanup complete. Removed ${djRemoved} DrivingJournalEntry duplicates and ${expenseRemoved} ProjectExpense duplicates.`
    });

  } catch (error) {
    console.error('[cleanupDuplicates] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});