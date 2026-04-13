import PrintHeader from './PrintHeader';
import PrintMaterialTable from './PrintMaterialTable';
import { sectionTitle, label, value, BORDER_COLOR, INSTALLATION_TYPE_LABELS } from './printStyles';

function Field({ l, v: val, fullWidth }) {
  return (
    <div style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
      <div style={label}>{l}</div>
      <div style={value}>{val || '—'}</div>
    </div>
  );
}

function NotesBlock({ title, text }) {
  if (!text) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', marginBottom: 2 }}>
        {title}
      </div>
      <div style={{
        fontSize: 11, color: '#333',
        whiteSpace: 'pre-wrap',
        background: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: 4,
        padding: '6px 8px',
      }}>
        {text}
      </div>
    </div>
  );
}

export default function PrintPage2({ workOrder, order, orderItems, articles }) {
  const wo = workOrder || {};
  const o = order || {};
  const orderNumber = wo.order_number || o.order_number || '';
  const isEvent = (wo.installation_type || o.installation_type) === 'uthyrning_event';

  return (
    <div className="print-page" style={{
      width: '210mm', minHeight: '297mm',
      padding: '15mm',
      background: '#fff', color: '#111',
      fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
      fontSize: 12,
      position: 'relative',
      boxSizing: 'border-box',
      pageBreakAfter: 'always',
    }}>
      <PrintHeader workOrder={wo} order={o} pageLabel="KONFIGURATION — SIDA 2 AV 2" />

      {/* Produktspecifikation */}
      <div style={sectionTitle}>Produktspecifikation</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 16px', marginBottom: 6 }}>
        <Field l="System / Modell" v={wo.name || o.customer_name} />
        <Field l="Pixel pitch" v={wo.pixel_pitch || o.pixel_pitch} />
        <Field l="Skärmdimensioner" v={wo.screen_dimensions || o.screen_dimensions} />
        <Field l="Antal moduler" v={wo.module_count || o.module_count} />
        <Field l="Installationstyp" v={INSTALLATION_TYPE_LABELS[wo.installation_type || o.installation_type] || '—'} />
        <Field l="Version" v={wo.product_version || '—'} />
        {wo.project_description && <Field l="Teknisk anmärkning" v={wo.project_description} fullWidth />}
      </div>

      {/* Alla artiklar */}
      <PrintMaterialTable
        workOrder={wo}
        orderItems={orderItems}
        articles={articles}
        title="Alla artiklar från order"
        showPickedStatus
      />

      {/* Event-specifikt */}
      {isEvent && (
        <>
          <div style={sectionTitle}>Eventinformation</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 16px', marginBottom: 6 }}>
            <Field l="Eventnamn" v={orderNumber || wo.name} />
            <Field l="Hyresperiod" v={wo.delivery_date || o.delivery_date} />
            <Field l="Venue / Plats" v={wo.delivery_address || o.delivery_address} />
          </div>
        </>
      )}

      {/* Anteckningar & avvikelser */}
      <div style={sectionTitle}>Anteckningar & avvikelser</div>
      <NotesBlock title="Projektanteckningar" text={[wo.production_notes, o.notes].filter(Boolean).join('\n\n')} />
      {wo.deviations ? (
        <NotesBlock title="Avvikelser" text={wo.deviations} />
      ) : (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#333', textTransform: 'uppercase', marginBottom: 2 }}>
            Avvikelser
          </div>
          <div style={{
            border: '1.5px dashed #ccc',
            borderRadius: 4,
            minHeight: 60,
            padding: 6,
            fontSize: 10,
            color: '#bbb',
          }}>
            Notera eventuella avvikelser här...
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: '15mm', left: '15mm', right: '15mm',
        display: 'flex', justifyContent: 'space-between',
        fontSize: 9, color: '#999',
        borderTop: `1px solid ${BORDER_COLOR}`, paddingTop: 4,
      }}>
        <span>Arbetsorder: {orderNumber}</span>
        <span>{new Date().toLocaleDateString('sv-SE')}</span>
        <span>Sida 2 av 2</span>
      </div>
    </div>
  );
}