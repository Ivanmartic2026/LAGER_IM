import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get webhook configuration from environment
        const webhookUrl = Deno.env.get("WEBHOOK_URL");
        const webhookToken = Deno.env.get("WEBHOOK_TOKEN");
        
        if (!webhookUrl || !webhookToken) {
            return Response.json({ 
                error: 'Webhook configuration missing. Set WEBHOOK_URL and WEBHOOK_TOKEN in Secrets.' 
            }, { status: 500 });
        }
        
        // Get the event data from the automation
        const payload = await req.json();
        
        // Prepare webhook payload
        const webhookPayload = {
            timestamp: new Date().toISOString(),
            source: 'base44',
            event: {
                type: payload.event?.type || 'unknown',
                entity_name: payload.event?.entity_name || 'unknown',
                entity_id: payload.event?.entity_id || null,
            },
            data: payload.data || null,
            old_data: payload.old_data || null,
            metadata: {
                app_id: Deno.env.get("BASE44_APP_ID"),
                triggered_at: new Date().toISOString()
            }
        };
        
        // Send to external AI system
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Token': webhookToken,
            },
            body: JSON.stringify(webhookPayload)
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
            console.error('External API error:', response.status, responseText);
            return Response.json({ 
                success: false,
                error: `External API returned ${response.status}`,
                details: responseText
            }, { status: 200 }); // Return 200 to avoid automation retries
        }
        
        return Response.json({ 
            success: true,
            external_response: responseText,
            sent_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Webhook error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 200 }); // Return 200 to avoid automation retries
    }
});