import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Inventory (Article) Sync Webhook
 *
 * Triggered by Base44 entity automations when an Article record is created,
 * updated, or deleted. Forwards the event to an external webhook URL.
 *
 * Environment Variables Required:
 *   WEBHOOK_URL   - The URL of your external system's webhook endpoint
 *   WEBHOOK_TOKEN - Secret token sent in the Authorization header for security
 *
 * Payload sent to external system (POST application/json):
 * {
 *   "event": {
 *     "type": "create" | "update" | "delete",
 *     "entity": "Article",
 *     "entity_id": "string",
 *     "timestamp": "ISO 8601 datetime"
 *   },
 *   "data": { ...current article fields... },      // null on delete
 *   "old_data": { ...previous article fields... }, // only on update, otherwise null
 *   "changed_fields": ["field1", "field2"]         // only on update, otherwise null
 * }
 *
 * Article fields:
 *   id, sku, name, category, storage_type, status,
 *   stock_qty, reserved_stock_qty, min_stock_level,
 *   warehouse, shelf_address,
 *   unit_cost, supplier_id, supplier_name, supplier_product_code,
 *   batch_number, pixel_pitch_mm, pitch_value, series, product_version,
 *   manufacturer, manufacturing_date, brightness_nits,
 *   dimensions_width_mm, dimensions_height_mm, dimensions_depth_mm, weight_g,
 *   customer_name, notes, transit_notes, transit_expected_date,
 *   created_date, updated_date, created_by
 */

Deno.serve(async (req) => {
  try {
    const webhookUrl = Deno.env.get('WEBHOOK_URL');
    const webhookToken = Deno.env.get('WEBHOOK_TOKEN');

    if (!webhookUrl) {
      return Response.json({ error: 'WEBHOOK_URL is not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { event, data, old_data, changed_fields } = body;

    const payload = {
      event_type: event?.type,
      entity: event?.entity_name,
      entity_id: event?.entity_id,
      timestamp: new Date().toISOString(),
      data: data || null,
      old_data: old_data || null,
      changed_fields: changed_fields || null
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

    console.log(`Webhook delivered: Article ${event?.type} (${event?.entity_id})`);
    return Response.json({ success: true, entity: event?.entity_name, type: event?.type });

  } catch (error) {
    console.error('syncInventoryWebhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});