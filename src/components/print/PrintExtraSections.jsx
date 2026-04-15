import { sectionTitle, BLUE, BORDER_COLOR } from './printStyles';

const fmtPrice = (n) => n != null ? Number(n).toLocaleString('sv-SE') + ' kr' : '—';
const fmtDate = (d) => d ? d.split('T')[0] : '—';

const PO_STATUS_LABELS = {
  draft: 'Utkast', sent: 'Skickad', confirmed: 'Bekräftad',
  in_production: 'I produktion', shipped: 'Skickad', received: 'Mottagen', cancelled: 'Avbokad',
};

// A) Screen Configuration
export function PrintScreenConfig({ workOrder }) {
  const wo = workOrder || {};
  const cols = wo.config_cols;
  const rows = wo.config_rows;
  if (!cols || !rows) return null;

  const cellSize = 22;
  const gap = 3;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={sectionTitle}>Skärmkonfiguration</div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Grid visualization */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gap: `${gap}px`,
            padding: 8,
            background: '#0f172a',
            borderRadius: 6,
            border: '1px solid #334155',
          }}>
            {Array.from({ length: rows * cols }).map((_, i) => (
              <div key={i} style={{
                width: cellSize,
                height: cellSize,
                background: '#1e293b',
                border: '1px solid #475569',
                borderRadius: 2,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 9, color: '#666', textAlign: 'center', marginTop: 4 }}>
            {cols} × {rows} moduler
          </div>
        </div>

        {/* Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', fontSize: 11 }}>
          {wo.screen_dimensions && (
            <div>
              <div style={{ fontSize: 9, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Skärmdimensioner</div>
              <div style={{ fontWeight: 700, color: '#111' }}>{wo.screen_dimensions}</div>
            </div>
          )}
          {(wo.product_name || wo.pixel_pitch) && (
            <div>
              <div style={{ fontSize: 9, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Produkt / Pixel Pitch</div>
              <div style={{ fontWeight: 700, color: '#111' }}>{[wo.product_name, wo.pixel_pitch].filter(Boolean).join(' — ')}</div>
            </div>
          )}
          {wo.module_count != null && (
            <div>
              <div style={{ fontSize: 9, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Antal moduler</div>
              <div style={{ fontWeight: 700, color: '#111' }}>{wo.module_count} st</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 9, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Layout</div>
            <div style={{ fontWeight: 700, color: '#111' }}>{cols} × {rows} moduler</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// B) Quote Items
export function PrintQuoteItems({ workOrder }) {
  const items = workOrder?.quote_items;
  if (!items || items.length === 0) return null;

  const total = items.reduce((sum, r) => sum + (r.total || 0), 0);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={sectionTitle}>Offertsammanställning</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr style={{ background: BLUE, color: '#fff' }}>
            <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>Beskrivning</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, width: 60 }}>Antal</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, width: 100 }}>À-pris</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, width: 100 }}>Summa</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: `1px solid ${BORDER_COLOR}` }}>
              <td style={{ padding: '4px 8px' }}>{row.description || '—'}</td>
              <td style={{ padding: '4px 8px', textAlign: 'right' }}>{row.quantity ?? '—'}</td>
              <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmtPrice(row.unit_price)}</td>
              <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmtPrice(row.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#1e293b', color: '#fff' }}>
            <td colSpan={3} style={{ padding: '5px 8px', fontWeight: 700, textAlign: 'right' }}>Totalt</td>
            <td style={{ padding: '5px 8px', fontWeight: 700, textAlign: 'right' }}>{fmtPrice(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// C) Order Items / Materialförteckning
export function PrintOrderItems({ orderItems }) {
  if (!orderItems || orderItems.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={sectionTitle}>Materialförteckning</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr style={{ background: BLUE, color: '#fff' }}>
            <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>Artikel</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, width: 70 }}>Antal</th>
            <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700, width: 120 }}>Hyllplats</th>
          </tr>
        </thead>
        <tbody>
          {orderItems.map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: `1px solid ${BORDER_COLOR}` }}>
              <td style={{ padding: '4px 8px' }}>{item.article_name || '—'}</td>
              <td style={{ padding: '4px 8px', textAlign: 'right' }}>{item.quantity_ordered ?? '—'}</td>
              <td style={{ padding: '4px 8px' }}>{item.shelf_address || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// D) Linked Purchase Orders
export function PrintLinkedPurchaseOrders({ purchaseOrders }) {
  if (!purchaseOrders || purchaseOrders.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={sectionTitle}>Inköpsordrar kopplade till denna order</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr style={{ background: BLUE, color: '#fff' }}>
            <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>PO-nummer</th>
            <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>Leverantör</th>
            <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>Status</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>Total</th>
            <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>Förväntat</th>
          </tr>
        </thead>
        <tbody>
          {purchaseOrders.map((po, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: `1px solid ${BORDER_COLOR}` }}>
              <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{po.po_number || '—'}</td>
              <td style={{ padding: '4px 8px' }}>{po.supplier_name || '—'}</td>
              <td style={{ padding: '4px 8px' }}>{PO_STATUS_LABELS[po.status] || po.status || '—'}</td>
              <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmtPrice(po.total_cost)}</td>
              <td style={{ padding: '4px 8px' }}>{fmtDate(po.expected_delivery_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}