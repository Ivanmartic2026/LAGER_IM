import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const STATUS_MAP = {
    'ready_for_handover':   'SÄLJ',
    'handed_over':          'SÄLJ',
    'planning':             'SÄLJ',
    'construction':         'KONSTRUKTION',
    'ready_for_production': 'PRODUKTION',
    'in_production':        'PRODUKTION',
    'ready_for_warehouse':  'LAGER',
    'picking':              'LAGER',
    'ready_for_delivery':   'MONTERING',
    'shipped':              'MONTERING',
    'draft':                'SÄLJ',
  };

  const [orders, workOrders] = await Promise.all([
    base44.asServiceRole.entities.Order.list('-updated_date', 200),
    base44.asServiceRole.entities.WorkOrder.list('-updated_date', 500),
  ]);

  const active = orders
    .filter(o => o.status !== 'SÄLJ' && o.status !== 'cancelled' && o.status !== 'delivered')
    .map(o => ({
      ...o,
      status: STATUS_MAP[o.status] || o.status,
    }));

  return Response.json({ orders: active, workOrders });
});