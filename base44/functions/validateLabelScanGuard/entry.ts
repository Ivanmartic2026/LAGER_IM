import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // This is an entity-level guard that validates LabelScan inserts
    // Should be called before LabelScan.create()
    
    const { context, image_hash, batch_id } = body;

    // Require context
    const validContexts = [
      'purchase_receiving',
      'article_creation',
      'repair_return',
      'site_report',
      'production',
      'manual_scan',
      'reanalysis'
    ];

    if (!context || !validContexts.includes(context)) {
      return Response.json({
        valid: false,
        error: `Context must be one of: ${validContexts.join(', ')}`
      }, { status: 400 });
    }

    return Response.json({ valid: true });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});