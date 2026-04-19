import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createHash } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { image_url, image_urls, context, context_reference_id, user_email } = body;

    const fileUrls = image_urls || (image_url ? [image_url] : []);
    if (fileUrls.length === 0) {
      return Response.json({ error: 'No images provided' }, { status: 400 });
    }

    const validContexts = [
      'purchase_receiving',
      'article_creation',
      'repair_return',
      'site_report',
      'production',
      'manual_scan',
      'reanalysis'
    ];
    if (!context || !validContexts.includes(context)) {
      return Response.json({ error: `Invalid context. Must be one of: ${validContexts.join(', ')}` }, { status: 400 });
    }

    // 1. Compute image hash + dedupe check
    const firstUrl = fileUrls[0];
    const imgResp = await fetch(firstUrl);
    const imgBuffer = await imgResp.arrayBuffer();
    const imgHash = createHash('sha256').update(new Uint8Array(imgBuffer)).digest('hex');

    // Check for existing scan with same hash, < 7 days old
    const existingScans = await base44.asServiceRole.entities.LabelScan.filter({
      image_hash: imgHash
    }, '-created_date', 1);

    if (existingScans.length > 0) {
      const existingScan = existingScans[0];
      const daysSinceCreated = (Date.now() - new Date(existingScan.created_date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) {
        return Response.json({
          batch_id: existingScan.batch_id,
          article_id: existingScan.match_results?.article_match_id,
          label_scan_id: existingScan.id,
          match_type: 'dedupe_cached',
          risk_score: existingScan.match_results?.risk_score || 0,
          message: 'Denna bild analyserades redan för 7 dagar sedan'
        });
      }
    }

    // 2. Call analyzeLabelWithKimi (existing action)
    let analysis;
    try {
      const analysisResp = await base44.asServiceRole.functions.invoke('analyzeLabelWithKimi', {
        fileUrls
      });
      analysis = analysisResp.data;
    } catch (e) {
      return Response.json({ error: `AI analysis failed: ${e.message}` }, { status: 500 });
    }

    const extracted = analysis?.extracted_fields || {};

    // 3. MATCH FIRST — article matching
    let article = null;
    let matchType = null;

    // 3a. Exact SKU match
    if (extracted.article_sku) {
      const matches = await base44.asServiceRole.entities.Article.filter({
        sku: extracted.article_sku
      }, '-updated_date', 10);
      if (matches.length > 0) {
        article = matches[0];
        matchType = 'sku_exact';
      }
    }

    // 3b. Fuzzy name match (if no SKU match)
    if (!article && extracted.article_name) {
      const allArticles = await base44.asServiceRole.entities.Article.list('-updated_date', 100);
      const normalizedExtracted = extracted.article_name.toLowerCase().trim();
      for (const a of allArticles) {
        const normalizedArticle = (a.name || '').toLowerCase().trim();
        if (levenshteinDistance(normalizedExtracted, normalizedArticle) < 4) {
          article = a;
          matchType = 'name_fuzzy';
          break;
        }
      }
    }

    // 4. BATCH matching/creation
    let batch = null;

    if (article) {
      // 4c. Search for batch with (article_id + batch_number)
      if (extracted.batch_number) {
        const normalizedBatchNum = normalizeBatchNumber(extracted.batch_number);
        const batchMatches = await base44.asServiceRole.entities.Batch.filter({
          article_id: article.id,
          batch_number: normalizedBatchNum
        }, '-updated_date', 1);

        if (batchMatches.length > 0) {
          batch = batchMatches[0];
          // 4d. Batch exists — update scan reference, return
          // (Link happens in step 7 below)
        } else {
          // 4e. Batch not found — create new batch
          batch = await base44.asServiceRole.entities.Batch.create({
            article_id: article.id,
            batch_number: normalizedBatchNum,
            raw_batch_number: extracted.batch_number,
            article_sku: article.sku,
            article_name: article.name,
            status: 'pending_verification',
            source_context: context
          });
        }
      }
    } else {
      // 4f. Article not found — create new article
      article = await base44.asServiceRole.entities.Article.create({
        name: extracted.article_name || `Auto-created from label ${Date.now()}`,
        sku: extracted.article_sku || '',
        storage_type: 'company_owned',
        ai_extracted_data: extracted,
        ai_confidence_scores: analysis?.field_confidence || {}
      });

      // Create batch for new article
      if (extracted.batch_number) {
        const normalizedBatchNum = normalizeBatchNumber(extracted.batch_number);
        batch = await base44.asServiceRole.entities.Batch.create({
          article_id: article.id,
          batch_number: normalizedBatchNum,
          raw_batch_number: extracted.batch_number,
          article_sku: article.sku,
          article_name: article.name,
          status: 'pending_verification',
          source_context: context
        });
      }
      matchType = 'created_new_article_and_batch';
    }

    // 5. Create LabelScan record
    const labelScan = await base44.asServiceRole.entities.LabelScan.create({
      batch_id: batch?.id || null,
      image_url: firstUrl,
      image_hash: imgHash,
      image_uploaded_by: user.email,
      image_uploaded_at: new Date().toISOString(),
      ai_provider: 'moonshot',
      ai_model_used: analysis?.model_used || 'kimi-k2.5',
      extracted_fields: extracted,
      field_confidence: analysis?.field_confidence || {},
      match_results: {
        article_match_id: article?.id,
        article_match_confidence: 0.95
      },
      status: 'completed',
      context,
      context_reference_id
    });

    // 6. Risk scoring (call existing action)
    let riskScore = 0;
    try {
      if (batch) {
        const riskResp = await base44.asServiceRole.functions.invoke('calculateRiskScore', {
          batch_id: batch.id
        });
        riskScore = riskResp?.data?.risk_score || 0;
      }
    } catch (e) {
      console.log('Risk scoring failed:', e.message);
    }

    // 7. Context-specific linking
    if (context === 'purchase_receiving' && context_reference_id) {
      const poItem = await base44.asServiceRole.entities.PurchaseOrderItem.get(context_reference_id);
      if (poItem && batch) {
        // Add to supplier_batch_numbers
        const existing = poItem.supplier_batch_numbers || [];
        if (!existing.some(b => b.batch_id === batch.id)) {
          existing.push({
            batch_number: batch.batch_number,
            batch_id: batch.id,
            label_scan_id: labelScan.id,
            quantity: poItem.quantity_ordered,
            production_date: batch.production_date
          });
          await base44.asServiceRole.entities.PurchaseOrderItem.update(context_reference_id, {
            supplier_batch_numbers: existing
          });
        }

        // Update ReceivingRecord if linked
        const receivingRecords = await base44.asServiceRole.entities.ReceivingRecord.filter({
          purchase_order_item_id: context_reference_id
        }, '-updated_date', 1);
        if (receivingRecords.length > 0) {
          const rec = receivingRecords[0];
          const batchIds = rec.batch_ids || [];
          const scanIds = rec.ai_scan_ids || [];
          if (!batchIds.includes(batch.id)) batchIds.push(batch.id);
          if (!scanIds.includes(labelScan.id)) scanIds.push(labelScan.id);
          await base44.asServiceRole.entities.ReceivingRecord.update(rec.id, {
            batch_ids: batchIds,
            ai_scan_ids: scanIds
          });
        }
      }
    }

    if (context === 'repair_return' && context_reference_id) {
      const repairLog = await base44.asServiceRole.entities.RepairLog.get(context_reference_id);
      if (repairLog && batch) {
        await base44.asServiceRole.entities.RepairLog.update(context_reference_id, {
          batch_id: batch.id,
          label_scan_id: labelScan.id
        });
      }
    }

    if (context === 'site_report' && context_reference_id) {
      const siteReport = await base44.asServiceRole.entities.SiteReport.get(context_reference_id);
      if (siteReport && batch) {
        const batchIds = siteReport.batch_ids || [];
        if (!batchIds.includes(batch.id)) batchIds.push(batch.id);
        await base44.asServiceRole.entities.SiteReport.update(context_reference_id, {
          batch_ids: batchIds
        });
        // Also find matching SiteReportImage if image_url matches
        const images = await base44.asServiceRole.entities.SiteReportImage.filter({
          site_report_id: context_reference_id,
          image_url: firstUrl
        }, '-updated_date', 1);
        if (images.length > 0) {
          await base44.asServiceRole.entities.SiteReportImage.update(images[0].id, {
            batch_id: batch.id,
            label_scan_id: labelScan.id
          });
        }
      }
    }

    if (context === 'production' && context_reference_id) {
      const prodRecord = await base44.asServiceRole.entities.ProductionRecord.get(context_reference_id);
      if (prodRecord && batch) {
        const scanIds = prodRecord.label_scan_ids || [];
        if (!scanIds.includes(labelScan.id)) scanIds.push(labelScan.id);
        await base44.asServiceRole.entities.ProductionRecord.update(context_reference_id, {
          batch_id: batch.id,
          label_scan_ids: scanIds
        });
      }
    }

    return Response.json({
      success: true,
      batch_id: batch?.id || null,
      article_id: article?.id || null,
      label_scan_id: labelScan.id,
      match_type: matchType || 'batch_found',
      risk_score: riskScore,
      needs_verification: !batch || batch.status === 'pending_verification'
    });

  } catch (error) {
    console.error('scanAndProcess error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Utility: Levenshtein distance for fuzzy matching
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Utility: Normalize batch number
function normalizeBatchNumber(raw) {
  return (raw || '').toUpperCase().replace(/\s+/g, '').trim();
}