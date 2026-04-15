import PrintHeader from './PrintHeader';
import PrintMaterialTable from './PrintMaterialTable';
import PrintTasksSection from './PrintTasksSection';
import PrintChecklist from './PrintChecklist';
import PrintSignature from './PrintSignature';
import { sectionTitle, label, value, WARNING_BG, WARNING_BORDER, BLUE, DELIVERY_METHOD_LABELS, BORDER_COLOR } from './printStyles';
import { PrintScreenConfig, PrintQuoteItems, PrintOrderItems, PrintLinkedPurchaseOrders } from './PrintExtraSections';

const STAGES = [
  { key: 'säljare', label: 'Säljare', assignField: null },
  { key: 'konstruktion', label: 'Projektledare', assignField: 'assigned_to_konstruktion_name' },
  { key: 'produktion', label: 'Konstruktör', assignField: 'assigned_to_produktion_name' },
  { key: 'lager', label: 'Lager', assignField: 'assigned_to_lager_name' },
  { key: 'montering', label: 'Tekniker', assignField: 'assigned_to_montering_name' },
];

function Field({ l, v: val }) {
  return (
    <div>
      <div style={label}>{l}</div>
      <div style={value}>{val || '—'}</div>
    </div>
  );
}

function WarningBanner({ text }) {
  if (!text) return null;
  return (
    <div style={{
      background: WARNING_BG,
      border: `1.5px solid ${WARNING_BORDER}`,
      borderRadius: 6,
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 12,
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: WARNING_BORDER, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 13, flexShrink: 0,
      }}>!</div>
      <div style={{ fontSize: 11, color: '#7A5600', fontWeight: 600 }}>
        VIKTIGT: {text}
      </div>
    </div>
  );
}

function ProcessFlowPrint({ workOrder }) {
  const wo = workOrder || {};
  const current = wo.current_stage || 'konstruktion';
  const stageOrder = STAGES.map(s => s.key);
  const currentIdx = stageOrder.indexOf(current);

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, marginBottom: 8 }}>
        {STAGES.map((s, i) => {
          let bg = '#E5E7EB';
          let color = '#666';
          if (i < currentIdx) { bg = '#16A34A'; color = '#fff'; }
          else if (i === currentIdx) { bg = BLUE; color = '#fff'; }
          return (
            <div key={s.key} style={{
              flex: 1,
              textAlign: 'center',
              padding: '6px 4px',
              background: bg,
              color,
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              borderRight: i < STAGES.length - 1 ? '2px solid #fff' : 'none',
            }}>
              <div>{s.label}</div>
              {s.assignField && wo[s.assignField] && (
                <div style={{ fontWeight: 400, fontSize: 8, marginTop: 1, opacity: 0.9 }}>
                  {wo[s.assignField]}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 24, fontSize: 10, color: '#666' }}>
        {wo.planned_start_date && <span><strong>Start:</strong> {wo.planned_start_date}</span>}
        {wo.planned_deadline && <span><strong>Deadline:</strong> {wo.planned_deadline}</span>}
        {(wo.source_document_url) && (
          <span><strong>Källdokument:</strong> <a href={wo.source_document_url} style={{ color: BLUE }}>Öppna</a></span>
        )}
      </div>
    </div>
  );
}

export default function PrintPage1({ workOrder, order, orderItems, articles, tasks, purchaseOrders }) {
  const wo = workOrder || {};
  const o = order || {};
  const criticalNotes = wo.critical_notes || o.critical_notes;
  const orderNumber = wo.order_number || o.order_number || '';

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
      <PrintHeader workOrder={wo} order={o} pageLabel="INTERN ARBETSORDER — SIDA 1 AV 2" />
      <WarningBanner text={criticalNotes} />

      {/* Projektinformation */}
      <div style={sectionTitle}>Projektinformation</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 16px', marginBottom: 6 }}>
        <Field l="Kund" v={o.customer_name || wo.customer_name} />
        <Field l="Kontaktperson på plats" v={wo.delivery_contact_name || o.delivery_contact_name} />
        <Field l="Telefon" v={wo.delivery_contact_phone || o.delivery_contact_phone} />
        <Field l="Installationsadress" v={wo.delivery_address || o.delivery_address} />
        <Field l="Leveransdatum" v={wo.delivery_date || o.delivery_date} />
        <Field l="Installationsdatum" v={wo.installation_date || o.installation_date} />
        <Field l="Leveranssätt" v={DELIVERY_METHOD_LABELS[wo.delivery_method || o.delivery_method] || wo.delivery_method || o.delivery_method} />
        <Field l="Speditör" v={wo.shipping_company || o.shipping_company} />
        <Field l="Access / Inpassering" v={wo.site_visit_info || o.site_visit_info} />
      </div>

      {/* Rollfördelning & flöde */}
      <div style={sectionTitle}>Rollfördelning & flöde</div>
      <ProcessFlowPrint workOrder={wo} />

      {/* Extra sections: screen config, quote items, order items, purchase orders */}
      <PrintScreenConfig workOrder={wo} />
      <PrintQuoteItems workOrder={wo} />
      <PrintOrderItems orderItems={orderItems} />
      <PrintLinkedPurchaseOrders purchaseOrders={purchaseOrders || []} />

      {/* BOM */}
      <PrintMaterialTable workOrder={wo} orderItems={orderItems} articles={articles} />

      {/* Tasks */}
      <PrintTasksSection tasks={tasks} />

      {/* Checklist */}
      <PrintChecklist />

      {/* Signering */}
      <PrintSignature orderNumber={orderNumber} />

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: '15mm', left: '15mm', right: '15mm',
        display: 'flex', justifyContent: 'space-between',
        fontSize: 9, color: '#999',
        borderTop: `1px solid ${BORDER_COLOR}`, paddingTop: 4,
      }}>
        <span>Arbetsorder: {orderNumber}</span>
        <span>{new Date().toLocaleDateString('sv-SE')}</span>
        <span>Sida 1 av 2</span>
      </div>
    </div>
  );
}