import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Warehouse & Shelf Sync Webhook
 * 
 * This function is triggered by Base44 entity automations when a Warehouse or Shelf
 * record is created, updated, or deleted. It forwards the event to an external webhook URL.
 * 
 * Environment Variables Required:
 *   WEBHOOK_URL   - The URL of your external system's webhook endpoint
 *   WEBHOOK_TOKEN - A secret token sent in the Authorization header for security
 * 
 * Payload sent to external system (POST application/json):
 * {
 *   "event": {
 *     "type": "create" | "update" | "delete",
 *     "entity": "Warehouse" | "Shelf",
 *     "entity_id": "string",
 *     "timestamp": "ISO 8601 datetime"
 *   },
 *   "data": { ...current record fields... },         // null on delete
 *   "old_data": { ...previous record fields... }     // only on update, otherwise null
 * }
 * 
 * Warehouse fields:
 *   id, name, code, address, contact_person, is_active, notes, created_date, updated_date
 * 
 * Shelf fields:
 *   id, warehouse_id, shelf_code, description, aisle, rack, level,
 *   width_cm, height_cm, depth_cm, is_active, notes, created_date, updated_date
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhookUrl = Deno.env.get('WEBHOOK_URL');
    const webhookToken = Deno.env.get('WEBHOOK_TOKEN');

    if (!webhookUrl) {
      return Response.json({ error: 'WEBHOOK_URL is not configured' }, { status: 500 });
    }

    // Log incoming event for debugging

    const body = await req.json();
    const { event, data, old_data } = body;

    const payload = {
      event: {
        type: event.type,
        entity: event.entity_name,
        entity_id: event.entity_id,
        timestamp: new Date().toISOString()
      },
      data: data || null,
      old_data: old_data || null
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    if (webhookToken) {
      headers['Authorization'] = `Bearer ${webhookToken}`;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Webhook delivery failed: ${response.status} - ${errorText}`);
      return Response.json(
        { error: 'Webhook delivery failed', status: response.status, details: errorText },
        { status: 502 }
      );
    }

    console.log(`Webhook delivered: ${event.entity_name} ${event.type} (${event.entity_id})`);
    return Response.json({ success: true, entity: event.entity_name, type: event.type });

  } catch (error) {
    console.error('syncWarehouseWebhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});