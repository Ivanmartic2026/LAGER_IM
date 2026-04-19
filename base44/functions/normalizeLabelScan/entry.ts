import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function normalizeBatchNumber(raw) {
  if (!raw) return null;
  return raw.toUpperCase().replace(/[^A-Z0-9\-]/g, '').trim();
}

function normalizeDate(val) {
  if (!val) return null;
  // Try to parse various date formats to YYYY-MM-DD
  const cleaned = String(val).trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  // DD/MM/YYYY or DD.MM.YYYY
  const dmy = cleaned.match(/^(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  // MM/DD/YYYY
  const mdy = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1]}-${mdy[2]}`;
  // YYYYMMDD
  const compact = cleaned.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  return cleaned;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { label_scan_id } = await req.json();
    if (!label_scan_id) return Response.json({ error: 'label_scan_id required' }, { status: 400 });

    const scan = await base44.asServiceRole.entities.LabelScan.filter({ id: label_scan_id });
    if (!scan || scan.length === 0) return Response.json({ error: 'LabelScan not found' }, { status: 404 });

    const s = scan[0];
    const fields = s.extracted_fields || {};

    const normalized = {
      batch_number: normalizeBatchNumber(fields.batch_number),
      article_sku: fields.article_sku ? fields.article_sku.toUpperCase().trim() : null,
      article_name: fields.article_name ? fields.article_name.trim() : null,
      supplier_name: fields.supplier_name ? fields.supplier_name.trim() : null,
      manufacturing_date: normalizeDate(fields.manufacturing_date),
      production_date: normalizeDate(fields.production_date),
      expiry_date: normalizeDate(fields.expiry_date),
      quantity: fields.quantity ? Number(fields.quantity) : null,
      series: fields.series ? fields.series.trim() : null,
      pixel_pitch: fields.pixel_pitch ? fields.pixel_pitch.trim() : null
    };

    await base44.asServiceRole.entities.LabelScan.update(s.id, { normalized_fields: normalized });

    return Response.json({ success: true, normalized_fields: normalized });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});