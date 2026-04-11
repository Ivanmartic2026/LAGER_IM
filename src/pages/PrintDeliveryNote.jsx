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

  .address-block { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .address-card { border: 1px solid #e0e0e0; border-radius: 5px; padding: 12px 14px; }
  .address-label { font-size: 7.5pt; color: #999; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px; }
  .address-content { font-size: 10.5pt; line-height: 1.7; color: #111; }

  .section { margin-bottom: 14px; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; }
  .section-header { background: #f0f0ed; padding: 7px 14px; font-size: 8pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #444; border-bottom: 1px solid #e0e0e0; }
  .section-body { padding: 12px 14px; }

  .delivery-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
  .field { margin-bottom: 0; }
  .field-label { font-size: 7.5pt; color: #999; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
  .field-value { font-size: 10.5pt; font-weight: 500; color: #111; }

  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #111; }
  th { padding: 8px 10px; text-align: left; font-size: 8.5pt; font-weight: 600; letter-spacing: 0.04em; color: white; }
  td { padding: 7px 10px; border-bottom: 1px solid #ececec; font-size: 9.5pt; color: #222; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  .total-row td { background: #f0f0ed !important; font-weight: 700; border-top: 2px solid #ddd; }

  .confirmation-box { margin-top: 0; border-top: 2px solid #111; padding: 16px 14px; background: #f9f9f7; }
  .conf-text { font-size: 9.5pt; color: #555; font-style: italic; margin-bottom: 16px; }
  .sig-row { display: flex; gap: 32px; margin-bottom: 14px; }
  .sig-field { flex: 1; }
  .sig-label { font-size: 8pt; color: #888; margin-bottom: 2px; }
  .sig-line { border-bottom: 1px solid #333; display: block; width: 100%; margin-top: 22px; }

  .footer { padding: 10px 28px; border-top: 1px solid #e0e0e0; font-size: 8pt; color: #aaa; display: flex; justify-content: space-between; align-items: center; background: #fafafa; }

  .print-bar { background: #1d4ed8; padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
  .print-btn { background: white; color: #1d4ed8; border: none; padding: 8px 20px; font-size: 13px; font-weight: 600; border-radius: 5px; cursor: pointer; }
  .print-info { color: rgba(255,255,255,0.8); font-size: 11px; }
`;

const deliveryMethodLabels = {
  truck: 'Lastbil', courier: 'Budkurir', pickup: 'Hämtas',
  air_freight: 'Flygfrakt', sea_freight: 'Sjöfrakt', other: 'Annat',
};

export default function PrintDeliveryNote() {
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('id');

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    (async () => {
      try {
        const [orderList, items] = await Promise.all([
          base44.entities.Order.filter({ id: orderId }),
          base44.entities.OrderItem.filter({ order_id: orderId }),
        ]);
        if (!orderList[0]) throw new Error('Order hittades inte');
        setOrder(orderList[0]);
        setOrderItems(items || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (!orderId) return <div style={{ padding: 40 }}>Ingen order angiven (saknar ?id=...)</div>;
  if (loading) return <div style={{ padding: 40, background: 'white' }}>Laddar...</div>;
  if (error) return <div style={{ padding: 40, background: 'white', color: 'red' }}>Fel: {error}</div>;
  if (!order) return <div style={{ padding: 40, background: 'white' }}>Data kunde inte laddas.</div>;

  const now = new Date();
  const totalItems = orderItems.reduce((s, i) => s + (i.quantity_ordered || 0), 0);

  return (
    <div style={{ backgroundColor: '#f4f4f0', minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: SHARED_CSS }} />

      <div className="no-print print-bar">
        <button className="print-btn" onClick={() => window.print()}>🖨️ Skriv ut</button>
        <span className="print-info">LEVERANSSEDEL — {order.customer_name} · {order.order_number || '—'}</span>
      </div>

      <div className="page">
        <div className="top-bar">
          <div>
            <div className="top-bar-logo">IM VISION</div>
            <div className="top-bar-sub">IM Vision Group AB</div>
          </div>
          <div className="top-bar-title">LEVERANSSEDEL</div>
          <div className="top-bar-meta">
            <div><strong>Nr: {order.order_number || orderId?.slice(0, 8)}</strong></div>
            <div>{format(now, 'd MMM yyyy', { locale: sv })}</div>
          </div>
        </div>

        <div className="content">
          {/* Addresses */}
          <div className="address-block">
            <div className="address-card">
              <div className="address-label">Avsändare</div>
              <div className="address-content">
                <strong>IM Vision Group AB</strong><br />
                Göteborg, Sverige
              </div>
            </div>
            <div className="address-card">
              <div className="address-label">Mottagare</div>
              <div className="address-content">
                <strong>{order.customer_name}</strong><br />
                {order.delivery_address && <>{order.delivery_address}<br /></>}
                {order.delivery_contact_name && <>{order.delivery_contact_name}<br /></>}
                {order.delivery_contact_phone && <>{order.delivery_contact_phone}</>}
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          {(order.delivery_date || order.delivery_method || order.shipping_company || order.tracking_number || order.customer_reference) && (
            <div className="section">
              <div className="section-header">Leveransinformation</div>
              <div className="section-body">
                <div className="delivery-info">
                  {order.delivery_date && <div className="field"><div className="field-label">Leveransdatum</div><div className="field-value">{format(new Date(order.delivery_date), 'd MMM yyyy', { locale: sv })}</div></div>}
                  {order.delivery_method && <div className="field"><div className="field-label">Leveranssätt</div><div className="field-value">{deliveryMethodLabels[order.delivery_method] || order.delivery_method}</div></div>}
                  {order.shipping_company && <div className="field"><div className="field-label">Speditör</div><div className="field-value">{order.shipping_company}</div></div>}
                  {order.tracking_number && <div className="field"><div className="field-label">Spårningsnummer</div><div className="field-value" style={{ fontFamily: 'monospace' }}>{order.tracking_number}</div></div>}
                  {order.customer_reference && <div className="field"><div className="field-label">Er referens</div><div className="field-value">{order.customer_reference}</div></div>}
                </div>
              </div>
            </div>
          )}

          {/* Articles */}
          <div className="section">
            <div className="section-header">Artiklar</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 32 }}>#</th>
                  <th>Artikel</th>
                  <th style={{ width: 120 }}>Artikelnr</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Antal</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Enhet</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#aaa', padding: 24 }}>Inga artiklar</td></tr>
                ) : orderItems.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color: '#999' }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{item.article_name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '8.5pt', color: '#555' }}>{item.article_batch_number || '—'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.quantity_ordered}</td>
                    <td style={{ textAlign: 'center', color: '#777' }}>st</td>
                  </tr>
                ))}
                {orderItems.length > 0 && (
                  <tr className="total-row">
                    <td colSpan={3} style={{ textAlign: 'right', paddingRight: 16 }}>Totalt:</td>
                    <td style={{ textAlign: 'center' }}>{totalItems}</td>
                    <td style={{ textAlign: 'center' }}>st</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="confirmation-box">
              <div className="conf-text">Ovanstående artiklar har mottagits i gott skick och utan synliga transportskador.</div>
              <div className="sig-row">
                <div className="sig-field">
                  <div className="sig-label">Mottaget av (namnförtydligande)</div>
                  <span className="sig-line" />
                </div>
                <div className="sig-field" style={{ maxWidth: 140 }}>
                  <div className="sig-label">Datum</div>
                  <span className="sig-line" />
                </div>
              </div>
              <div className="sig-field">
                <div className="sig-label">Signatur</div>
                <span className="sig-line" style={{ marginTop: 28 }} />
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