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

  .page {
    max-width: 210mm;
    margin: 0 auto;
    background: white;
    min-height: 297mm;
    display: flex;
    flex-direction: column;
  }

  /* Top bar */
  .top-bar {
    background: #111;
    color: white;
    padding: 20px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .top-bar-logo { font-size: 20pt; font-weight: 900; letter-spacing: 0.12em; }
  .top-bar-sub { font-size: 8pt; color: rgba(255,255,255,0.5); letter-spacing: 0.06em; margin-top: 2px; }
  .top-bar-title { font-size: 18pt; font-weight: 700; letter-spacing: 0.04em; text-align: center; }
  .top-bar-meta { text-align: right; font-size: 9pt; color: rgba(255,255,255,0.7); line-height: 1.7; }
  .top-bar-meta strong { color: white; }

  .content { padding: 20px 28px; flex: 1; }

  /* Sections */
  .section {
    margin-bottom: 14px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
  }
  .section-header {
    background: #f0f0ed;
    padding: 7px 14px;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #444;
    border-bottom: 1px solid #e0e0e0;
  }
  .section-body { padding: 12px 14px; }
  .section-yellow .section-header { background: #fef9e7; border-bottom-color: #f4d03f; color: #7d6608; }
  .section-yellow { border-color: #f4d03f; }

  /* Grid */
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

  /* Fields */
  .field { margin-bottom: 10px; }
  .field:last-child { margin-bottom: 0; }
  .field-label { font-size: 7.5pt; color: #888; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
  .field-value { font-size: 10.5pt; font-weight: 500; color: #111; }

  /* Table */
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #111; }
  th { padding: 8px 10px; text-align: left; font-size: 8.5pt; font-weight: 600; letter-spacing: 0.04em; color: white; }
  td { padding: 7px 10px; border-bottom: 1px solid #ececec; font-size: 9.5pt; color: #222; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  .cb { font-size: 14pt; text-align: center; color: #bbb; }

  /* Checklist */
  .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .checklist-item { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f0f0f0; font-size: 10pt; }
  .checklist-item .cb { font-size: 15pt; color: #ccc; }

  /* Signature */
  .sig-row { display: flex; gap: 32px; margin-bottom: 12px; }
  .sig-field { flex: 1; }
  .sig-label { font-size: 8pt; color: #888; margin-bottom: 20px; }
  .sig-line { border-bottom: 1px solid #333; display: block; width: 100%; margin-top: 24px; }

  /* Footer */
  .footer {
    padding: 10px 28px;
    border-top: 1px solid #e0e0e0;
    font-size: 8pt;
    color: #aaa;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fafafa;
  }

  /* Print button */
  .print-bar { background: #1d4ed8; padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
  .print-btn { background: white; color: #1d4ed8; border: none; padding: 8px 20px; font-size: 13px; font-weight: 600; border-radius: 5px; cursor: pointer; }
  .print-info { color: rgba(255,255,255,0.8); font-size: 11px; }

  .note-box { white-space: pre-wrap; font-size: 10pt; line-height: 1.6; color: #333; }
  .total-row { text-align: right; font-size: 9pt; color: #555; padding-top: 6px; }
`;

const installationTypeLabels = {
  ny_installation: 'Ny installation',
  byte_uppgradering: 'Byte/uppgradering',
  tillagg: 'Tillägg',
  service_reparation: 'Service/reparation',
  uthyrning_event: 'Uthyrning/event',
};

const priorityLabels = { low: 'Låg', normal: 'Normal', high: 'Hög', urgent: 'BRÅDSKANDE' };

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
    if (!workOrderId) { setLoading(false); return; }
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

  const totalItems = materials.reduce((s, m) => s + (m.quantity_needed || 0), 0);
  const checklist = workOrder.checklist || {};
  const now = new Date();
  const hasNotes = order.critical_notes || order.notes || order.ordering_notes || workOrder.project_description || workOrder.picking_notes || workOrder.production_notes;

  return (
    <div style={{ backgroundColor: '#f4f4f0', minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: SHARED_CSS }} />

      <div className="no-print print-bar">
        <button className="print-btn" onClick={() => window.print()}>🖨️ Skriv ut</button>
        <span className="print-info">ARBETSORDER — {order.customer_name} · {order.order_number || '—'}</span>
      </div>

      <div className="page">
        {/* Header */}
        <div className="top-bar">
          <div>
            <div className="top-bar-logo">IM VISION</div>
            <div className="top-bar-sub">IM Vision Group AB</div>
          </div>
          <div className="top-bar-title">ARBETSORDER</div>
          <div className="top-bar-meta">
            <div><strong>AO:</strong> {order.order_number || workOrder.order_number || '—'}</div>
            <div><strong>Datum:</strong> {format(new Date(workOrder.created_date), 'd MMM yyyy', { locale: sv })}</div>
            <div><strong>Prioritet:</strong> {priorityLabels[workOrder.priority] || 'Normal'}</div>
          </div>
        </div>

        <div className="content">
          {/* Project Info */}
          <div className="section">
            <div className="section-header">Projektinformation</div>
            <div className="section-body">
              <div className="grid2">
                <div>
                  <div className="field"><div className="field-label">Kund</div><div className="field-value">{order.customer_name || '—'}</div></div>
                  <div className="field"><div className="field-label">Referens</div><div className="field-value">{order.customer_reference || '—'}</div></div>
                  <div className="field"><div className="field-label">Ordernummer</div><div className="field-value">{order.order_number || '—'}</div></div>
                  {order.fortnox_project_number && (
                    <div className="field"><div className="field-label">Fortnox Projekt</div><div className="field-value">#{order.fortnox_project_number}{order.fortnox_project_name ? ` – ${order.fortnox_project_name}` : ''}</div></div>
                  )}
                </div>
                <div>
                  <div className="field"><div className="field-label">Leveransdatum</div><div className="field-value">{order.delivery_date ? format(new Date(order.delivery_date), 'd MMM yyyy', { locale: sv }) : '—'}</div></div>
                  {order.installation_date && (
                    <div className="field"><div className="field-label">Installationsdatum</div><div className="field-value">{format(new Date(order.installation_date), 'd MMM yyyy', { locale: sv })}</div></div>
                  )}
                  <div className="field"><div className="field-label">Leveransadress</div><div className="field-value">{order.delivery_address || '—'}</div></div>
                  <div className="field"><div className="field-label">Kontakt</div><div className="field-value">{[order.delivery_contact_name, order.delivery_contact_phone].filter(Boolean).join(' · ') || '—'}</div></div>
                  {order.installation_type && (
                    <div className="field"><div className="field-label">Installationstyp</div><div className="field-value">{installationTypeLabels[order.installation_type] || order.installation_type}</div></div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Technical Info */}
          {(order.screen_dimensions || order.pixel_pitch || order.module_count || order.site_visit_info) && (
            <div className="section">
              <div className="section-header">Teknisk information</div>
              <div className="section-body">
                <div className="grid2">
                  <div>
                    {order.screen_dimensions && <div className="field"><div className="field-label">Skärmdimensioner</div><div className="field-value">{order.screen_dimensions}</div></div>}
                    {order.pixel_pitch && <div className="field"><div className="field-label">Pixel pitch</div><div className="field-value">{order.pixel_pitch}</div></div>}
                    {order.module_count != null && <div className="field"><div className="field-label">Antal moduler</div><div className="field-value">{order.module_count}</div></div>}
                  </div>
                  {order.site_visit_info && (
                    <div className="field"><div className="field-label">Platsbesöksinfo</div><div className="note-box" style={{ fontSize: '9.5pt' }}>{order.site_visit_info}</div></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Materials */}
          <div className="section">
            <div className="section-header">Materiallista / Plocklista</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 32 }}>#</th>
                  <th>Artikel</th>
                  <th style={{ width: 110 }}>Artikelnr</th>
                  <th style={{ width: 100 }}>Hyllplats</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Antal</th>
                  <th style={{ width: 50, textAlign: 'center' }}>☐</th>
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa', padding: 20 }}>Inga artiklar registrerade</td></tr>
                ) : materials.map((m, i) => (
                  <tr key={i}>
                    <td style={{ color: '#999' }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{m.article_name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '8.5pt', color: '#555' }}>{m.article_sku || m.article_id?.slice(0, 8) || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{Array.isArray(m.shelf_address) ? m.shelf_address.join(', ') : (m.shelf_address || '—')}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '11pt' }}>{m.quantity_needed || 0}</td>
                    <td className="cb">☐</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {materials.length > 0 && (
              <div className="total-row" style={{ padding: '8px 10px' }}>Totalantal: <strong>{totalItems} st</strong> · {materials.length} rader</div>
            )}
          </div>

          {/* Checklist */}
          <div className="section">
            <div className="section-header">Checklista</div>
            <div className="section-body">
              <div className="checklist-grid">
                {[
                  { key: 'picked', label: 'Material plockat' },
                  { key: 'assembled', label: 'Monterat' },
                  { key: 'tested', label: 'Testat' },
                  { key: 'packed', label: 'Paketerat' },
                  { key: 'ready_for_delivery', label: 'Redo för leverans' },
                ].map(({ key, label }) => (
                  <div key={key} className="checklist-item">
                    <span className="cb">{checklist[key] ? '☑' : '☐'}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          {hasNotes && (
            <div className="section section-yellow">
              <div className="section-header">OBS / Speciella krav</div>
              <div className="section-body">
                {order.critical_notes && <div className="field"><div className="field-label">Kritisk information</div><div className="note-box" style={{ fontWeight: 700, color: '#7d6608' }}>{order.critical_notes}</div></div>}
                {order.notes && <div className="field"><div className="field-label">Anteckningar (order)</div><div className="note-box">{order.notes}</div></div>}
                {order.ordering_notes && <div className="field"><div className="field-label">Beställningsanteckningar</div><div className="note-box">{order.ordering_notes}</div></div>}
                {workOrder.project_description && <div className="field"><div className="field-label">Projektbeskrivning</div><div className="note-box">{workOrder.project_description}</div></div>}
                {workOrder.picking_notes && <div className="field"><div className="field-label">Plockanteckningar</div><div className="note-box">{workOrder.picking_notes}</div></div>}
                {workOrder.production_notes && <div className="field"><div className="field-label">Produktionsanteckningar</div><div className="note-box">{workOrder.production_notes}</div></div>}
              </div>
            </div>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <div className="section">
              <div className="section-header">Uppgifter ({tasks.length} st)</div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th>Uppgift</th>
                    <th style={{ width: 80 }}>Prioritet</th>
                    <th style={{ width: 130 }}>Tilldelad</th>
                    <th style={{ width: 80 }}>Status</th>
                    <th style={{ width: 40, textAlign: 'center' }}>☐</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, i) => (
                    <tr key={task.id}>
                      <td style={{ color: '#999' }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{task.name}</div>
                        {task.description && <div style={{ fontSize: '8.5pt', color: '#888', marginTop: 2 }}>{task.description}</div>}
                      </td>
                      <td style={{ fontSize: '9pt' }}>{task.priority === 'high' ? 'Hög' : task.priority === 'urgent' ? 'AKUT' : task.priority === 'low' ? 'Låg' : 'Normal'}</td>
                      <td style={{ fontSize: '8.5pt', color: '#555' }}>{task.assigned_to || '—'}</td>
                      <td style={{ fontSize: '9pt' }}>{task.status === 'completed' ? 'Klar' : task.status === 'in_progress' ? 'Pågår' : 'Ej påbörjad'}</td>
                      <td className="cb">{task.status === 'completed' ? '☑' : '☐'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signature */}
          <div className="section">
            <div className="section-header">Signering</div>
            <div className="section-body">
              <div className="sig-row">
                <div className="sig-field">
                  <div className="sig-label">Godkänt av</div>
                  <span className="sig-line" />
                </div>
                <div className="sig-field" style={{ maxWidth: 140 }}>
                  <div className="sig-label">Datum</div>
                  <span className="sig-line" />
                </div>
              </div>
              <div className="sig-field">
                <div className="sig-label">Avvikelser / kommentarer</div>
                <span className="sig-line" style={{ marginTop: 40 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <span>IM Vision Group AB</span>
          <span>Utskriven: {format(now, 'd MMM yyyy HH:mm', { locale: sv })}</span>
          <span>Sida 1 av 1</span>
        </div>
      </div>
    </div>
  );
}