import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function computePrefixPatterns(batchNumbers) {
  const prefixCounts = {};
  batchNumbers.forEach(bn => {
    if (!bn) return;
    // Extract prefix (letters/digits before first separator or first 4 chars)
    const match = bn.match(/^([A-Z]{1,6}[\-_]?)/);
    const prefix = match ? match[1] : bn.substring(0, 4);
    prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
  });
  return Object.entries(prefixCounts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([prefix]) => prefix);
}

function computeLengthDistribution(batchNumbers) {
  const dist = {};
  batchNumbers.forEach(bn => {
    if (!bn) return;
    const len = String(bn).length;
    dist[len] = (dist[len] || 0) + 1;
  });
  return dist;
}

function deriveRegex(prefixPatterns, lengthDist) {
  const lengths = Object.keys(lengthDist).map(Number);
  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);
  if (prefixPatterns.length > 0) {
    const escapedPrefixes = prefixPatterns.map(p => p.replace(/[-_]/g, '\\$&'));
    return `^(${escapedPrefixes.join('|')})[A-Z0-9]{${minLen},${maxLen}}$`;
  }
  return `^[A-Z0-9]{${minLen},${maxLen}}$`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // This is a scheduled job - use service role
    const suppliers = await base44.asServiceRole.entities.Supplier.filter({ is_active: true });
    const now = new Date().toISOString();
    let updated = 0;

    for (const supplier of suppliers) {
      const verifiedBatches = await base44.asServiceRole.entities.Batch.filter(
        { supplier_id: supplier.id, status: 'verified' }, '-created_date', 50
      );
      if (verifiedBatches.length < 3) continue;

      const batchNumbers = verifiedBatches.map(b => b.batch_number).filter(Boolean);
      const prefixPatterns = computePrefixPatterns(batchNumbers);
      const lengthDist = computeLengthDistribution(batchNumbers);
      const batchRegex = deriveRegex(prefixPatterns, lengthDist);

      // Upsert pattern
      const existing = await base44.asServiceRole.entities.SupplierLabelPattern.filter({ supplier_id: supplier.id });
      const patternData = {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        batch_prefix_patterns: prefixPatterns,
        batch_length_distribution: lengthDist,
        batch_regex: batchRegex,
        sample_count: batchNumbers.length,
        last_updated: now
      };

      if (existing.length > 0) {
        await base44.asServiceRole.entities.SupplierLabelPattern.update(existing[0].id, patternData);
      } else {
        await base44.asServiceRole.entities.SupplierLabelPattern.create(patternData);
      }
      updated++;
    }

    return Response.json({ success: true, suppliers_updated: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});