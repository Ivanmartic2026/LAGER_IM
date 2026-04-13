import { BLUE, INSTALLATION_TYPE_LABELS, PRIORITY_LABELS } from './printStyles';

export default function PrintHeader({ workOrder, order, pageLabel }) {
  const wo = workOrder || {};
  const o = order || {};
  const title = wo.name || `${o.customer_name || ''} ${o.order_number || ''}`.trim() || 'Arbetsorder';
  const instType = INSTALLATION_TYPE_LABELS[wo.installation_type || o.installation_type] || null;
  const prio = PRIORITY_LABELS[wo.priority] || null;
  const today = new Date().toLocaleDateString('sv-SE');

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            IM VISION GROUP AB
          </div>
          <div style={{ fontSize: 10, color: '#888', marginBottom: 6 }}>
            {pageLabel || 'INTERN ARBETSORDER'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{title}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {instType && (
              <span style={{ fontSize: 10, background: '#E8F0FE', color: BLUE, padding: '2px 8px', borderRadius: 3, fontWeight: 600 }}>
                {instType}
              </span>
            )}
            {prio && prio !== 'Normal' && (
              <span style={{
                fontSize: 10,
                background: prio === 'Brådskande' || prio === 'Hög' ? '#FEE2E2' : '#F3F4F6',
                color: prio === 'Brådskande' || prio === 'Hög' ? '#B91C1C' : '#555',
                padding: '2px 8px', borderRadius: 3, fontWeight: 600,
              }}>
                {prio}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 10, color: '#666', lineHeight: 1.8 }}>
          {(wo.fortnox_order_id || o.fortnox_order_id) && (
            <div><strong>Fortnox order:</strong> {wo.fortnox_order_id || o.fortnox_order_id}</div>
          )}
          {(wo.fortnox_project_number || o.fortnox_project_number) && (
            <div><strong>Fortnox proj:</strong> {wo.fortnox_project_number || o.fortnox_project_number}</div>
          )}
          {(wo.fortnox_customer_number || o.fortnox_customer_number) && (
            <div><strong>Kund-ID:</strong> {wo.fortnox_customer_number || o.fortnox_customer_number}</div>
          )}
          <div><strong>Genererad:</strong> {today}</div>
        </div>
      </div>
    </div>
  );
}