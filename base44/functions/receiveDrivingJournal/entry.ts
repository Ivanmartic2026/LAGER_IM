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

    // Create expense entry
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

    return Response.json({ success: true, expense });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});