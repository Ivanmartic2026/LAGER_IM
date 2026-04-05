import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();
    const { projectNumber, date, distanceKm, description, driverName, vehicleReg, costSEK, source } = body;

    // Validate required fields
    if (!projectNumber || !date || distanceKm === undefined) {
      return Response.json(
        { error: 'Missing required fields: projectNumber, date, distanceKm' },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);

    // Calculate cost if not provided
    const calculatedCost = costSEK || (distanceKm * 25);

    // Check for duplicate DrivingJournalEntry (by projectNumber + date only — driverName can vary)
    const allForProject = await base44.asServiceRole.entities.DrivingJournalEntry.filter({
      projectNumber,
    });
    console.log(`[receiveDrivingJournal] projectNumber=${projectNumber} date=${date} driverName=${driverName} distanceKm=${distanceKm}`);
    console.log(`[receiveDrivingJournal] existing records for project: ${allForProject.length}`);
    
    const existing = allForProject.filter(e => e.date === date && e.driverName === (driverName || '') && e.distanceKm === distanceKm);
    console.log(`[receiveDrivingJournal] matching dedup records: ${existing.length}`);

    let journalEntry;
    if (!existing || existing.length === 0) {
      // Create driving journal entry (for display in ExpandedRow / ProjectReport)
      journalEntry = await base44.asServiceRole.entities.DrivingJournalEntry.create({
        projectNumber,
        date,
        distanceKm,
        driverName: driverName || '',
        vehicleReg: vehicleReg || '',
        purpose: description || '',
        source: source || 'imworkspace',
      });
      console.log(`[receiveDrivingJournal] CREATED new entry id=${journalEntry.id}`);
    } else {
      journalEntry = existing[0];
      console.log(`[receiveDrivingJournal] SKIPPED duplicate id=${journalEntry.id}`);
    }

    // Create expense entry for cost tracking
    const expense = await base44.asServiceRole.entities.ProjectExpense.create({
      projectNumber,
      date,
      distanceKm,
      description: description || '',
      driverName: driverName || '',
      vehicleReg: vehicleReg || '',
      costSEK: calculatedCost,
      source: source || 'imworkspace',
      type: 'driving',
    });

    return Response.json({ success: true, expense, journalEntry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});