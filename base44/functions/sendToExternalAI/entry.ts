import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const WEBHOOK_URL = Deno.env.get("WEBHOOK_URL");
    const WEBHOOK_TOKEN = Deno.env.get("WEBHOOK_TOKEN");

    try {
        const payload = await req.json();

        console.log('Sending to AI validator:', payload.entity_name);

        const event = {
            id: payload.id,
            entity: payload.entity_name,
            event_type: payload.action === 'create' ? 'CREATE' : 'UPDATE',
            occurred_at: new Date().toISOString(),
            data: payload.data || payload
        };

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Token': WEBHOOK_TOKEN
            },
            body: JSON.stringify(event)
        });

        const result = await response.json();

        if (result.processed?.review_status === 'FLAGGED') {
            return Response.json({
                success: true,
                warning: 'AI flagged this item for review',
                ai_review: result.processed
            });
        }

        return Response.json({ success: true, ai_review: result.processed });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ success: true, error: error.message });
    }
});