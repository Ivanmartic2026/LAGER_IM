import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: white !important; color: black !important; font-family: system-ui, sans-serif; font-size: 11pt; }
  @media print {
    body { background: white !important; }
    .no-print { display: none !important; }
    nav, header, .fixed, [data-radix-popper-content-wrapper] { display: none !important; }
    .section { page-break-inside: avoid; }
  }
  @page { size: A4 portrait; margin: 15mm; }
  .page { max-width: 210mm; margin: 0 auto; padding: 10mm; background: white; color: black; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 3px solid black; padding-bottom: 12px; }
  h1 { font-size: 22pt; font-weight: bold; }
  h2 { font-size: 13pt; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #222; color: white; padding: 8px 10px; text-align: left; font-size: 11pt; }
  td { padding: 8px 10px; border-bottom: 1px solid #ccc; font-size: 11pt; }
  tr:nth-child(even) td { background: #f5f5f5; }
  .checkbox-cell { font-size: 18pt; text-align: center; }
  .summary { margin-top: 16px; border: 1px solid #ccc; padding: 12px; border-radius: 4px; }
  .sign-row { display: flex; gap: 40px; margin-top: 12px; }
  .sign-line { border-bottom: 1px solid black; min-width: 160px; display: inline-block; }
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 9pt; color: #555; display: flex; justify-content: space-between; }
  .print-btn { background: #1d4ed8; color: white; border: none; padding: 10px 24px; font-size: 14px; border-radius: 6px; cursor: pointer; margin: 16px; }
`;

export default function PrintPickList() {
  const params = new URLSearchParams(window.location.search);
  const workOrderId = params.get('id');

  const { data: workOrder } = useQuery({
    queryKey: ['wo-picklist', workOrderId],
    queryFn: async () => {
      const list = await base44.entities.WorkOrder.filter({ id: workOrderId });
      return list[0] || null;
    },
    enabled: !!workOrderId
  });

  const { data: order } = useQuery({
    queryKey: ['order-picklist', workOrder?.order_id],
    queryFn: async () => {
      const list = await base44.entities.Order.filter({ id: workOrder.order_id });
      return list[0] || null;
    },
    enabled: !!workOrder?.order_id
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['oi-picklist', workOrder?.order_id],
    queryFn: () => base44.entities.OrderItem.filter({ order_id: workOrder.order_id }),
    enabled: !!workOrder?.order_id
  });

  if (!workOrder || !order) {
    return <div style={{ padding: 40 }}>Laddar...</div>;
  }

  const materials = workOrder.materials_needed?.length > 0
    ? workOrder.materials_needed
    : orderItems.map(i => ({
        article_name: i.article_name,
        article_sku: i.article_batch_number,
        shelf_address: i.shelf_address,
        quantity_needed: i.quantity_ordered,
      }));

  // Sort by shelf address A→Z
  const sorted = [...materials].sort((a, b) => {
    const sa = Array.isArray(a.shelf_address) ? a.shelf_address[0] : (a.shelf_address || '');
    const sb = Array.isArray(b.shelf_address) ? b.shelf_address[0] : (b.shelf_address || '');
    return sa.localeCompare(sb);
  });

  const totalItems = sorted.reduce((s, m) => s + (m.quantity_needed || 0), 0);
  const now = new Date();

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <button className="print-btn no-print" onClick={() => window.print()}>🖨️ Skriv ut</button>

      <div className="page">
        <div className="header">
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '18pt', letterSpacing: '0.05em' }}>IM VISION</div>
            <div style={{ fontSize: '9pt', color: '#555' }}>IM Vision Group AB</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1>PLOCKLISTA</h1>
          </div>
          <div style={{ textAlign: 'right', fontSize: '10pt' }}>
            <div><strong>{order.order_number || '—'}</strong></div>
            <div>{order.customer_name}</div>
            <div>{format(now, 'd MMM yyyy', { locale: sv })}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Artikel</th>
              <th style={{ width: 110 }}>Artikelnr</th>
              <th style={{ width: 110 }}>Hyllplats</th>
              <th style={{ width: 70, textAlign: 'center' }}>Antal</th>
              <th style={{ width: 60, textAlign: 'center' }}>☐</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 20 }}>Inga artiklar</td></tr>
            ) : sorted.map((m, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{m.article_name || '—'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '9pt' }}>{m.article_sku || '—'}</td>
                <td style={{ fontWeight: 'bold' }}>{Array.isArray(m.shelf_address) ? m.shelf_address.join(', ') : (m.shelf_address || '—')}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13pt' }}>{m.quantity_needed || 0}</td>
                <td className="checkbox-cell">☐</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="summary section">
          <div style={{ display: 'flex', gap: 40, marginBottom: 12 }}>
            <div><strong>Totalt antal artiklar:</strong> {totalItems} st</div>
            <div><strong>Totalt antal rader:</strong> {sorted.length}</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            Plockanteckningar: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: 300 }}>&nbsp;</span>
          </div>
          <div className="sign-row">
            <div>Plockad av: <span className="sign-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
            <div>Datum: <span className="sign-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
          </div>
        </div>

        <div className="footer">
          <span>IM Vision Group AB</span>
          <span>Utskriven: {format(now, 'd MMM yyyy HH:mm', { locale: sv })}</span>
          <span>Sida 1 av 1</span>
        </div>
      </div>
    </div>
  );
}