import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { name, category, supplier_name, batch_number } = await req.json();

    if (!name || !category) {
      return Response.json({ error: 'Name and category are required' }, { status: 400 });
    }

    // Category prefix mapping
    const categoryPrefixes = {
      'Cabinet': '10',
      'LED Module': '11',
      'Power Supply': '12',
      'Receiving Card': '13',
      'Control Processor': '14',
      'Computer': '20',
      'Cable': '70',
      'Accessory': '80',
      'Other': '90'
    };

    const prefix = categoryPrefixes[category] || '90';

    // Create a sanitized version of the name
    // Remove special characters, keep alphanumeric and spaces
    const sanitized = name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .toUpperCase();

    // Take first 3 words or significant parts
    const words = sanitized.split(/\s+/).filter(w => w.length > 0);
    const namePart = words
      .slice(0, 3)
      .map(w => w.substring(0, 4))
      .join('-');

    // Add last 4 digits from batch number if available
    let batchSuffix = '';
    if (batch_number && batch_number.length >= 4) {
      batchSuffix = `-${batch_number.slice(-4)}`;
    }
    
    // Get existing articles to check for duplicates
    const existingArticles = await base44.asServiceRole.entities.Article.list();
    
    let counter = 1;
    let proposedSku = `${prefix}-${namePart}${batchSuffix}`;
    
    // Check if SKU exists and increment counter if needed
    while (existingArticles.some(a => a.sku === proposedSku)) {
      proposedSku = `${prefix}-${namePart}${batchSuffix}-${counter.toString().padStart(2, '0')}`;
      counter++;
    }

    return Response.json({
      success: true,
      sku: proposedSku,
      breakdown: {
        prefix: prefix,
        category: category,
        namePart: namePart,
        counter: counter > 1 ? counter - 1 : null
      }
    });

  } catch (error) {
    console.error('Error generating SKU:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});