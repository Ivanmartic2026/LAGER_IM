import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { timingSafeEqual } from 'node:crypto';

/**
 * Timing-safe string comparison.
 * Returns false if lengths differ (without leaking length info via early return).
 */
function safeEqual(a: string, b: string): boolean {
  const aBuf = new TextEncoder().encode(a);
  const bBuf = new TextEncoder().encode(b);
  if (aBuf.length !== bBuf.length) {
    // Constant-time-ish: compare a against itself to avoid timing leaks, then return false
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * IM Flow Integration API
 * ------------------------
 * Exposes articles and article documents for external sync with the IM Flow
 * business system. All endpoints require a Bearer API key (EXTERNAL_API_KEY).
 *
 * Endpoints (all GET, action selected via ?action=):
 *   - action=articles          — list articles (paginated, optional modified_since)
 *   - action=article&id=...    — single article with embedded documents
 *   - action=documents         — list documents for an article (article_id=...)
 *   - action=document&id=...    — single document
 *   - action=health            — auth + connectivity check
 *
 * Pagination:
 *   - limit  (default 100, max 500)
 *   - offset (default 0)
 *
 * Modified-since filter:
 *   - modified_since=ISO8601 (compares Article.updated_date)
 *
 * Webhook:
 *   - articleWebhook function fires on Article create/update/delete if an
 *     entity automation is wired (POST to WEBHOOK_URL with Bearer WEBHOOK_TOKEN).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function mapArticle(a: any) {
  return {
    id: a.id,
    artikelnummer: a.sku || null,
    ean_kod: a.ean_code || null,
    produktnamn: a.name,
    modell: a.model || null,
    beskrivning: a.description || a.notes || null,
    tillverkare: a.manufacturer || null,
    kategori: a.category || null,
    serie: a.series || null,
    taggar: [a.category, a.series, a.storage_type].filter(Boolean),
    status: a.status,
    pixel_pitch_mm: a.pixel_pitch_mm ?? null,
    pitch_value: a.pitch_value || null,
    product_version: a.product_version || null,
    brightness_nits: a.brightness_nits ?? null,
    dimensions: {
      width_mm: a.dimensions_width_mm ?? null,
      height_mm: a.dimensions_height_mm ?? null,
      depth_mm: a.dimensions_depth_mm ?? null,
      weight_g: a.weight_g ?? null,
    },
    stock: {
      qty: a.stock_qty ?? 0,
      reserved: a.reserved_stock_qty ?? 0,
      min_level: a.min_stock_level ?? null,
      warehouse: a.warehouse || null,
      shelf_address: a.shelf_address || [],
    },
    supplier: {
      id: a.supplier_id || null,
      name: a.supplier_name || null,
      product_code: a.supplier_product_code || null,
    },
    unit_cost: a.unit_cost ?? null,
    image_urls: a.image_urls || [],
    cfg_file_url: a.cfg_file_url || null,
    created_date: a.created_date,
    updated_date: a.updated_date,
  };
}

function mapDocument(d: any) {
  return {
    id: d.id,
    article_id: d.article_id || null,
    purchase_order_id: d.purchase_order_id || null,
    document_type: d.document_type,
    document_phase: d.document_phase,
    filnamn: d.file_name || null,
    mime_type: d.mime_type || null,
    file_url: d.file_url,
    description: d.description || null,
    uploaded_by: d.uploaded_by || null,
    uploaded_by_supplier: d.uploaded_by_supplier ?? false,
    is_approved: d.is_approved ?? false,
    created_date: d.created_date,
    updated_date: d.updated_date,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get('Authorization');
    const expectedKey = Deno.env.get('EXTERNAL_API_KEY');

    if (!expectedKey) {
      return json({ error: 'EXTERNAL_API_KEY not configured on server' }, 500);
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized: missing Bearer token' }, 401);
    }
    const token = authHeader.slice('Bearer '.length);
    if (!token || !safeEqual(token, expectedKey)) {
      return json({ error: 'Unauthorized: invalid API key' }, 401);
    }

    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'articles';

    // --- Health ---
    if (action === 'health') {
      return json({
        status: 'ok',
        service: 'imFlowApi',
        timestamp: new Date().toISOString(),
        auth: 'valid',
      });
    }

    // --- List articles (paginated, optional modified_since) ---
    if (action === 'articles' && req.method === 'GET') {
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1), 500);
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
      const modifiedSince = url.searchParams.get('modified_since');

      // Fetch a generous batch sorted by updated_date desc (cap at 10000 for safety)
      const articles = await base44.asServiceRole.entities.Article.list('-updated_date', 10000);

      let filtered = articles;
      if (modifiedSince) {
        const since = new Date(modifiedSince);
        if (isNaN(since.getTime())) {
          return json({ error: 'Invalid modified_since. Use ISO 8601 (e.g. 2026-01-01T00:00:00Z).' }, 400);
        }
        filtered = articles.filter((a: any) => a.updated_date && new Date(a.updated_date) > since);
      }

      const total = filtered.length;
      const page = filtered.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return json({
        data: page.map(mapArticle),
        pagination: {
          total,
          limit,
          offset,
          has_more: hasMore,
          next_offset: hasMore ? offset + limit : null,
          modified_since: modifiedSince || null,
        },
      });
    }

    // --- Single article (with embedded documents) ---
    if (action === 'article' && req.method === 'GET') {
      const id = url.searchParams.get('id');
      if (!id) return json({ error: 'Missing id' }, 400);

      const article = await base44.asServiceRole.entities.Article.get(id);
      if (!article) return json({ error: 'Article not found' }, 404);

      const docs = await base44.asServiceRole.entities.ArticleDocument.filter({ article_id: id });
      return json({
        ...mapArticle(article),
        documents: docs.map(mapDocument),
      });
    }

    // --- List documents for an article ---
    if (action === 'documents' && req.method === 'GET') {
      const articleId = url.searchParams.get('article_id');
      if (!articleId) return json({ error: 'Missing article_id' }, 400);

      const docs = await base44.asServiceRole.entities.ArticleDocument.filter({ article_id: articleId });
      return json({
        article_id: articleId,
        data: docs.map(mapDocument),
        total: docs.length,
      });
    }

    // --- Single document ---
    if (action === 'document' && req.method === 'GET') {
      const id = url.searchParams.get('id');
      if (!id) return json({ error: 'Missing id' }, 400);

      const docs = await base44.asServiceRole.entities.ArticleDocument.filter({ id });
      if (docs.length === 0) return json({ error: 'Document not found' }, 404);
      return json(mapDocument(docs[0]));
    }

    return json({ error: 'Unknown action. Supported: articles, article, documents, document, health' }, 400);
  } catch (error) {
    console.error('imFlowApi error:', error.message);
    return json({ error: error.message }, 500);
  }
});