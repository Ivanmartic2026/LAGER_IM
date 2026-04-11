import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function PrintPickList() {
  const params = new URLSearchParams(window.location.search);
  const workOrderId = params.get('id');

  useEffect(() => {
    if (!workOrderId) return;
    (async () => {
      const res = await base44.functions.invoke('printPickList', { work_order_id: workOrderId });
      const html = res.data;
      document.open();
      document.write(html);
      document.close();
    })();
  }, [workOrderId]);

  if (!workOrderId) return <div style={{ padding: 40 }}>Ingen arbetsorder angiven (saknar ?id=...)</div>;
  return <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#555' }}>Laddar plocklista...</div>;
}