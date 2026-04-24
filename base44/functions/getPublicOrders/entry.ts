import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  // Allow CORS for public access
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  const base44 = createClientFromRequest(req);

  const [orders, workOrders] = await Promise.all([
    base44.asServiceRole.entities.Order.list('-updated_date', 200),
    base44.asServiceRole.entities.WorkOrder.list('-updated_date', 500),
  ]);

  const active = orders
    .filter(o => o.status !== 'SÄLJ' && o.status !== 'cancelled' && o.status !== 'delivered');

  return new Response(JSON.stringify({ orders: active, workOrders }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
});