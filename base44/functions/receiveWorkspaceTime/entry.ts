import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();
    const { projectNumber, projectName, date, hours, description, reporter, hourlyRate } = body;

    // Validate required fields
    if (!projectNumber || !date || hours === undefined) {
      return Response.json(
        { error: 'Missing required fields: projectNumber, date, hours' },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);

    // Create time entry
    const entry = await base44.asServiceRole.entities.ProjectTime.create({
      projectNumber,
      projectName: projectName || '',
      date,
      hours,
      description: description || '',
      reporter: reporter || '',
      hourlyRate: hourlyRate || 0,
    });

    return Response.json({ success: true, entry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});