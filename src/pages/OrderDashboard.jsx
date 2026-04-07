import React, { useEffect, useState, useRef } from 'react';
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

const ROWS_PER_GROUP = 3;
const SCROLL_INTERVAL_MS = 3500;

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  return { formatted: d.toLocaleDateString('sv-SE'), daysLeft: diff };
}

function DeliveryBadge({ dateStr }) {
  const result = formatDate(dateStr);
  if (!result) return <span style={{ color: '#444', fontSize: '13px' }}>–</span>;
  const { formatted, daysLeft } = result;
  let color = '#aaa';
  if (daysLeft < 0) color = '#ef4444';
  else if (daysLeft <= 7) color = '#f97316';
  else if (daysLeft <= 14) color = '#eab308';

  return (
    <div style={{ textAlign: 'right', minWidth: '90px' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {formatted}
      </div>
      <div style={{ fontSize: '10px', color: color === '#aaa' ? '#444' : color }}>
        {daysLeft < 0 ? `${Math.abs(daysLeft)}d försenad` : daysLeft === 0 ? 'Idag' : `${daysLeft}d kvar`}
      </div>
    </div>
  );
}

function OrderRow({ order }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      alignItems: 'center',
      gap: '16px',
      padding: '10px 16px',
      backgroundColor: '#000000',
      borderRadius: '8px',
      border: '1px solid #1a1a1a',
      height: '56px',
      boxSizing: 'border-box',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#fff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {order.fortnox_project_name || order.customer_name}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
          {order.fortnox_project_name && (
            <span style={{ fontSize: '11px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {order.customer_name}
            </span>
          )}
        </div>
      </div>
      <DeliveryBadge dateStr={order.delivery_date} />
    </div>
  );
}

function StatusGroup({ status, orders }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#6b7280' };
  const [offset, setOffset] = useState(0);
  const intervalRef = useRef(null);

  // Sort by delivery date
  const sorted = [...orders].sort((a, b) => {
    if (!a.delivery_date && !b.delivery_date) return 0;
    if (!a.delivery_date) return 1;
    if (!b.delivery_date) return -1;
    return new Date(a.delivery_date) - new Date(b.delivery_date);
  });

  const needsScroll = sorted.length > ROWS_PER_GROUP;

  useEffect(() => {
    if (!needsScroll) return;
    intervalRef.current = setInterval(() => {
      setOffset(prev => (prev + 1) % sorted.length);
    }, SCROLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [sorted.length, needsScroll]);

  // Build visible window — only show as many rows as there are orders (max ROWS_PER_GROUP)
  const visibleCount = Math.min(sorted.length, ROWS_PER_GROUP);
  const visible = [];
  for (let i = 0; i < visibleCount; i++) {
    visible.push(sorted[(offset + i) % sorted.length]);
  }

  const ROW_H = 56;
  const GAP = 6;
  const containerH = visibleCount * ROW_H + (visibleCount - 1) * GAP;

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
        paddingLeft: '4px',
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {cfg.label}
        </span>
        <span style={{ fontSize: '11px', color: '#333' }}>({orders.length})</span>
        {needsScroll && (
          <span style={{ fontSize: '10px', color: '#2a2a2a', marginLeft: '4px' }}>
            {offset + 1}–{Math.min(offset + ROWS_PER_GROUP, sorted.length > ROWS_PER_GROUP ? sorted.length : ROWS_PER_GROUP)} / {sorted.length}
          </span>
        )}
      </div>

      {/* Rows container with clip */}
      <div style={{ height: `${containerH}px`, overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: `${GAP}px`,
            transition: needsScroll ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        >
          {visible.map((order, i) => (
            <OrderRow key={`${order.id}-${i}`} order={order} />
          ))}
        </div>
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

  const grouped = STATUS_GROUP_ORDER.reduce((acc, status) => {
    const statusOrders = orders.filter(o => o.status === status);
    if (statusOrders.length > 0) acc.push({ status, orders: statusOrders });
    return acc;
  }, []);

  const unknownOrders = orders.filter(o => !STATUS_GROUP_ORDER.includes(o.status));
  if (unknownOrders.length > 0) grouped.push({ status: 'draft', orders: unknownOrders });

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

          <div style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#2563eb',
            backgroundColor: '#2563eb15',
            border: '1px solid #2563eb30',
            borderRadius: '8px',
            padding: '8px 18px',
          }}>
            {orders.length} ordrar
          </div>
          {lastUpdated && (
            <span style={{ fontSize: '11px', color: '#333' }}>
              {lastUpdated.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#333', fontSize: '20px', paddingTop: '80px' }}>
          Laddar ordrar...
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#333', fontSize: '20px', paddingTop: '80px' }}>
          Inga aktiva ordrar
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 'clamp(16px, 2vw, 28px)',
          alignItems: 'start',
        }}>
          {grouped.map(({ status, orders: groupOrders }) => (
            <StatusGroup key={status} status={status} orders={groupOrders} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 'clamp(24px, 3vw, 48px)',
        paddingTop: 'clamp(12px, 1.5vw, 20px)',
        borderTop: '1px solid #141414',
        textAlign: 'center',
        color: '#222',
        fontSize: '11px',
      }}>
        IMvision · Automatisk uppdatering var 30:e sekund
      </div>
    </div>
  );
}