import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const LAGER_AI_URL = Deno.env.get("LAGER_AI_URL");

    if (!LAGER_AI_URL) {
        return Response.json({ success: false, error: 'LAGER_AI_URL is not configured' }, { status: 500 });
    }

    try {
        const payload = await req.json();

        console.log('Sending to Lager AI:', payload.entity_name || 'unknown entity');

        const response = await fetch(LAGER_AI_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Base44-Event': payload.type || 'unknown'
            },
            body: JSON.stringify(payload.data || payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }

        const result = await response.json();
        return Response.json({ success: true, message: 'Synced to Lager AI', ai_response: result });
    } catch (error) {
        console.error('Sync error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});