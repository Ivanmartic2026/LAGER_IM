import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Role mapping for known users
const USER_ROLE_MAP = {
  'ivan@imvision.se':              { role: 'ivan' },
  'imvisiongroupab@gmail.com':     { role: 'admin' },
  'mergim@imvision.se':            { role: 'admin', secondary_roles: ['ivan'] },
  'emil.norlin@imvision.se':       { role: 'admin' },
  'alexander.hansson@imvision.se': { role: 'tekniker', allowed_modules: ['SiteReports', 'Repairs', 'Inventory'] },
  'josefine@imvision.se':          { role: 'konstruktor', allowed_modules: ['Orders', 'WorkOrders', 'PurchaseOrders'] },
  'lino@imvision.se':              { role: 'lager', allowed_modules: ['Inventory', 'PurchaseOrders', 'UnknownDeliveries', 'Repairs'] },
  'vikash@spirehubs.com':          { role: 'produktion', allowed_modules: ['WorkOrders', 'Inventory'] }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const results = [];

    for (const u of users) {
      const mapping = USER_ROLE_MAP[u.email];
      if (mapping) {
        await base44.asServiceRole.entities.User.update(u.id, mapping);
        results.push({ email: u.email, ...mapping, status: 'updated' });
      } else {
        results.push({ email: u.email, status: 'skipped' });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});