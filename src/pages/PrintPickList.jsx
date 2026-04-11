import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const SHARED_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f4f4f0 !important; color: #111 !important; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print {
    body { background: white !important; }
    .no-print { display: none !important; }
    .page { box-shadow: none !important; margin: 0 !important; }
    .section { page-break-inside: avoid; }
  }
  @page { size: A4 portrait; margin: 0; }

  .page { max-width: 210mm; margin: 0 auto; background: white; min-height: 297mm; display: flex; flex-direction: column; }

  .top-bar { background: #111; color: white; padding: 20px 28px; display: flex; justify-content: space-between; align-items: center; }
  .top-bar-logo { font-size: 20pt; font-weight: 900; letter-spacing: 0.12em; }
  .top-bar-sub { font-size: 8pt; color: rgba(255,255,255,0.5); letter-spacing: 0.06em; margin-top: 2px; }
  .top-bar-title { font-size: 18pt; font-weight: 700; letter-spacing: 0.04em; text-align: center; }
  .top-bar-meta { text-align: right; font-size: 9pt; color: rgba(255,255,255,0.7); line-height: 1.7; }
  .top-bar-meta strong { color: white; }

  .content { padding: 20px 28px; flex: 1; }

  .info-bar { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px; }
  .info-card { border: 1px solid #e0e0e0; border-radius: 5px; padding: 10px 14px; background: #fafaf9; }
  .info-label { font-size: 7.5pt; color: #999; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
  .info-value { font-size: 11pt; font-weight: 600; color: #111; }

  .section { margin-bottom: 14px; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; }
  .section-header { background: #f0f0ed; padding: 7px 14px; font-size: 8pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #444; border-bottom: 1px solid #e0e0e0; }

  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #111; }
  th { padding: 8px 10px; text-align: left; font-size: 8.5pt; font-weight: 600; letter-spacing: 0.04em; color: white; }
  td { padding: 7px 10px; border-bottom: 1px solid #ececec; font-size: 9.5pt; color: #222; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  .cb { font-size: 15pt; text-align: center; color: #bbb; }

  .summary-box { margin-top: 0; border-top: 2px solid #111; padding: 14px; background: #f9f9f7; }
  .summary-row { display: flex; gap: 40px; margin-bottom: 10px; font-size: 10pt; }
  .summary-row strong { font-weight: 700; }

  .sig-row { display: flex; gap: 32px; margin-top: 8px; }
  .sig-field { flex: 1; }
  .sig-label { font-size: 8pt; color: #888; margin-bottom: 2px; }
  .sig-line { border-bottom: 1px solid #333; display: block; width: 100%; margin-top: 22px; }

  .footer { padding: 10px 28px; border-top: 1px solid #e0e0e0; font-size: 8pt; color: #aaa; display: flex; justify-content: space-between; align-items: center; background: #fafafa; }

  .print-bar { background: #1d4ed8; padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
  .print-btn { background: white; color: #1d4ed8; border: none; padding: 8px 20px; font-size: 13px; font-weight: 600; border-radius: 5px; cursor: pointer; }
  .print-info { color: rgba(255,255,255,0.8); font-size: 11px; }
`;

export default function PrintPickList() {
  const [workOrder, setWorkOrder] = useState(null);
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const workOrderId = params.get('id');

  useEffect(() => {
    if (!workOrderId) { setLoading(false); return; }
    (async () => {
      try {
        const res = await base44.functions.invoke('getWorkOrderPrintData', { workOrderId });
        const data = res.data;
        if (!data || data.error) throw new Error(data?.error || 'Kunde inte hämta data');
        setWorkOrder(data.workOrder);
        setOrder(data.order);
        setOrderItems(data.orderItems || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [workOrderId]);

  if (!workOrderId) return <div style={{ padding: 40 }}>Ingen arbetsorder angiven (saknar ?id=...)</div>;
  if (loading) return <div style={{ padding: 40, background: 'white' }}>Laddar...</div>;
  if (error) return <div style={{ padding: 40, background: 'white', color: 'red' }}>Fel: {error}</div>;
  if (!workOrder || !order) return <div style={{ padding: 40, background: 'white' }}>Data kunde inte laddas.</div>;

  const materials = workOrder.materials_needed?.length > 0
    ? workOrder.materials_needed
    : orderItems.map(i => ({
        article_name: i.article_name,
        article_sku: i.article_batch_number,
        shelf_address: i.shelf_address,
        quantity_needed: i.quantity_ordered,
      }));

  const sorted = [...materials].sort((a, b) => {
    const sa = Array.isArray(a.shelf_address) ? a.shelf_address[0] : (a.shelf_address || '');
    const sb = Array.isArray(b.shelf_address) ? b.shelf_address[0] : (b.shelf_address || '');
    return sa.localeCompare(sb);
  });

  const totalItems = sorted.reduce((s, m) => s + (m.quantity_needed || 0), 0);
  const now = new Date();

  return (
    <div style={{ backgroundColor: '#f4f4f0', minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: SHARED_CSS }} />

      <div className="no-print print-bar">
        <button className="print-btn" onClick={() => window.print()}>🖨️ Skriv ut</button>
        <span className="print-info">PLOCKLISTA — {order.customer_name} · {order.order_number || '—'}</span>
      </div>

      <div className="page">
        <div className="top-bar">
          <div>
            <div className="top-bar-logo">IM VISION</div>
            <div className="top-bar-sub">IM Vision Group AB</div>
          </div>
          <div className="top-bar-title">PLOCKLISTA</div>
          <div className="top-bar-meta">
            <div><strong>{order.order_number || '—'}</strong></div>
            <div>{order.customer_name}</div>
            <div>{format(now, 'd MMM yyyy', { locale: sv })}</div>
          </div>
        </div>

        <div className="content">
          <div className="info-bar">
            <div className="info-card">
              <div className="info-label">Kund</div>
              <div className="info-value">{order.customer_name || '—'}</div>
            </div>
            <div className="info-card">
              <div className="info-label">Ordernummer</div>
              <div className="info-value">{order.order_number || '—'}</div>
            </div>
            <div className="info-card">
              <div className="info-label">Leveransdatum</div>
              <div className="info-value">{order.delivery_date ? format(new Date(order.delivery_date), 'd MMM yyyy', { locale: sv }) : '—'}</div>
            </div>
          </div>

          <div className="section">
            <div className="section-header">Artiklar att plocka — sorterat på hyllplats</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 32 }}>#</th>
                  <th>Artikel</th>
                  <th style={{ width: 110 }}>Artikelnr</th>
                  <th style={{ width: 110 }}>Hyllplats</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Antal</th>
                  <th style={{ width: 50, textAlign: 'center' }}>☐</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa', padding: 24 }}>Inga artiklar registrerade</td></tr>
                ) : sorted.map((m, i) => (
                  <tr key={i}>
                    <td style={{ color: '#999' }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{m.article_name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '8.5pt', color: '#555' }}>{m.article_sku || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{Array.isArray(m.shelf_address) ? m.shelf_address.join(', ') : (m.shelf_address || '—')}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '12pt' }}>{m.quantity_needed || 0}</td>
                    <td className="cb">☐</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="summary-box">
              <div className="summary-row">
                <div>Totalt antal artiklar: <strong>{totalItems} st</strong></div>
                <div>Antal rader: <strong>{sorted.length}</strong></div>
              </div>
              <div style={{ marginBottom: 8, fontSize: '9.5pt', color: '#555' }}>
                Plockanteckningar: <span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: 260 }}>&nbsp;</span>
              </div>
              <div className="sig-row">
                <div className="sig-field">
                  <div className="sig-label">Plockad av</div>
                  <span className="sig-line" />
                </div>
                <div className="sig-field" style={{ maxWidth: 140 }}>
                  <div className="sig-label">Datum</div>
                  <span className="sig-line" />
                </div>
              </div>
            </div>
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