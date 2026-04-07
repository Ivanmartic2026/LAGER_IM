import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const STAGES = ['SÄLJ', 'KONSTRUKTION', 'PRODUKTION', 'LAGER', 'MONTERING'];

const STAGE_COLORS = {
  'SÄLJ':         '#8b5cf6',
  'KONSTRUKTION': '#3b82f6',
  'PRODUKTION':   '#f97316',
  'LAGER':        '#eab308',
  'MONTERING':    '#22c55e',
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

function StageProgressBar({ selectedStages = [] }) {
  const completedCount = selectedStages.length;
  const totalStages = STAGES.length;
  const percentage = Math.round((completedCount / totalStages) * 100);
  
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#aaa' }}>
          {percentage}% färdig
        </span>
        <span style={{ fontSize: '12px', color: '#666' }}>
          {completedCount} av {totalStages} steg
        </span>
      </div>
      
      {/* Progress bar */}
      <div style={{
        width: '100%',
        height: '12px',
        borderRadius: '20px',
        backgroundColor: '#1a1a1a',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: '16px',
      }}>
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: `linear-gradient(90deg, #2563eb 0%, #06b6d4 50%, #10b981 100%)`,
            borderRadius: '20px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      
      {/* Milestone labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '4px',
      }}>
        {STAGES.map((stage, idx) => {
          const isCompleted = selectedStages.includes(stage);
          return (
            <div
              key={stage}
              style={{
                flex: 1,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isCompleted ? STAGE_COLORS[stage] : '#555',
                  backgroundColor: isCompleted ? `${STAGE_COLORS[stage]}15` : 'transparent',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  border: isCompleted ? `1px solid ${STAGE_COLORS[stage]}40` : '1px solid transparent',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {stage}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderRow({ order }) {
  const selectedStages = Array.isArray(order.selected_stages) ? order.selected_stages : [];
  
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
      <StageProgressBar selectedStages={selectedStages} />
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingLeft: '4px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
        <span style={{ fontSize: '12px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {status}
        </span>
        <span style={{ fontSize: '11px', color: '#333' }}>({orders.length})</span>
        {needsScroll && (
          <span style={{ fontSize: '10px', color: '#2a2a2a', marginLeft: '4px' }}>
            {offset + 1}–{Math.min(offset + ROWS_PER_GROUP, sorted.length)} / {sorted.length}
          </span>
        )}
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

  // Orders with unknown/old statuses
  const unknownOrders = orders.filter(o => !STAGES.includes(o.status));
  if (unknownOrders.length > 0) grouped.push({ status: 'ÖVRIGT', orders: unknownOrders });

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
          <img
            src="https://media.base44.com/images/public/69455d52c9eab36b7d26cc74/60fb63701_LogoLIGGANDE_IMvision_VITtkopia.png"
            alt="IMvision"
            style={{ height: 'clamp(28px, 3vw, 48px)', objectFit: 'contain', display: 'block', marginBottom: '6px' }}
          />
          <p style={{ fontSize: 'clamp(11px, 1.2vw, 16px)', color: '#444', margin: 0 }}>
            Order Dashboard · Aktiva ordrar
          </p>
        </div>

        {/* Stage legend */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {STAGES.map(stage => (
            <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STAGE_COLORS[stage] }} />
              <span style={{ fontSize: '11px', color: '#555', fontWeight: 600 }}>{stage}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            fontSize: '15px', fontWeight: 700, color: '#2563eb',
            backgroundColor: '#2563eb15', border: '1px solid #2563eb30',
            borderRadius: '8px', padding: '8px 18px',
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