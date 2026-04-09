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

const STAGE_ICONS = {
  'KONSTRUKTION': '🔵',
  'PRODUKTION':   '🟠',
  'LAGER':        '🟡',
  'MONTERING':    '🟢',
  'LEVERANS':     '🟣',
};

function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
}

function getUrgency(order) {
  const days = getDaysLeft(order.delivery_date);
  if (days === null) return 2;
  if (days < 0) return 0;
  if (days <= 7) return 1;
  return 2;
}

function formatDate(dateStr) {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return d.toLocaleDateString('sv-SE');
}

function DeliveryInfo({ dateStr }) {
  const days = getDaysLeft(dateStr);
  if (days === null) return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '15px', color: '#555', fontWeight: 600 }}>–</div>
    </div>
  );

  let color = '#4ade80';
  let label = `${days}d kvar`;
  if (days < 0) { color = '#ef4444'; label = `${Math.abs(days)}d försenad`; }
  else if (days === 0) { color = '#f97316'; label = 'Idag'; }
  else if (days <= 7) { color = '#facc15'; label = `${days}d kvar`; }

  return (
    <div style={{ textAlign: 'right', minWidth: '110px' }}>
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
        {formatDate(dateStr)}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 700, color, marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );
}

function StageBadge({ stage }) {
  const color = STAGE_COLORS[stage] || '#6b7280';
  const icon = STAGE_ICONS[stage] || '⚪';
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '5px 12px',
      borderRadius: '20px',
      backgroundColor: `${color}22`,
      border: `1px solid ${color}66`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: '12px' }}>{icon.replace(/[^🔵🟠🟡🟢🟣⚪]/g, '')}{icon}</span>
      <span style={{ fontSize: '13px', fontWeight: 700, color, letterSpacing: '0.06em' }}>{stage || '–'}</span>
    </div>
  );
}

function OrderCard({ order, urgency }) {
  let borderColor = '#1e2a1e';
  if (urgency === 0) borderColor = '#7f1d1d';
  else if (urgency === 1) borderColor = '#78350f';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto auto',
      alignItems: 'center',
      gap: '16px',
      padding: '18px 24px',
      minHeight: '90px',
      borderBottom: `1px solid ${borderColor}`,
      backgroundColor: urgency === 0 ? 'rgba(239,68,68,0.06)' : urgency === 1 ? 'rgba(250,204,21,0.04)' : 'transparent',
    }}>
      {/* Left: names */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#ffffff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {order.fortnox_project_name || order.customer_name || '–'}
        </div>
        {order.fortnox_project_name && (
          <div style={{
            fontSize: '14px',
            color: '#6b7280',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: '3px',
          }}>
            {order.customer_name}
          </div>
        )}
      </div>

      {/* Middle: stage badge */}
      <StageBadge stage={order.status} />

      {/* Right: delivery */}
      <DeliveryInfo dateStr={order.delivery_date} />
    </div>
  );
}

export default function OrderDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  );
  const scrollRef = useRef(null);
  const scrollAnimRef = useRef(null);

  // Clock
  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch
  const fetchOrders = async () => {
    try {
      const res = await base44.functions.invoke('getPublicOrders', {});
      setOrders(res.data?.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let pos = 0;
    let paused = false;

    const scroll = () => {
      if (!paused && el) {
        pos += 0.8;
        if (pos >= el.scrollHeight - el.clientHeight) {
          pos = 0;
        }
        el.scrollTop = pos;
      }
      scrollAnimRef.current = requestAnimationFrame(scroll);
    };

    scrollAnimRef.current = requestAnimationFrame(scroll);

    // Pause on hover/touch
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('touchstart', pause);
    el.addEventListener('touchend', resume);

    return () => {
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('mouseleave', resume);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('touchend', resume);
    };
  }, [orders]);

  // Sort by urgency
  const sorted = [...orders].sort((a, b) => {
    const ua = getUrgency(a);
    const ub = getUrgency(b);
    if (ua !== ub) return ua - ub;
    const da = a.delivery_date ? new Date(a.delivery_date) : new Date('9999-12-31');
    const db = b.delivery_date ? new Date(b.delivery_date) : new Date('9999-12-31');
    return da - db;
  });

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0a0f1e',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px',
        flexShrink: 0,
        padding: '0 24px',
        backgroundColor: '#060b18',
        borderBottom: '1px solid #1a2340',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.12em', color: '#fff' }}>
            ORDERÖVERSIKT
          </span>
          <span style={{
            marginLeft: '10px',
            fontSize: '13px',
            color: '#3b4a6b',
            fontWeight: 600,
          }}>
            {orders.length} ordrar
          </span>
        </div>
        <div style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#fff',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.06em',
        }}>
          {clock}
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: '16px',
        padding: '10px 24px',
        backgroundColor: '#0d1426',
        borderBottom: '1px solid #1a2340',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '11px', color: '#3b4a6b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Projekt / Kund</span>
        <span style={{ fontSize: '11px', color: '#3b4a6b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Status</span>
        <span style={{ fontSize: '11px', color: '#3b4a6b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right' }}>Leverans</span>
      </div>

      {/* Scrollable list */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#3b4a6b', fontSize: '20px', paddingTop: '80px' }}>
            Laddar ordrar...
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#3b4a6b', fontSize: '20px', paddingTop: '80px' }}>
            Inga aktiva ordrar
          </div>
        ) : (
          sorted.map((order) => (
            <OrderCard key={order.id} order={order} urgency={getUrgency(order)} />
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        height: '36px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#060b18',
        borderTop: '1px solid #1a2340',
        color: '#1e2a4a',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.08em',
      }}>
        IMvision · Automatisk uppdatering var 30:e sekund
      </div>
    </div>
  );
}