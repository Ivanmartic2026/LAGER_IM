import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const STATUS_LABELS = {
  draft: { label: 'Utkast', color: '#6b7280' },
  ready_for_handover: { label: 'Redo för överlämning', color: '#8b5cf6' },
  handed_over: { label: 'Överlämnad', color: '#a78bfa' },
  planning: { label: 'Planering', color: '#3b82f6' },
  construction: { label: 'Konstruktion', color: '#06b6d4' },
  ready_for_production: { label: 'Redo för produktion', color: '#f59e0b' },
  in_production: { label: 'I produktion', color: '#f97316' },
  ready_for_warehouse: { label: 'Redo för lager', color: '#eab308' },
  picking: { label: 'Plockning', color: '#84cc16' },
  ready_for_delivery: { label: 'Redo för leverans', color: '#22c55e' },
  shipped: { label: 'Skickad', color: '#10b981' },
  delivered: { label: 'Levererad', color: '#059669' },
  cancelled: { label: 'Avbokad', color: '#ef4444' },
};

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, color: '#6b7280' };
  return (
    <span className="status-badge" style={{
      backgroundColor: s.color + '22',
      color: s.color,
      border: `1px solid ${s.color}55`,
      borderRadius: '999px',
      padding: '4px 14px',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      fontSize: 'clamp(12px, 1.5vw, 18px)',
    }}>
      {s.label}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('sv-SE');
}

export default function OrderDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchOrders = async () => {
    const res = await base44.functions.invoke('getPublicOrders', {});
    setOrders(res.data?.orders || []);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: '#ffffff',
      padding: 'clamp(16px, 4vw, 60px) clamp(12px, 4vw, 50px)',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 'clamp(20px, 3vw, 50px)', borderBottom: '1px solid #1f1f1f', paddingBottom: 'clamp(16px, 2.5vw, 40px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 64px)', fontWeight: 800, margin: 0, letterSpacing: '-1px', color: '#fff' }}>
              Order Dashboard
            </h1>
            <p style={{ fontSize: 'clamp(13px, 1.8vw, 30px)', color: '#555', margin: '6px 0 0 0' }}>
              Aktiva ordrar · IMvision
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 'clamp(14px, 2vw, 28px)',
              fontWeight: 700,
              color: '#2563eb',
              backgroundColor: '#2563eb18',
              border: '1px solid #2563eb33',
              borderRadius: '12px',
              padding: 'clamp(8px, 1vw, 16px) clamp(14px, 2vw, 32px)',
            }}>
              {orders.length} ordrar
            </div>
            {lastUpdated && (
              <p style={{ fontSize: 'clamp(11px, 1.3vw, 22px)', color: '#444', marginTop: '8px' }}>
                Uppdaterad {lastUpdated.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Order List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#444', fontSize: 'clamp(18px, 3vw, 40px)', paddingTop: '100px' }}>
          Laddar ordrar...
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#444', fontSize: 'clamp(18px, 3vw, 40px)', paddingTop: '100px' }}>
          Inga aktiva ordrar
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.5vw, 20px)' }}>
          {orders.map((order, index) => (
            <div key={order.id} style={{
              backgroundColor: '#111',
              border: '1px solid #1f1f1f',
              borderRadius: '16px',
              padding: 'clamp(14px, 2vw, 36px) clamp(16px, 3vw, 44px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'clamp(10px, 1.5vw, 24px)',
            }}>
              {/* Left: Number + Customer */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1.5vw, 20px)', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 'clamp(11px, 1.3vw, 24px)',
                    fontWeight: 700,
                    color: '#333',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    padding: '2px 10px',
                    fontFamily: 'monospace',
                  }}>
                    #{index + 1}
                  </span>
                  <span style={{
                    fontSize: 'clamp(16px, 2.5vw, 32px)',
                    fontWeight: 700,
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 'clamp(160px, 35vw, 480px)',
                  }}>
                    {order.customer_name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 'clamp(8px, 1.5vw, 20px)', alignItems: 'center', flexWrap: 'wrap' }}>
                  {order.order_number && (
                    <span style={{ fontSize: 'clamp(11px, 1.3vw, 24px)', color: '#555', fontFamily: 'monospace' }}>
                      {order.order_number}
                    </span>
                  )}
                  {order.fortnox_project_name && (
                    <span style={{ fontSize: 'clamp(11px, 1.3vw, 24px)', color: '#3b82f6' }}>
                      {order.fortnox_project_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Middle: Delivery date */}
              <div style={{ textAlign: 'center', minWidth: 'clamp(80px, 10vw, 180px)' }}>
                {order.delivery_date ? (
                  <>
                    <p style={{ fontSize: 'clamp(10px, 1.2vw, 22px)', color: '#444', margin: '0 0 2px 0' }}>Leverans</p>
                    <p style={{ fontSize: 'clamp(14px, 1.8vw, 30px)', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                      {formatDate(order.delivery_date)}
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 'clamp(14px, 1.8vw, 26px)', color: '#333' }}>–</p>
                )}
              </div>

              {/* Right: Status */}
              <div style={{ minWidth: 'clamp(100px, 12vw, 240px)', textAlign: 'right' }}>
                <StatusBadge status={order.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 'clamp(30px, 4vw, 60px)',
        paddingTop: 'clamp(16px, 2vw, 30px)',
        borderTop: '1px solid #1a1a1a',
        textAlign: 'center',
        color: '#2a2a2a',
        fontSize: 'clamp(11px, 1.2vw, 22px)',
      }}>
        IMvision · Automatisk uppdatering var 30:e sekund
      </div>
    </div>
  );
}