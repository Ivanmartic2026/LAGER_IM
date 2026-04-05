import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return '';
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json', {
      headers: { 'User-Agent': 'IM-Lager/1.0' }
    });
    const d = await r.json();
    const a = d.address || {};
    const street = (a.road || '') + (a.house_number ? ' ' + a.house_number : '');
    const city = a.city || a.town || a.village || a.municipality || '';
    return [street, city].filter(Boolean).join(', ') || (d.display_name || '').split(',').slice(0, 2).join(',');
  } catch(e) { return ''; }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();
    const { projectNumber, date, distanceKm, description, driverName, vehicleReg, costSEK, source,
            fromAddress, toAddress, fromLat, fromLng, toLat, toLng, startTime, endTime } = body;

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

    // Reverse geocode if addresses are missing but coordinates are available
    const [resolvedFromAddress, resolvedToAddress] = await Promise.all([
      fromAddress ? Promise.resolve(fromAddress) : reverseGeocode(fromLat, fromLng),
      toAddress   ? Promise.resolve(toAddress)   : reverseGeocode(toLat, toLng),
    ]);

    console.log(`[receiveDrivingJournal] projectNumber=${projectNumber} date=${date} driverName=${driverName} distanceKm=${distanceKm}`);
    console.log(`[receiveDrivingJournal] fromAddress="${resolvedFromAddress}" toAddress="${resolvedToAddress}"`);

    // Check for duplicate DrivingJournalEntry (by projectNumber + date + driverName + distanceKm)
    const allForProject = await base44.asServiceRole.entities.DrivingJournalEntry.filter({ projectNumber });
    console.log(`[receiveDrivingJournal] existing records for project: ${allForProject.length}`);

    const existing = allForProject.filter(e =>
      e.date === date && e.driverName === (driverName || '') && e.distanceKm === distanceKm
    );
    console.log(`[receiveDrivingJournal] matching dedup records: ${existing.length}`);

    let journalEntry;
    if (!existing || existing.length === 0) {
      journalEntry = await base44.asServiceRole.entities.DrivingJournalEntry.create({
        projectNumber,
        date,
        distanceKm,
        driverName: driverName || '',
        vehicleReg: vehicleReg || '',
        purpose: description || '',
        source: source || 'imworkspace',
        ...(resolvedFromAddress && { fromAddress: resolvedFromAddress }),
        ...(resolvedToAddress   && { toAddress: resolvedToAddress }),
        ...(fromLat !== undefined && { fromLat }),
        ...(fromLng !== undefined && { fromLng }),
        ...(toLat   !== undefined && { toLat }),
        ...(toLng   !== undefined && { toLng }),
        ...(startTime && { startTime }),
        ...(endTime   && { endTime }),
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