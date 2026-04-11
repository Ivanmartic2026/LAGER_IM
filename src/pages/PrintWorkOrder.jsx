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
    nav, header, footer.app-footer, .fixed, [data-radix-popper-content-wrapper] { display: none !important; }
    .section { page-break-inside: avoid; }
  }
  @page { size: A4 portrait; margin: 15mm; }
  .page { max-width: 210mm; margin: 0 auto; padding: 10mm; background: white; color: black; }
  h1 { font-size: 22pt; font-weight: bold; }
  h2 { font-size: 14pt; font-weight: bold; border-bottom: 2px solid black; padding-bottom: 4px; margin-bottom: 10px; }
  h3 { font-size: 12pt; font-weight: bold; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 3px solid black; padding-bottom: 12px; }
  .section { margin-bottom: 14px; border: 1px solid #ccc; border-radius: 4px; padding: 10px; }
  .section-gray { background: #f5f5f5; }
  .section-yellow { background: #fffde7; border-color: #f9a825; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .label { font-size: 9pt; color: #555; text-transform: uppercase; letter-spacing: 0.05em; }
  .value { font-size: 11pt; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th { background: #333; color: white; padding: 6px 8px; text-align: left; font-size: 10pt; }
  td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
  tr:nth-child(even) td { background: #fafafa; }
  .checkbox-cell { font-size: 14pt; text-align: center; }
  .checklist-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 11pt; }
  .sign-line { border-bottom: 1px solid black; min-width: 200px; display: inline-block; }
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 9pt; color: #555; display: flex; justify-content: space-between; }
  .print-btn { background: #1d4ed8; color: white; border: none; padding: 10px 24px; font-size: 14px; border-radius: 6px; cursor: pointer; margin: 16px; }
`;

const installationTypeLabels = {
  ny_installation: 'Ny installation',
  byte_uppgradering: 'Byte/uppgradering',
  tillagg: 'Tillägg',
  service_reparation: 'Service/reparation',
  uthyrning_event: 'Uthyrning/event',
};

const priorityLabels = { låg: 'Låg', normal: 'Normal', hög: 'Hög', brådskande: 'BRÅDSKANDE' };

export default function PrintWorkOrder() {
  const [workOrder, setWorkOrder] = useState(null);
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const workOrderId = params.get('id');

  useEffect(() => {
    if (!workOrderId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await base44.functions.invoke('getWorkOrderPrintData', { workOrderId });
        const data = res.data;
        if (!data || data.error) throw new Error(data?.error || 'Kunde inte hämta data');
        setWorkOrder(data.workOrder);
        setOrder(data.order);
        setOrderItems(data.orderItems || []);
        setTasks(data.tasks || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [workOrderId]);

  if (!workOrderId) return <div style={{ padding: 40, background: 'white', color: 'black' }}>Ingen arbetsorder angiven (saknar ?id=...)</div>;
  if (loading) return <div style={{ padding: 40, background: 'white', color: 'black' }}>Laddar...</div>;
  if (error) return <div style={{ padding: 40, background: 'white', color: 'red' }}>Fel: {error}</div>;
  if (!workOrder || !order) return <div style={{ padding: 40, background: 'white', color: 'black' }}>Data kunde inte laddas.</div>;

  const materials = workOrder.materials_needed?.length > 0
    ? workOrder.materials_needed
    : orderItems.map(i => ({
        article_name: i.article_name,
        article_sku: i.article_batch_number,
        shelf_address: i.shelf_address,
        quantity_needed: i.quantity_ordered,
      }));

  const totalItems = materials.reduce((s, m) => s + (m.quantity_needed || 0), 0);
  const checklist = workOrder.checklist || {};
  const now = new Date();

  return (
    <div style={{ backgroundColor: 'white', color: 'black', minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <button className="print-btn no-print" onClick={() => window.print()}>🖨️ Skriv ut</button>

      <div className="page">
        <div className="header">
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '20pt', letterSpacing: '0.05em' }}>IM VISION</div>
            <div style={{ fontSize: '9pt', color: '#555' }}>IM Vision Group AB</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1>ARBETSORDER</h1>
          </div>
          <div style={{ textAlign: 'right', fontSize: '10pt' }}>
            <div><strong>AO:</strong> {order.order_number || workOrder.order_number || '—'}</div>
            <div><strong>Datum:</strong> {format(new Date(workOrder.created_date), 'd MMM yyyy', { locale: sv })}</div>
            <div><strong>Prioritet:</strong> {priorityLabels[workOrder.priority] || workOrder.priority || 'Normal'}</div>
          </div>
        </div>

        <div className="section section-gray">
          <h2>PROJEKTINFORMATION</h2>
          <div className="grid2">
            <div>
              <div className="label">Kund</div>
              <div className="value">{order.customer_name || '—'}</div>
              <div style={{ marginTop: 8 }}>
                <div className="label">Referens</div>
                <div className="value">{order.customer_reference || '—'}</div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div className="label">Ordernr</div>
                <div className="value">{order.order_number || '—'}</div>
              </div>
              {order.fortnox_project_number && (
                <div style={{ marginTop: 8 }}>
                  <div className="label">Fortnox Projekt</div>
                  <div className="value">#{order.fortnox_project_number}{order.fortnox_project_name ? ` – ${order.fortnox_project_name}` : ''}</div>
                </div>
              )}
              {order.installation_date && (
                <div style={{ marginTop: 8 }}>
                  <div className="label">Installationsdatum</div>
                  <div className="value">{format(new Date(order.installation_date), 'd MMM yyyy', { locale: sv })}</div>
                </div>
              )}
            </div>
            <div>
              <div className="label">Leveransdatum</div>
              <div className="value">{order.delivery_date ? format(new Date(order.delivery_date), 'd MMM yyyy', { locale: sv }) : '—'}</div>
              <div style={{ marginTop: 8 }}>
                <div className="label">Leveransadress</div>
                <div className="value">{order.delivery_address || '—'}</div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div className="label">Kontakt</div>
                <div className="value">{[order.delivery_contact_name, order.delivery_contact_phone].filter(Boolean).join(' · ') || '—'}</div>
              </div>
              {order.delivery_method && (
                <div style={{ marginTop: 8 }}>
                  <div className="label">Leveranssätt</div>
                  <div className="value">{order.delivery_method}</div>
                </div>
              )}
              {order.shipping_company && (
                <div style={{ marginTop: 8 }}>
                  <div className="label">Speditör</div>
                  <div className="value">{order.shipping_company}</div>
                </div>
              )}
              {order.installation_type && (
                <div style={{ marginTop: 8 }}>
                  <div className="label">Installationstyp</div>
                  <div className="value">{installationTypeLabels[order.installation_type] || order.installation_type}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {(order.screen_dimensions || order.pixel_pitch || order.module_count) && (
          <div className="section">
            <h2>TEKNISK INFORMATION</h2>
            <div className="grid2">
              <div>
                {order.screen_dimensions && <div style={{ marginBottom: 6 }}><span className="label">Skärmdimensioner: </span><span className="value">{order.screen_dimensions}</span></div>}
                {order.pixel_pitch && <div style={{ marginBottom: 6 }}><span className="label">Pixel pitch: </span><span className="value">{order.pixel_pitch}</span></div>}
                {order.module_count != null && <div style={{ marginBottom: 6 }}><span className="label">Antal moduler: </span><span className="value">{order.module_count}</span></div>}
              </div>
              {order.site_visit_info && (
                <div style={{ border: '1px solid #ccc', padding: 8, borderRadius: 4, background: '#fafafa' }}>
                  <div className="label" style={{ marginBottom: 4 }}>Platsbesöksinfo</div>
                  <div style={{ fontSize: '10pt', whiteSpace: 'pre-wrap' }}>{order.site_visit_info}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="section">
          <h2>MATERIALLISTA / PLOCKLISTA</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Artikel</th>
                <th style={{ width: 100 }}>Artikelnr</th>
                <th style={{ width: 100 }}>Hyllplats</th>
                <th style={{ width: 60, textAlign: 'center' }}>Antal</th>
                <th style={{ width: 60, textAlign: 'center' }}>Plockad</th>
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 16 }}>Inga artiklar</td></tr>
              ) : materials.map((m, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{m.article_name || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '9pt' }}>{m.article_sku || m.article_id?.slice(0, 8) || '—'}</td>
                  <td>{Array.isArray(m.shelf_address) ? m.shelf_address.join(', ') : (m.shelf_address || '—')}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{m.quantity_needed || 0}</td>
                  <td className="checkbox-cell">☐</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 8, fontWeight: 'bold', textAlign: 'right', fontSize: '10pt' }}>
            Totalantal: {totalItems} st
          </div>
        </div>

        <div className="section">
          <h2>CHECKLISTA</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
            {[
              { key: 'picked', label: 'Material plockat' },
              { key: 'assembled', label: 'Monterat' },
              { key: 'tested', label: 'Testat' },
              { key: 'packed', label: 'Paketerat' },
              { key: 'ready_for_delivery', label: 'Redo för leverans' },
            ].map(({ key, label }) => (
              <div key={key} className="checklist-item">
                <span style={{ fontSize: '16pt' }}>{checklist[key] ? '☑' : '☐'}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="section section-yellow">
          <h2>OBS / SPECIELLA KRAV</h2>
          {order.critical_notes && (
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '11pt', marginTop: 4, marginBottom: 8, fontWeight: 'bold' }}>
              {order.critical_notes}
            </div>
          )}
          {order.notes && (
            <div>
              <div className="label">Anteckningar (order)</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '11pt', marginTop: 4 }}>{order.notes}</div>
            </div>
          )}
          {order.ordering_notes && (
            <div style={{ marginTop: 8 }}>
              <div className="label">Beställningsanteckningar</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '11pt', marginTop: 4 }}>{order.ordering_notes}</div>
            </div>
          )}
          {workOrder.project_description && (
            <div style={{ marginTop: 8 }}>
              <div className="label">Projektbeskrivning (AO)</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '11pt', marginTop: 4 }}>{workOrder.project_description}</div>
            </div>
          )}
          {workOrder.picking_notes && (
            <div style={{ marginTop: 8 }}>
              <div className="label">Plockanteckningar</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '11pt', marginTop: 4 }}>{workOrder.picking_notes}</div>
            </div>
          )}
          {workOrder.production_notes && (
            <div style={{ marginTop: 8 }}>
              <div className="label">Produktionsanteckningar</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '11pt', marginTop: 4 }}>{workOrder.production_notes}</div>
            </div>
          )}
          {!order.critical_notes && !order.notes && !order.ordering_notes && !workOrder.project_description && !workOrder.picking_notes && !workOrder.production_notes && (
            <div style={{ fontSize: '11pt', marginTop: 4 }}>Inga speciella krav</div>
          )}
        </div>

        {tasks.length > 0 && (
          <div className="section">
            <h2>UPPGIFTER ({tasks.length} st)</h2>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>Uppgift</th>
                  <th style={{ width: 80 }}>Prioritet</th>
                  <th style={{ width: 120 }}>Tilldelad</th>
                  <th style={{ width: 80 }}>Status</th>
                  <th style={{ width: 50, textAlign: 'center' }}>Klar</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, i) => (
                  <tr key={task.id}>
                    <td>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{task.name}</div>
                      {task.description && <div style={{ fontSize: '9pt', color: '#666', marginTop: 2 }}>{task.description}</div>}
                    </td>
                    <td>{task.priority === 'high' ? 'Hög' : task.priority === 'urgent' ? 'AKUT' : task.priority === 'low' ? 'Låg' : 'Normal'}</td>
                    <td style={{ fontSize: '9pt' }}>{task.assigned_to || '—'}</td>
                    <td style={{ fontSize: '9pt' }}>{task.status === 'completed' ? 'Klar' : task.status === 'in_progress' ? 'Pågår' : 'Ej påbörjad'}</td>
                    <td className="checkbox-cell">{task.status === 'completed' ? '☑' : '☐'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="section">
          <h2>SIGNERING</h2>
          <div style={{ marginBottom: 16 }}>
            Godkänt av: <span className="sign-line" style={{ width: 200 }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;&nbsp;
            Datum: <span className="sign-line" style={{ width: 120 }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          </div>
          <div>
            Avvikelser: <span className="sign-line" style={{ width: 360 }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
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