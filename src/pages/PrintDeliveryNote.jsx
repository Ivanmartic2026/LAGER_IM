import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function PrintDeliveryNote() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('id');

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      const res = await base44.functions.invoke('printDeliveryNote', { order_id: orderId });
      const html = res.data;
      document.open();
      document.write(html);
      document.close();
    })();
  }, [orderId]);

  if (!orderId) return <div style={{ padding: 40 }}>Ingen order angiven (saknar ?id=...)</div>;
  return <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#555' }}>Laddar leveranssedel...</div>;
}