import { BLUE } from './printStyles';

export default function PrintToolbar({ orderNumber, activePage, setActivePage }) {
  const btnBase = {
    padding: '6px 16px',
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  };

  return (
    <div className="print-hide" style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#1a1a2e', color: '#fff',
      padding: '12px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>
        Förhandsvisning — Arbetsorder #{orderNumber || '...'}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => setActivePage(1)}
          style={{
            ...btnBase,
            background: activePage === 1 ? BLUE : '#333',
            color: '#fff',
          }}
        >
          Sida 1 — Order
        </button>
        <button
          onClick={() => setActivePage(2)}
          style={{
            ...btnBase,
            background: activePage === 2 ? BLUE : '#333',
            color: '#fff',
          }}
        >
          Sida 2 — Konfiguration
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => window.print()}
          style={{ ...btnBase, background: BLUE, color: '#fff' }}
        >
          Skriv ut (2 sidor)
        </button>
        <button
          onClick={() => window.close()}
          style={{ ...btnBase, background: '#555', color: '#fff' }}
        >
          Stäng
        </button>
      </div>
    </div>
  );
}