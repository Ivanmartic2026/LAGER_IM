import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // --- Authentication ---
        const authHeader = req.headers.get("Authorization");
        const expectedKey = Deno.env.get("EXTERNAL_API_KEY");

        if (!expectedKey) {
            return Response.json({ error: "API key not configured on server" }, { status: 500 });
        }

        if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
            return Response.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 });
        }

        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        const method = req.method;

        // --- GET: List all or single article ---
        if (method === "GET") {
            if (id) {
                const article = await base44.asServiceRole.entities.Article.get(id);
                if (!article) {
                    return Response.json({ error: "Article not found" }, { status: 404 });
                }
                return Response.json(article);
            } else {
                const articles = await base44.asServiceRole.entities.Article.list();
                return Response.json(articles);
            }
        }

        // --- POST: Create a new article (supports both JSON and multipart/form-data) ---
        if (method === "POST") {
            let body = {};
            let imageUrls = [];

            const contentType = req.headers.get("content-type") || "";

            if (contentType.includes("multipart/form-data")) {
                const formData = await req.formData();

                // Parse JSON fields from form
                for (const [key, value] of formData.entries()) {
                    if (key === "image" || key === "images") continue;
                    try { body[key] = JSON.parse(value); } catch { body[key] = value; }
                }

                // Upload image files via Base44 integrations
                const imageFiles = formData.getAll("images").concat(formData.getAll("image"));
                for (const file of imageFiles) {
                    if (file instanceof File) {
                        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
                        if (uploadResult?.file_url) imageUrls.push(uploadResult.file_url);
                    }
                }

                // Merge uploaded image urls with any provided image_urls
                const existingUrls = Array.isArray(body.image_urls) ? body.image_urls : [];
                body.image_urls = [...existingUrls, ...imageUrls];
            } else {
                body = await req.json();
            }

            // Endast verkligt obligatoriska fält
            const requiredFields = [
                "name", "storage_type", "sku", "category", "status",
                "unit_cost", "stock_qty", "reserved_stock_qty",
                "supplier_name", "supplier_product_code",
                "warehouse", "shelf_address", "batch_number",
                "series", "manufacturer", "product_version",
                "min_stock_level", "delivery_date"
            ];

            // Valfria fält – sätts till null/[] om de saknas
            const optionalDefaults = {
                pitch_value: "",
                pixel_pitch_mm: null,
                brightness_nits: null,
                dimensions_width_mm: null,
                dimensions_height_mm: null,
                dimensions_depth_mm: null,
                weight_g: null,
                manufacturing_date: null,
                customer_name: "",
                notes: "",
                repair_notes: "",
                repair_date: null,
                source_invoice_number: "",
                source_invoice_url: "",
                source_purchase_order_id: "",
                cfg_file_url: "",
                image_urls: []
            };

            const missingFields = requiredFields.filter(
                f => body[f] === undefined || body[f] === null || body[f] === ""
            );

            if (missingFields.length > 0) {
                return Response.json({
                    error: `Missing required fields: ${missingFields.join(", ")}`
                }, { status: 400 });
            }

            // Slå ihop valfria standardvärden med inskickad data
            const articleData = { ...optionalDefaults, ...body };
            const article = await base44.asServiceRole.entities.Article.create(articleData);
            return Response.json(article, { status: 201 });
        }

        // --- PUT: Update an existing article ---
        if (method === "PUT") {
            if (!id) {
                return Response.json({ error: "Missing required parameter: 'id'" }, { status: 400 });
            }

            const body = await req.json();
            const updated = await base44.asServiceRole.entities.Article.update(id, body);
            return Response.json(updated);
        }

        // --- DELETE: Remove an article ---
        if (method === "DELETE") {
            if (!id) {
                return Response.json({ error: "Missing required parameter: 'id'" }, { status: 400 });
            }

            await base44.asServiceRole.entities.Article.delete(id);
            return new Response(null, { status: 204 });
        }

        return Response.json({ error: "Method not allowed" }, { status: 405 });

    } catch (error) {
        console.error("articleApi error:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});