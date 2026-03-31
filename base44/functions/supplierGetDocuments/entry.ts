import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Public endpoint - get/upload/delete documents for supplier portal
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, token } = body;

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    // Verify token
    const orders = await base44.asServiceRole.entities.PurchaseOrder.filter({ supplier_portal_token: token });
    const po = orders[0];
    if (!po) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    if (action === 'list') {
      const documents = await base44.asServiceRole.entities.ArticleDocument.filter({ purchase_order_id: po.id });
      return Response.json({ documents });
    }

    if (action === 'create') {
      const { document_type, document_phase, file_url, file_name } = body;
      const doc = await base44.asServiceRole.entities.ArticleDocument.create({
        purchase_order_id: po.id,
        document_type,
        document_phase: document_phase || 'production',
        file_url,
        file_name,
        uploaded_by_supplier: true,
        is_approved: false,
      });
      return Response.json({ document: doc });
    }

    if (action === 'delete') {
      const { document_id } = body;
      const docs = await base44.asServiceRole.entities.ArticleDocument.filter({ id: document_id, purchase_order_id: po.id });
      if (docs.length === 0) {
        return Response.json({ error: 'Document not found' }, { status: 404 });
      }
      await base44.asServiceRole.entities.ArticleDocument.delete(document_id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('supplierGetDocuments error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});