import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // This is an entity-level guard that validates Batch inserts
    const { article_id, legacy_unmigrated } = body;

    // Batch must have article_id OR be marked as legacy_unmigrated
    if (!article_id && !legacy_unmigrated) {
      return Response.json({
        valid: false,
        error: 'Batch must be kopplas till artikel (article_id) eller märkeras legacy_unmigrated=true. Använd scanAndProcess för nya batchers.'
      }, { status: 400 });
    }

    return Response.json({ valid: true });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});