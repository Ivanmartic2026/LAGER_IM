import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    return Response.json({
      error: '🚨 ExtractedValueLog entity är DEPRECATED. Använd LabelScan + scanAndProcess istället.',
      status: 410
    }, { status: 410 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});