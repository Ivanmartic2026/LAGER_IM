import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token, file_urls, notes } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find the request by token
    const requests = await base44.asServiceRole.entities.SupplierDocumentRequest.filter({ request_token: token });
    const request = requests[0];

    if (!request) {
      return Response.json({ error: 'Invalid token' }, { status: 404 });
    }

    // Update the request with uploaded documents
    await base44.asServiceRole.entities.SupplierDocumentRequest.update(request.id, {
      uploaded_documents: file_urls || [],
      upload_notes: notes || '',
      status: 'documents_uploaded'
    });

    return Response.json({
      success: true,
      message: 'Documents uploaded successfully'
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});