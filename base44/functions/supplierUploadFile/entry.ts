import { createClient } from 'npm:@base44/sdk@0.8.23';

const base44 = createClient({ appId: Deno.env.get("BASE44_APP_ID"), serviceRole: true });

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const token = formData.get('token');

    if (!file || !token) {
      return Response.json({ error: 'file and token are required' }, { status: 400 });
    }

    // Verify token exists
    const orders = await base44.entities.PurchaseOrder.filter({ supplier_portal_token: token });
    if (!orders || orders.length === 0) {
      return Response.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Upload using service role
    const result = await base44.integrations.Core.UploadFile({ file });

    return Response.json({ file_url: result.file_url });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});