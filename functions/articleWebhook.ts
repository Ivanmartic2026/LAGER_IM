import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        const webhookUrl = Deno.env.get("WEBHOOK_URL");
        const webhookToken = Deno.env.get("WEBHOOK_TOKEN");

        if (!webhookUrl) {
            return Response.json({ error: "WEBHOOK_URL is not configured" }, { status: 500 });
        }

        const { event, data, old_data } = payload;

        // Build the webhook payload
        const webhookPayload = {
            event_type: event?.type,           // "create", "update", "delete"
            entity: "Article",
            entity_id: event?.entity_id,
            timestamp: new Date().toISOString(),
            data: data || null,
            old_data: old_data || null,        // Only present on updates
        };

        const headers = {
            "Content-Type": "application/json",
        };

        if (webhookToken) {
            headers["Authorization"] = `Bearer ${webhookToken}`;
        }

        const response = await fetch(webhookUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(webhookPayload),
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.error(`Webhook failed: ${response.status} ${response.statusText}`);
            return Response.json({ 
                error: "Webhook delivery failed", 
                status: response.status 
            }, { status: 502 });
        }

        console.log(`Webhook delivered: ${event?.type} on Article ${event?.entity_id}`);
        return Response.json({ success: true, event_type: event?.type });

    } catch (error) {
        console.error("Webhook error:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});