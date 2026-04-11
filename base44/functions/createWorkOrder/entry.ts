import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Called from automation (entity event) or directly
    const orderId = payload?.order_id || payload?.data?.id || payload?.event?.entity_id;
    if (!orderId) {
      return Response.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Fetch the order
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if a WorkOrder already exists for this order
    const existing = await base44.asServiceRole.entities.WorkOrder.filter({ order_id: orderId });
    if (existing && existing.length > 0) {
      console.log(`WorkOrder already exists for order ${orderId}`);
      return Response.json({ success: true, workOrder: existing[0], created: false });
    }

    // Map order priority to Swedish values
    const priorityMap = { 
      låg: 'låg', low: 'låg', 
      normal: 'normal', 
      hög: 'hög', high: 'hög', 
      brådskande: 'brådskande', urgent: 'brådskande' 
    };
    const priority = priorityMap[order.priority?.toLowerCase()] || 'normal';

    // Auto-generate order_number if missing (format: ORD-YYYY-NNN)
    let orderNumber = order.order_number;
    if (!orderNumber) {
      const year = new Date().getFullYear();
      const allWOs = await base44.asServiceRole.entities.WorkOrder.list();
      const count = (allWOs?.filter(wo => wo.order_number?.startsWith(`ORD-${year}`)) || []).length;
      orderNumber = `ORD-${year}-${String(count + 1).padStart(3, '0')}`;
    }

    // Fetch OrderItems and Articles to populate materials_needed
    const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ order_id: orderId });
    const articles = await base44.asServiceRole.entities.Article.list();
    
    const materialsNeeded = (orderItems || []).map(item => {
      const article = articles?.find(a => a.id === item.article_id);
      const inStock = article?.stock_qty || 0;
      const quantity = item.quantity_ordered || 0;
      const missing = Math.max(0, quantity - inStock);
      const shelfAddr = item.shelf_address || (article?.shelf_address?.[0] ?? '');
      return {
        article_id: item.article_id,
        article_name: item.article_name || article?.name || '',
        batch_number: item.article_batch_number || article?.batch_number || '',
        shelf_address: shelfAddr,
        quantity,
        in_stock: inStock,
        missing,
        needs_purchase: missing > 0
      };
    });

    // Create the WorkOrder with standardized Swedish values
    const workOrder = await base44.asServiceRole.entities.WorkOrder.create({
      order_id: orderId,
      order_number: orderNumber,
      // Customer & references
      customer_name: order.customer_name || '',
      customer_reference: order.customer_reference || '',
      fortnox_customer_number: order.fortnox_customer_number || null,
      fortnox_project_number: order.fortnox_project_number || null,
      fortnox_project_name: order.fortnox_project_name || null,
      rm_system_id: order.rm_system_id || null,
      rm_system_url: order.rm_system_url || null,
      // Delivery & installation
      delivery_date: order.delivery_date || null,
      delivery_address: order.delivery_address || null,
      delivery_method: order.delivery_method || null,
      delivery_contact_name: order.delivery_contact_name || null,
      delivery_contact_phone: order.delivery_contact_phone || null,
      installation_date: order.installation_date || null,
      installation_type: order.installation_type || null,
      // Technical specs
      screen_dimensions: order.screen_dimensions || null,
      pixel_pitch: order.pixel_pitch || null,
      module_count: order.module_count || null,
      // Notes & critical info
      critical_notes: order.critical_notes || null,
      notes: order.notes || null,
      production_notes: order.notes || '',
      // Sites
      site_ids: order.site_ids || [],
      site_names: order.site_names || [],
      site_visit_info: order.site_visit_info || null,
      // Source document
      source_document_url: order.source_document_url || null,
      // Files
      uploaded_files: order.uploaded_files || [],
      // Status
      current_stage: 'konstruktion',
      status: 'väntande',
      priority,
      materials_needed: materialsNeeded,
      all_materials_ready: materialsNeeded.length === 0 || materialsNeeded.every(m => !m.needs_purchase)
    });

    console.log(`WorkOrder created: ${workOrder.id} for order ${orderId} with auto-generated number: ${orderNumber}`);
    return Response.json({ success: true, workOrder, created: true });

  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});