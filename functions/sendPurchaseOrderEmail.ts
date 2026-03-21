import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchaseOrderId, supplierEmail } = await req.json();

    if (!purchaseOrderId || !supplierEmail) {
      return Response.json(
        { error: 'Missing purchaseOrderId or supplierEmail' },
        { status: 400 }
      );
    }

    const po = await base44.asServiceRole.entities.PurchaseOrder.get(purchaseOrderId);
    const items = await base44.asServiceRole.entities.PurchaseOrderItem.filter({
      purchase_order_id: purchaseOrderId
    });

    if (!po) {
      return Response.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    const supplierPortalUrl = `${Deno.env.get('APP_BASE_URL') || 'https://app.example.com'}/SupplierPOView?token=${po.supplier_portal_token}`;

    const itemsList = items
      .map(item => `- ${item.article_name}: ${item.quantity_ordered} st @ ${item.unit_price} ${po.invoice_currency}`)
      .join('\n');

    const emailBody = `Hej,

Vi har skickat en inköpsorder till er.

**Inköpsorder: ${po.po_number}**
Leverantör: ${po.supplier_name}
Beställningsdatum: ${po.order_date}
Typ av inköp: ${po.purchase_type}
Kostnad totalt: ${po.total_cost} ${po.invoice_currency}

**Orderrader:**
${itemsList}

Betalningsvillkor: ${po.payment_terms}
Leveranssätt: ${po.delivery_method}

**Nästa steg:**
Vänligen öppna följande länk för att:
1. Se fullständiga orderdetaljer
2. Ladda upp leveransdokument (följesedel, kvalitetsrapport etc.)
3. Ange batchnummer och produktionsdatum
4. Bekräfta leveranstid

${supplierPortalUrl}

Använd denna länk för att uppdatera oss om status på leveransen.

Med vänlig hälsning,
${user.full_name}`;

    const result = await base44.integrations.Core.SendEmail({
      to: supplierEmail,
      subject: `Inköpsorder: ${po.po_number}`,
      body: emailBody,
      from_name: 'IMvision Lager'
    });

    await base44.asServiceRole.entities.PurchaseOrder.update(purchaseOrderId, {
      status: 'sent',
      sent_date: new Date().toISOString()
    });

    return Response.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});