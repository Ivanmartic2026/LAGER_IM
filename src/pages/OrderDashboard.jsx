import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const STAGES = ['KONSTRUKTION', 'PRODUKTION', 'LAGER', 'MONTERING', 'LEVERANS'];

const STAGE_COLORS = {
  'KONSTRUKTION': '#3b82f6',
  'PRODUKTION':   '#f97316',
  'LAGER':        '#eab308',
  'MONTERING':    '#22c55e',
  'LEVERANS':     '#8b5cf6',
};

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
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>
        {formatted}
      </div>
      <div style={{ fontSize: '11px', fontWeight: 600, color, opacity: 0.85 }}>
        {daysLeft < 0 ? `${Math.abs(daysLeft)}d försenad` : daysLeft === 0 ? 'Idag' : `${daysLeft}d kvar`}
      </div>
    </div>
  );
}


const STAGE_SHORT = {
  'KONSTRUKTION': 'KONSTR',
  'PRODUKTION':   'PROD',
  'LAGER':        'LAGER',
  'MONTERING':    'MONT',
  'LEVERANS':     'LEV',
};

const ALL_STAGES_ORDER = ['KONSTRUKTION', 'PRODUKTION', 'LAGER', 'MONTERING', 'LEVERANS'];

function StageProgressDots({ currentStage }) {
  const currentIdx = ALL_STAGES_ORDER.indexOf(currentStage);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
      {ALL_STAGES_ORDER.map((stage, idx) => {
        const done    = idx < currentIdx;
        const active  = idx === currentIdx;
        const color   = STAGE_COLORS[stage];
        return (
          <React.Fragment key={stage}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flex: 1 }}>
              <div style={{
                width:  active ? '10px' : '7px',
                height: active ? '10px' : '7px',
                borderRadius: '50%',
                backgroundColor: done ? color : active ? color : '#222',
                border: active ? `2px solid ${color}` : done ? 'none' : '1.5px solid #333',
                boxShadow: active ? `0 0 6px ${color}80` : 'none',
                transition: 'all 0.2s',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '9px',
                fontWeight: 700,
                color: done ? color : active ? color : '#333',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}>
                {STAGE_SHORT[stage]}
              </span>
            </div>
            {idx < ALL_STAGES_ORDER.length - 1 && (
              <div style={{
                height: '1.5px',
                flex: 0.3,
                backgroundColor: done ? STAGE_COLORS[ALL_STAGES_ORDER[idx]] : '#1e1e1e',
                marginBottom: '14px',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function OrderRow({ order }) {
  return (
    <div style={{
      padding: '10px 16px',
      backgroundColor: '#000000',
      borderRadius: '8px',
      border: '1px solid #1a1a1a',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '16px' }}>
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
          {order.fortnox_project_name && (
            <div style={{ fontSize: '11px', color: '#fff', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {order.customer_name}
            </div>
          )}
        </div>
        <DeliveryBadge dateStr={order.delivery_date} />
      </div>
      <StageProgressDots currentStage={order.status} />
    </div>
  );
}

function StatusGroup({ status, orders }) {
  const color = STAGE_COLORS[status] || '#6b7280';
  const [offset, setOffset] = useState(0);
  const intervalRef = useRef(null);

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

  const visibleCount = Math.min(sorted.length, ROWS_PER_GROUP);
  const visible = [];
  for (let i = 0; i < visibleCount; i++) {
    visible.push(sorted[(offset + i) % sorted.length]);
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', paddingLeft: '4px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {status}
          </span>
          <span style={{ fontSize: '13px', color: '#444', fontWeight: 600 }}>({orders.length})</span>
          {needsScroll && (
            <span style={{ fontSize: '11px', color: '#2a2a2a', marginLeft: '4px' }}>
              {offset + 1}–{Math.min(offset + ROWS_PER_GROUP, sorted.length)} / {sorted.length}
            </span>
          )}
        </div>
        <div style={{ height: '4px', borderRadius: '2px', backgroundColor: color, opacity: 0.85 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {visible.map((order, i) => (
          <OrderRow key={`${order.id}-${i}`} order={order} />
        ))}
      </div>
    </div>
  );
}

export default function OrderDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

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

  // Group by stage order
  const grouped = STAGES.reduce((acc, stage) => {
    const stageOrders = orders.filter(o => o.status === stage);
    if (stageOrders.length > 0) acc.push({ status: stage, orders: stageOrders });
    return acc;
  }, []);

  // Ignore orders with unknown/old statuses

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
        height: '40px',
        marginBottom: 'clamp(16px, 2vw, 28px)',
        paddingBottom: '12px',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <img
          src="https://media.base44.com/images/public/69455d52c9eab36b7d26cc74/60fb63701_LogoLIGGANDE_IMvision_VITtkopia.png"
          alt="IMvision"
          style={{ height: '26px', objectFit: 'contain', display: 'block' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '13px', color: '#444', fontWeight: 600 }}>{orders.length} ordrar</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
            {clock}
          </span>
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