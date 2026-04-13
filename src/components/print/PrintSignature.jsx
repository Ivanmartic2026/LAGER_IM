import { BLUE } from './printStyles';

function SignLine({ role }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>{role}</div>
      <div style={{ borderBottom: '1px solid #999', height: 18 }} />
      <div style={{ fontSize: 9, color: '#bbb', marginTop: 2 }}>Datum: ____________</div>
    </div>
  );
}

function QRPlaceholder({ orderNumber }) {
  // Decorative SVG QR-like pattern
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ border: '2px solid #333' }}>
        <rect x="0" y="0" width="64" height="64" fill="#fff" />
        <rect x="4" y="4" width="18" height="18" fill="#333" />
        <rect x="42" y="4" width="18" height="18" fill="#333" />
        <rect x="4" y="42" width="18" height="18" fill="#333" />
        <rect x="8" y="8" width="10" height="10" fill="#fff" />
        <rect x="46" y="8" width="10" height="10" fill="#fff" />
        <rect x="8" y="46" width="10" height="10" fill="#fff" />
        <rect x="11" y="11" width="4" height="4" fill="#333" />
        <rect x="49" y="11" width="4" height="4" fill="#333" />
        <rect x="11" y="49" width="4" height="4" fill="#333" />
        <rect x="26" y="4" width="4" height="4" fill="#333" />
        <rect x="26" y="12" width="4" height="4" fill="#333" />
        <rect x="34" y="26" width="4" height="4" fill="#333" />
        <rect x="26" y="26" width="4" height="4" fill="#333" />
        <rect x="42" y="42" width="4" height="4" fill="#333" />
        <rect x="50" y="42" width="4" height="4" fill="#333" />
        <rect x="42" y="50" width="4" height="4" fill="#333" />
        <rect x="50" y="50" width="4" height="4" fill="#333" />
        <rect x="26" y="34" width="4" height="4" fill="#333" />
        <rect x="34" y="34" width="4" height="4" fill="#333" />
      </svg>
      <div style={{ fontSize: 8, color: '#888', marginTop: 3 }}>Skanna för dokumentation</div>
      <div style={{ fontSize: 8, color: '#aaa' }}>{orderNumber}</div>
    </div>
  );
}

export default function PrintSignature({ orderNumber }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: BLUE, textTransform: 'uppercase', marginBottom: 8 }}>
          Signatur vid godkänd installation
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
          <SignLine role="Projektledare" />
          <SignLine role="Konstruktör" />
          <SignLine role="Tekniker / Installatör" />
          <SignLine role="Kund" />
        </div>
      </div>
      <div style={{ marginLeft: 24, flexShrink: 0 }}>
        <QRPlaceholder orderNumber={orderNumber} />
      </div>
    </div>
  );
}