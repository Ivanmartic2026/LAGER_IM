import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const orders = await base44.asServiceRole.entities.Order.list('-updated_date', 100);
  const active = orders.filter(o => o.status !== 'cancelled' && o.status !== 'delivered');
  return Response.json({ orders: active });
});