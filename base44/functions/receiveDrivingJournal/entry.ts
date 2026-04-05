import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return '';
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json&accept-language=sv', {
      headers: { 'User-Agent': 'IM-Lager/1.0' }
    });
    const d = await r.json();
    const a = d.address || {};
    const street = (a.road || a.pedestrian || a.footway || '') + (a.house_number ? ' ' + a.house_number : '');
    const city = a.city || a.town || a.village || a.municipality || '';
    return [street, city].filter(Boolean).join(', ') || (d.display_name || '').split(',').slice(0, 2).join(',').trim();
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

    if (!projectNumber || !date || distanceKm === undefined) {
      return Response.json(
        { error: 'Missing required fields: projectNumber, date, distanceKm' },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);
    const calculatedCost = costSEK || (distanceKm * 25);

    // Check for duplicate DrivingJournalEntry
    const allForProject = await base44.asServiceRole.entities.DrivingJournalEntry.filter({ projectNumber });
    const existing = allForProject.filter(e =>
      e.date === date && e.driverName === (driverName || '') && e.distanceKm === distanceKm
    );

    console.log(`[receiveDrivingJournal] projectNumber=${projectNumber} date=${date} driverName=${driverName} distanceKm=${distanceKm}`);
    console.log(`[receiveDrivingJournal] existing records: ${allForProject.length}, matching dedup: ${existing.length}`);

    let journalEntry;

    if (existing.length > 0) {
      journalEntry = existing[0];
      // BUG 1 FIX: If existing record lacks fromAddress but incoming has lat/lng, update it
      const needsAddressUpdate = !journalEntry.fromAddress && (fromLat || fromLng);
      if (needsAddressUpdate) {
        const [resolvedFrom, resolvedTo] = await Promise.all([
          fromAddress ? Promise.resolve(fromAddress) : reverseGeocode(fromLat, fromLng),
          toAddress   ? Promise.resolve(toAddress)   : reverseGeocode(toLat, toLng),
        ]);
        const updateData = {
          ...(resolvedFrom && { fromAddress: resolvedFrom }),
          ...(resolvedTo   && { toAddress: resolvedTo }),
          ...(fromLat !== undefined && { fromLat }),
          ...(fromLng !== undefined && { fromLng }),
          ...(toLat   !== undefined && { toLat }),
          ...(toLng   !== undefined && { toLng }),
          ...(startTime && { startTime }),
          ...(endTime   && { endTime }),
        };
        journalEntry = await base44.asServiceRole.entities.DrivingJournalEntry.update(journalEntry.id, updateData);
        console.log(`[receiveDrivingJournal] UPDATED existing entry id=${journalEntry.id} with addresses: from="${resolvedFrom}" to="${resolvedTo}"`);
      } else {
        console.log(`[receiveDrivingJournal] SKIPPED duplicate id=${journalEntry.id}`);
      }
    } else {
      // New record — geocode if addresses missing
      const [resolvedFromAddress, resolvedToAddress] = await Promise.all([
        fromAddress ? Promise.resolve(fromAddress) : reverseGeocode(fromLat, fromLng),
        toAddress   ? Promise.resolve(toAddress)   : reverseGeocode(toLat, toLng),
      ]);
      console.log(`[receiveDrivingJournal] fromAddress="${resolvedFromAddress}" toAddress="${resolvedToAddress}"`);

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
    }

    // BUG 2 FIX: Deduplicate ProjectExpense before creating
    const allExpenses = await base44.asServiceRole.entities.ProjectExpense.filter({ projectNumber });
    const existingExpense = allExpenses.find(e =>
      e.date === date && e.driverName === (driverName || '') && e.distanceKm === distanceKm && e.type === 'driving'
    );

    let expense;
    if (existingExpense) {
      expense = existingExpense;
      console.log(`[receiveDrivingJournal] SKIPPED duplicate expense id=${expense.id}`);
    } else {
      expense = await base44.asServiceRole.entities.ProjectExpense.create({
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
      console.log(`[receiveDrivingJournal] CREATED expense id=${expense.id}`);
    }

    return Response.json({ success: true, expense, journalEntry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});