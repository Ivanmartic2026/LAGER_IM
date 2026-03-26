import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

        // Fetch related data in parallel
        let supplier = null;
        let purchaseOrder = null;
        let purchaseOrderItem = null;

        if (data) {
            const [suppliers, poItems] = await Promise.all([
                data.supplier_id
                    ? base44.asServiceRole.entities.Supplier.filter({ id: data.supplier_id })
                    : Promise.resolve([]),
                base44.asServiceRole.entities.PurchaseOrderItem.filter({ article_id: data.id }),
            ]);

            if (suppliers.length > 0) {
                const s = suppliers[0];
                supplier = {
                    id: s.id,
                    name: s.name,
                    contact_person: s.contact_person || null,
                    email: s.email || null,
                    phone: s.phone || null,
                };
            }

            if (poItems.length > 0) {
                const latestItem = poItems[poItems.length - 1];
                purchaseOrderItem = latestItem;
                const orders = await base44.asServiceRole.entities.PurchaseOrder.filter({ id: latestItem.purchase_order_id });
                if (orders.length > 0) {
                    const po = orders[0];
                    purchaseOrder = {
                        id: po.id,
                        po_number: po.po_number || null,
                        status: po.status,
                        expected_delivery_date: po.expected_delivery_date || null,
                        confirmed_delivery_date: po.confirmed_delivery_date || null,
                        supplier_name: po.supplier_name || null,
                        mode_of_transport: po.mode_of_transport || null,
                        tracking_number: po.tracking_number || null,
                    };
                }
            }
        }

        // Build enriched webhook payload
        const webhookPayload = {
            event_type: event?.type,
            entity: "Article",
            entity_id: event?.entity_id,
            timestamp: new Date().toISOString(),
            data: data ? {
                // Core article fields
                id: data.id,
                name: data.name,
                customer_name: data.customer_name || null,
                sku: data.sku || null,
                batch_number: data.batch_number || null,
                category: data.category || null,
                status: data.status,
                stock_qty: data.stock_qty || 0,
                reserved_stock_qty: data.reserved_stock_qty || 0,
                min_stock_level: data.min_stock_level || null,
                storage_type: data.storage_type || null,
                // Location
                warehouse: data.warehouse || null,
                shelf_address: data.shelf_address || null,
                // Technical
                pixel_pitch_mm: data.pixel_pitch_mm || null,
                series: data.series || null,
                product_version: data.product_version || null,
                brightness_nits: data.brightness_nits || null,
                manufacturer: data.manufacturer || null,
                manufacturing_date: data.manufacturing_date || null,
                // Dimensions
                dimensions_width_mm: data.dimensions_width_mm || null,
                dimensions_height_mm: data.dimensions_height_mm || null,
                dimensions_depth_mm: data.dimensions_depth_mm || null,
                weight_g: data.weight_g || null,
                // Transit
                transit_expected_date: data.transit_expected_date || null,
                transit_notes: data.transit_notes || null,
                // Files
                image_urls: data.image_urls || [],
                cfg_file_url: data.cfg_file_url || null,
                // Metadata
                notes: data.notes || null,
                created_date: data.created_date,
                updated_date: data.updated_date,
                // Related data
                supplier: supplier,
                purchase_order: purchaseOrder,
            } : null,
            old_data: old_data || null,
        };

        const headers = { "Content-Type": "application/json" };
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
            return Response.json({ error: "Webhook delivery failed", status: response.status }, { status: 502 });
        }

        console.log(`Webhook delivered: ${event?.type} on Article ${event?.entity_id}`);
        return Response.json({ success: true, event_type: event?.type });

    } catch (error) {
        console.error("Webhook error:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});