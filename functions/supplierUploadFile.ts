import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const formData = await req.formData();
    const file = formData.get('file');
    const token = formData.get('token');

    if (!file || !token) {
      return Response.json({ error: 'file and token are required' }, { status: 400 });
    }

    // Verify token exists
    const requests = await base44.asServiceRole.entities.SupplierDocumentRequest.filter({ request_token: token });
    if (!requests || requests.length === 0) {
      return Response.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Upload using service role
    const result = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    return Response.json({ file_url: result.file_url });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});