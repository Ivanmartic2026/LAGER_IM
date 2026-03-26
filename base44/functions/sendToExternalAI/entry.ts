import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    const WEBHOOK_URL = Deno.env.get("WEBHOOK_URL");
    const WEBHOOK_TOKEN = Deno.env.get("WEBHOOK_TOKEN");

    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();
        const entityName = payload.entity_name;
        const data = payload.data || payload;

        console.log('Sending to AI validator:', entityName);

        let enrichedData = { ...data };

        // For Article — enrich with supplier, PO and location
        if (entityName === 'Article') {
            const [suppliers, poItems] = await Promise.all([
                data.supplier_id
                    ? base44.asServiceRole.entities.Supplier.filter({ id: data.supplier_id })
                    : Promise.resolve([]),
                base44.asServiceRole.entities.PurchaseOrderItem.filter({ article_id: data.id }),
            ]);

            if (suppliers.length > 0) {
                const s = suppliers[0];
                enrichedData.supplier = {
                    id: s.id,
                    name: s.name,
                    contact_person: s.contact_person || null,
                    email: s.email || null,
                    phone: s.phone || null,
                };
            }

            if (poItems.length > 0) {
                const latestItem = poItems[poItems.length - 1];
                const orders = await base44.asServiceRole.entities.PurchaseOrder.filter({ id: latestItem.purchase_order_id });
                if (orders.length > 0) {
                    const po = orders[0];
                    enrichedData.purchase_order = {
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

            // Structured location info
            enrichedData.location = {
                warehouse: data.warehouse || null,
                shelf_address: data.shelf_address || null,
            };
        }

        const event = {
            id: data.id,
            entity: entityName,
            event_type: payload.action === 'create' ? 'CREATE' : 'UPDATE',
            occurred_at: new Date().toISOString(),
            data: enrichedData,
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