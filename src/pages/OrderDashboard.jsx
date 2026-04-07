import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const STATUS_CONFIG = {
  draft:                { label: 'Utkast',              color: '#6b7280', order: 10 },
  ready_for_handover:   { label: 'Redo för överlämning', color: '#8b5cf6', order: 2 },
  handed_over:          { label: 'Överlämnad',           color: '#a78bfa', order: 3 },
  planning:             { label: 'Planering',            color: '#3b82f6', order: 4 },
  construction:         { label: 'Konstruktion',         color: '#06b6d4', order: 5 },
  ready_for_production: { label: 'Redo för produktion',  color: '#f59e0b', order: 6 },
  in_production:        { label: 'I produktion',         color: '#f97316', order: 7 },
  ready_for_warehouse:  { label: 'Redo för lager',       color: '#eab308', order: 8 },
  picking:              { label: 'Plockning',            color: '#84cc16', order: 9 },
  ready_for_delivery:   { label: 'Redo för leverans',    color: '#22c55e', order: 1 },
  shipped:              { label: 'Skickad',              color: '#10b981', order: 11 },
};

// Priority order for status groups shown on dashboard
const STATUS_GROUP_ORDER = [
  'ready_for_delivery',
  'ready_for_handover',
  'handed_over',
  'planning',
  'construction',
  'ready_for_production',
  'in_production',
  'ready_for_warehouse',
  'picking',
  'shipped',
  'draft',
];

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || { label: status, color: '#6b7280' };
  return (
    <span style={{
      backgroundColor: s.color + '22',
      color: s.color,
      border: `1px solid ${s.color}55`,
      borderRadius: '999px',
      padding: '3px 12px',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      fontSize: 'clamp(11px, 1.1vw, 14px)',
      letterSpacing: '0.01em',
    }}>
      {s.label}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  return { formatted: d.toLocaleDateString('sv-SE'), daysLeft: diff };
}

function DeliveryBadge({ dateStr }) {
  const result = formatDate(dateStr);
  if (!result) return <span style={{ color: '#444', fontSize: 'clamp(12px, 1.2vw, 15px)' }}>–</span>;
  const { formatted, daysLeft } = result;
  let color = '#e2e8f0';
  if (daysLeft < 0) color = '#ef4444';
  else if (daysLeft <= 7) color = '#f97316';
  else if (daysLeft <= 14) color = '#eab308';

  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 'clamp(10px, 0.9vw, 12px)', color: '#555', marginBottom: '2px' }}>Leverans</div>
      <div style={{ fontSize: 'clamp(13px, 1.3vw, 16px)', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {formatted}
      </div>
      {daysLeft !== null && (
        <div style={{ fontSize: 'clamp(9px, 0.8vw, 11px)', color: color === '#e2e8f0' ? '#555' : color, marginTop: '1px' }}>
          {daysLeft < 0 ? `${Math.abs(daysLeft)}d försenad` : daysLeft === 0 ? 'Idag' : `${daysLeft}d kvar`}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order, index }) {
  return (
    <div style={{
      backgroundColor: '#0f0f0f',
      border: '1px solid #1e1e1e',
      borderRadius: '10px',
      padding: 'clamp(10px, 1.2vw, 16px) clamp(14px, 2vw, 24px)',
      display: 'grid',
      gridTemplateColumns: '28px 1fr auto auto',
      alignItems: 'center',
      gap: 'clamp(8px, 1.5vw, 20px)',
      transition: 'border-color 0.2s',
    }}>
      {/* Index */}
      <span style={{
        fontSize: 'clamp(10px, 0.9vw, 12px)',
        fontWeight: 700,
        color: '#2a2a2a',
        fontFamily: 'monospace',
        textAlign: 'center',
      }}>
        {index}
      </span>

      {/* Customer + details */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 'clamp(13px, 1.4vw, 17px)',
          fontWeight: 700,
          color: '#fff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {order.customer_name}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
          {order.order_number && (
            <span style={{ fontSize: 'clamp(10px, 0.9vw, 12px)', color: '#444', fontFamily: 'monospace' }}>
              {order.order_number}
            </span>
          )}
          {order.fortnox_project_name && (
            <span style={{ fontSize: 'clamp(10px, 0.9vw, 12px)', color: '#2563eb' }}>
              {order.fortnox_project_name}
            </span>
          )}
        </div>
      </div>

      {/* Delivery */}
      <div style={{ minWidth: 'clamp(80px, 8vw, 120px)' }}>
        <DeliveryBadge dateStr={order.delivery_date} />
      </div>

      {/* Status */}
      <div style={{ minWidth: 'clamp(100px, 12vw, 180px)', textAlign: 'right' }}>
        <StatusBadge status={order.status} />
      </div>
    </div>
  );
}

function StatusGroup({ status, orders, globalStart }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#6b7280' };
  return (
    <div style={{ marginBottom: 'clamp(16px, 2vw, 28px)' }}>
      {/* Group header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '8px',
        paddingLeft: '4px',
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} />
        <span style={{ fontSize: 'clamp(11px, 1vw, 13px)', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {cfg.label}
        </span>
        <span style={{ fontSize: 'clamp(10px, 0.9vw, 12px)', color: '#333', marginLeft: '4px' }}>
          ({orders.length})
        </span>
      </div>
      {/* Orders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 0.8vw, 10px)' }}>
        {orders.map((order, i) => (
          <OrderRow key={order.id} order={order} index={globalStart + i} />
        ))}
      </div>
    </div>
  );
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

  // Group orders by status, sorted by delivery date within each group
  const grouped = STATUS_GROUP_ORDER.reduce((acc, status) => {
    const statusOrders = orders
      .filter(o => o.status === status)
      .sort((a, b) => {
        if (!a.delivery_date && !b.delivery_date) return 0;
        if (!a.delivery_date) return 1;
        if (!b.delivery_date) return -1;
        return new Date(a.delivery_date) - new Date(b.delivery_date);
      });
    if (statusOrders.length > 0) acc.push({ status, orders: statusOrders });
    return acc;
  }, []);

  // Also add any statuses not in our list
  const unknownOrders = orders.filter(o => !STATUS_GROUP_ORDER.includes(o.status));
  if (unknownOrders.length > 0) grouped.push({ status: 'draft', orders: unknownOrders });

  // Count total for running index
  let runningIndex = 1;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#080808',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: '#ffffff',
      padding: 'clamp(16px, 3vw, 48px) clamp(12px, 4vw, 48px)',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: 'clamp(20px, 3vw, 40px)',
        paddingBottom: 'clamp(16px, 2vw, 28px)',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <div>
          <h1 style={{ fontSize: 'clamp(22px, 3.5vw, 48px)', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            Order Dashboard
          </h1>
          <p style={{ fontSize: 'clamp(11px, 1.2vw, 16px)', color: '#444', margin: '4px 0 0 0' }}>
            Aktiva ordrar · IMvision
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Status legend */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[
              { label: 'Försenad', color: '#ef4444' },
              { label: '≤7 dagar', color: '#f97316' },
              { label: '≤14 dagar', color: '#eab308' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                <span style={{ fontSize: 'clamp(9px, 0.9vw, 11px)', color: '#555' }}>{item.label}</span>
              </div>
            ))}
          </div>
          <div style={{
            fontSize: 'clamp(12px, 1.3vw, 16px)',
            fontWeight: 700,
            color: '#2563eb',
            backgroundColor: '#2563eb15',
            border: '1px solid #2563eb30',
            borderRadius: '8px',
            padding: 'clamp(6px, 0.8vw, 10px) clamp(12px, 1.5vw, 20px)',
          }}>
            {orders.length} ordrar
          </div>
          {lastUpdated && (
            <span style={{ fontSize: 'clamp(10px, 0.9vw, 12px)', color: '#333' }}>
              {lastUpdated.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#333', fontSize: 'clamp(16px, 2vw, 24px)', paddingTop: '80px' }}>
          Laddar ordrar...
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#333', fontSize: 'clamp(16px, 2vw, 24px)', paddingTop: '80px' }}>
          Inga aktiva ordrar
        </div>
      ) : (
        <div>
          {grouped.map(({ status, orders: groupOrders }) => {
            const start = runningIndex;
            runningIndex += groupOrders.length;
            return (
              <StatusGroup key={status} status={status} orders={groupOrders} globalStart={start} />
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 'clamp(24px, 3vw, 48px)',
        paddingTop: 'clamp(12px, 1.5vw, 20px)',
        borderTop: '1px solid #141414',
        textAlign: 'center',
        color: '#222',
        fontSize: 'clamp(10px, 0.9vw, 12px)',
      }}>
        IMvision · Automatisk uppdatering var 30:e sekund
      </div>
    </div>
  );
}