import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 3px solid black; padding-bottom: 12px; }
  h1 { font-size: 22pt; font-weight: bold; }
  h2 { font-size: 13pt; font-weight: bold; border-bottom: 2px solid black; padding-bottom: 4px; margin-bottom: 10px; }
  .address-block { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; }
  .address-box { border: 1px solid #ccc; padding: 12px; border-radius: 4px; }
  .address-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin-bottom: 6px; }
  .address-content { font-size: 11pt; line-height: 1.6; }
  .delivery-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; border: 1px solid #ccc; padding: 12px; border-radius: 4px; background: #f9f9f9; }
  .info-label { font-size: 9pt; color: #555; }
  .info-value { font-size: 11pt; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #222; color: white; padding: 7px 10px; text-align: left; font-size: 10pt; }
  td { padding: 7px 10px; border-bottom: 1px solid #ddd; font-size: 10pt; }
  tr:nth-child(even) td { background: #f5f5f5; }
  .confirmation { margin-top: 20px; border: 2px solid black; padding: 16px; border-radius: 4px; }
  .confirmation h2 { border: none; margin-bottom: 6px; }
  .conf-text { font-style: italic; color: #444; margin-bottom: 16px; font-size: 10pt; }
  .sign-row { display: flex; gap: 40px; margin-bottom: 14px; }
  .sign-line { border-bottom: 1px solid black; min-width: 180px; display: inline-block; }
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 9pt; color: #555; display: flex; justify-content: space-between; }
  .print-btn { background: #1d4ed8; color: white; border: none; padding: 10px 24px; font-size: 14px; border-radius: 6px; cursor: pointer; margin: 16px; }
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

  if (!orderId) return <div style={{ padding: 40, background: 'white', color: 'black' }}>Ingen order angiven (saknar ?id=...)</div>;
  if (loading) return <div style={{ padding: 40, background: 'white', color: 'black' }}>Laddar...</div>;
  if (error) return <div style={{ padding: 40, background: 'white', color: 'red' }}>Fel: {error}</div>;
  if (!order) return <div style={{ padding: 40, background: 'white', color: 'black' }}>Data kunde inte laddas.</div>;

  const now = new Date();
  const totalItems = orderItems.reduce((s, i) => s + (i.quantity_ordered || 0), 0);

  return (
    <div style={{ backgroundColor: 'white', color: 'black', minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <button className="print-btn no-print" onClick={() => window.print()}>🖨️ Skriv ut</button>

      <div className="page">
        <div className="header">
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '18pt', letterSpacing: '0.05em' }}>IM VISION</div>
            <div style={{ fontSize: '9pt', color: '#555' }}>IM Vision Group AB</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1>LEVERANSSEDEL</h1>
            <div style={{ fontSize: '11pt', marginTop: 4 }}>Nr: {order.order_number || orderId?.slice(0, 8)}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '10pt' }}>
            <div>{format(now, 'd MMM yyyy', { locale: sv })}</div>
          </div>
        </div>

        <div className="address-block">
          <div className="address-box">
            <div className="address-label">Avsändare</div>
            <div className="address-content">
              <strong>IM Vision Group AB</strong><br />
              Göteborg, Sverige
            </div>
          </div>
          <div className="address-box">
            <div className="address-label">Mottagare</div>
            <div className="address-content">
              <strong>{order.customer_name}</strong><br />
              {order.delivery_address && <>{order.delivery_address}<br /></>}
              {order.delivery_contact_name && <>{order.delivery_contact_name}<br /></>}
              {order.delivery_contact_phone && <>{order.delivery_contact_phone}</>}
            </div>
          </div>
        </div>

        <div className="delivery-info section">
          {order.delivery_date && (
            <div><div className="info-label">Leveransdatum</div><div className="info-value">{format(new Date(order.delivery_date), 'd MMM yyyy', { locale: sv })}</div></div>
          )}
          {order.delivery_method && (
            <div><div className="info-label">Leveranssätt</div><div className="info-value">{deliveryMethodLabels[order.delivery_method] || order.delivery_method}</div></div>
          )}
          {order.shipping_company && (
            <div><div className="info-label">Speditör</div><div className="info-value">{order.shipping_company}</div></div>
          )}
          {order.tracking_number && (
            <div><div className="info-label">Spårningsnummer</div><div className="info-value" style={{ fontFamily: 'monospace' }}>{order.tracking_number}</div></div>
          )}
          {order.customer_reference && (
            <div><div className="info-label">Er referens</div><div className="info-value">{order.customer_reference}</div></div>
          )}
        </div>

        <div className="section" style={{ marginBottom: 16 }}>
          <h2>ARTIKLAR</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Artikel</th>
                <th style={{ width: 120 }}>Artikelnr</th>
                <th style={{ width: 80, textAlign: 'center' }}>Antal</th>
                <th style={{ width: 70, textAlign: 'center' }}>Enhet</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 16 }}>Inga artiklar</td></tr>
              ) : orderItems.map((item, i) => (
                <tr key={item.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{item.article_name || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '9pt' }}>{item.article_batch_number || '—'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity_ordered}</td>
                  <td style={{ textAlign: 'center' }}>st</td>
                </tr>
              ))}
              {orderItems.length > 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold', background: '#f0f0f0' }}>Totalt:</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', background: '#f0f0f0' }}>{totalItems}</td>
                  <td style={{ background: '#f0f0f0' }}>st</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="confirmation section">
          <h2>MOTTAGNINGSBEKRÄFTELSE</h2>
          <p className="conf-text">Ovanstående artiklar har mottagits i gott skick.</p>
          <div className="sign-row">
            <div>Mottaget av: <span className="sign-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
            <div>Datum: <span className="sign-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
          </div>
          <div>
            Signatur: <span className="sign-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
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