import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const KIMI_API_URL = "https://api.moonshot.cn/v1/chat/completions";
const KIMI_API_KEY = Deno.env.get("KIMI_API_KEY");

const PROMPT_V1 = `You are a specialized OCR and label analysis system for warehouse management.
Analyze the provided label/product image and extract all information.
Return ONLY valid JSON (no markdown, no prose explanations) with this exact structure:
{
  "fields": {
    "batch_number": "string or null",
    "article_sku": "string or null",
    "article_name": "string or null",
    "supplier_name": "string or null",
    "manufacturing_date": "YYYY-MM-DD or null",
    "production_date": "YYYY-MM-DD or null",
    "expiry_date": "YYYY-MM-DD or null",
    "quantity": "number or null",
    "series": "string or null",
    "pixel_pitch": "string or null",
    "other_text": []
  },
  "confidence": {
    "batch_number": 0.0, "article_sku": 0.0, "article_name": 0.0,
    "supplier_name": 0.0, "manufacturing_date": 0.0, "overall": 0.0
  },
  "label_layout_description": "",
  "warnings": []
}`;

function normalizeBatchNumber(raw) {
  if (!raw) return null;
  return raw.toUpperCase().replace(/[^A-Z0-9\-]/g, '').trim();
}

async function analyzeOne(imageRef, config, base44, userEmail) {
  const { image_url, source_entity, source_id } = imageRef;

  // Create queued LabelScan
  const scan = await base44.asServiceRole.entities.LabelScan.create({
    image_url,
    image_uploaded_by: userEmail,
    image_uploaded_at: new Date().toISOString(),
    ai_provider: 'moonshot',
    ai_model_used: config.model_name || 'kimi-k2-5-vision',
    ai_prompt_version: 'v1',
    status: 'processing',
    context: 'reanalysis',
    context_reference_id: source_id
  });

  const startTime = Date.now();
  try {
    const resp = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KIMI_API_KEY}` },
      body: JSON.stringify({
        model: config.model_name || 'kimi-k2-5-vision',
        messages: [
          { role: 'system', content: PROMPT_V1 },
          { role: 'user', content: [{ type: 'image_url', image_url: { url: image_url } }, { type: 'text', text: 'Analyze and return JSON only.' }] }
        ],
        temperature: 0.0, max_tokens: 2000, response_format: { type: 'json_object' }
      })
    });

    if (!resp.ok) {
      await base44.asServiceRole.entities.LabelScan.update(scan.id, { status: 'failed', error_message: `HTTP ${resp.status}` });
      return { success: false, image_url, error: `HTTP ${resp.status}` };
    }

    const data = await resp.json();
    const duration = Date.now() - startTime;
    const rawContent = data.choices?.[0]?.message?.content;
    const tokens = data.usage?.total_tokens || 0;
    const cost = (tokens / 1000) * 0.0001;

    let parsed;
    try { parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent; }
    catch (e) {
      await base44.asServiceRole.entities.LabelScan.update(scan.id, { status: 'failed', error_message: 'Parse error' });
      return { success: false, image_url, error: 'Parse error' };
    }

    const overallConf = parsed.confidence?.overall || 0;
    const batchNumberRaw = parsed.fields?.batch_number;
    const batchNumberNorm = normalizeBatchNumber(batchNumberRaw);

    const normalized = {
      batch_number: batchNumberNorm,
      article_sku: parsed.fields?.article_sku?.toUpperCase().trim() || null,
      article_name: parsed.fields?.article_name?.trim() || null,
      supplier_name: parsed.fields?.supplier_name?.trim() || null
    };

    await base44.asServiceRole.entities.LabelScan.update(scan.id, {
      ai_raw_response: data,
      ai_processing_duration_ms: duration,
      ai_tokens_used: tokens,
      ai_cost_usd: cost,
      extracted_fields: parsed.fields || {},
      field_confidence: parsed.confidence || {},
      normalized_fields: normalized,
      status: 'completed'
    });

    // Upsert batch if we got a batch number
    let batchAction = 'no_batch_number';
    if (batchNumberNorm) {
      const existingBatches = await base44.asServiceRole.entities.Batch.filter({ batch_number: batchNumberNorm });
      if (existingBatches.length > 0) {
        const eb = existingBatches[0];
        if (overallConf > (eb.risk_score ? (100 - eb.risk_score) / 100 : 0)) {
          const updates = {};
          if (normalized.article_name) updates.article_name = normalized.article_name;
          if (normalized.supplier_name) updates.supplier_name = normalized.supplier_name;
          await base44.asServiceRole.entities.Batch.update(eb.id, updates);
          await base44.asServiceRole.entities.LabelScan.update(scan.id, { batch_id: eb.id });
          await base44.asServiceRole.entities.BatchActivity.create({
            batch_id: eb.id, type: 'reanalysis',
            message: `Batch uppdaterad från historisk omanalys (${source_entity})`,
            actor_email: 'system', actor_name: 'System',
            metadata: { label_scan_id: scan.id, source_entity, source_id }
          });
        }
        batchAction = 'merged';
      } else {
        const newBatch = await base44.asServiceRole.entities.Batch.create({
          batch_number: batchNumberNorm,
          raw_batch_number: batchNumberRaw,
          article_name: normalized.article_name,
          article_sku: normalized.article_sku,
          supplier_name: normalized.supplier_name,
          status: 'pending_verification', risk_score: Math.round((1 - overallConf) * 100)
        });
        await base44.asServiceRole.entities.LabelScan.update(scan.id, { batch_id: newBatch.id });
        batchAction = 'created';
      }
    }

    return { success: true, image_url, label_scan_id: scan.id, batch_action: batchAction, confidence: overallConf };

  } catch (err) {
    await base44.asServiceRole.entities.LabelScan.update(scan.id, { status: 'failed', error_message: err.message });
    return { success: false, image_url, error: err.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'lager') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { image_refs, batch_size = 10 } = await req.json();
    if (!image_refs || !Array.isArray(image_refs)) return Response.json({ error: 'image_refs array required' }, { status: 400 });

    let config = { model_name: 'kimi-k2-5-vision' };
    try {
      const configs = await base44.asServiceRole.entities.KimiConfig.filter({ is_active: true }, '-created_date', 1);
      if (configs.length > 0) config = configs[0];
    } catch (e) { /* use defaults */ }

    const results = { success: 0, failed: 0, new_batches: 0, merged_batches: 0, flagged: 0, errors: [] };
    const effectiveBatchSize = Math.min(batch_size, 10);

    // Process in batches of max 10 parallel
    for (let i = 0; i < image_refs.length; i += effectiveBatchSize) {
      const chunk = image_refs.slice(i, i + effectiveBatchSize);
      const chunkResults = await Promise.all(chunk.map(ref => analyzeOne(ref, config, base44, user.email)));

      chunkResults.forEach(r => {
        if (r.success) {
          results.success++;
          if (r.batch_action === 'created') results.new_batches++;
          if (r.batch_action === 'merged') results.merged_batches++;
          if (r.confidence < 0.6) results.flagged++;
        } else {
          results.failed++;
          results.errors.push({ image_url: r.image_url, error: r.error });
        }
      });
    }

    // Send notification on completion
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      for (const admin of admins.slice(0, 5)) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: admin.email,
          title: 'Bulk-omanalys klar',
          message: `${results.success} bilder analyserade, ${results.new_batches} nya batcher skapade, ${results.flagged} flaggade.`,
          type: 'bulk_reanalysis_complete',
          priority: 'normal',
          is_read: false
        });
      }
    } catch (e) { /* notifications optional */ }

    return Response.json({ success: true, processed: image_refs.length, results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});