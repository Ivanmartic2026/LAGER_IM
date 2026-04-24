import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const STAGE_COLORS = {
  'KONSTRUKTION': '#3b82f6',
  'PRODUKTION':   '#f97316',
  'LAGER':        '#eab308',
  'MONTERING':    '#22c55e',
  'LEVERANS':     '#8b5cf6',
  'INKOMMANDE':   '#64748b',
};

const STAGE_EMOJI = {
  'KONSTRUKTION': '📐',
  'PRODUKTION':   '🔧',
  'LAGER':        '📦',
  'MONTERING':    '🔩',
  'LEVERANS':     '🚚',
};

// Map raw status values to normalized Swedish stage keys
function resolveStage(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (s === 'konstruktion') return 'KONSTRUKTION';
  if (s === 'produktion' || s === 'production') return 'PRODUKTION';
  if (s === 'lager' || s === 'picked' || s === 'picking') return 'LAGER';
  if (s === 'montering') return 'MONTERING';
  if (s === 'leverans' || s === 'delivery' || s === 'completed') return 'LEVERANS';
  return raw.toUpperCase();
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
}

// 0=overdue, 1=soon, 2=normal, 3=incoming (no date)
function urgencyScore(order, isIncoming) {
  if (isIncoming) return 4;
  const days = daysLeft(order.delivery_date);
  if (days === null) return 3;
  if (days < 0) return 0;
  if (days <= 7) return 1;
  return 2;
}

// Format date as "9 apr" or "30 apr"
function formatDateShort(dateStr) {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

// Check if customer name is just a number
function isNumericCustomerName(name) {
  return name && /^\d+$/.test(name);
}

function OrderRow({ order, navigate }) {
  const days = order._isIncoming ? null : daysLeft(order.delivery_date);
  const urgent = days !== null && days < 0;
  const soon = days !== null && days >= 0 && days <= 7;
  const isIncoming = order._isIncoming;
  const stageName = order._stage;
  const stageColor = STAGE_COLORS[stageName] || '#6b7280';
  const stageEmoji = STAGE_EMOJI[stageName] || '';
  const leftBorder = isIncoming ? '#334155' : urgent ? '#ef4444' : soon ? '#facc15' : '#22c55e';
  const customerName = order.fortnox_project_name ? order.customer_name : (order.order_number || '–');
  const showCustomer = order.fortnox_project_name && !isNumericCustomerName(customerName);

  return (
    <div
      onClick={() => navigate(`/OrderDetail?id=${order.id}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        minHeight: '56px',
        borderBottom: '1px solid #1e293b',
        borderLeft: `4px solid ${leftBorder}`,
        marginBottom: '2px',
        backgroundColor: urgent ? 'rgba(239,68,68,0.05)' : soon ? 'rgba(250,204,21,0.04)' : 'transparent',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = urgent ? 'rgba(239,68,68,0.05)' : soon ? 'rgba(250,204,21,0.04)' : 'transparent';
      }}
    >
      {/* Vänster: namn + kund */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'white', fontSize: '16px', fontWeight: 700, whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {order.fortnox_project_name || order.customer_name || order.order_number || '–'}
        </div>
        {(order.customer_name || order.order_number) && (
          <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '2px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
            {order.customer_name || order.order_number}
          </div>
        )}
      </div>

      {/* Höger: status badge + datum */}
       <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
         {/* Status Badge */}
         <div style={{
           display: 'flex',
           alignItems: 'center',
           gap: '4px',
           padding: '4px 8px',
           borderRadius: '6px',
           backgroundColor: stageColor + '20',
           border: `1px solid ${stageColor}40`,
           minWidth: '90px',
           justifyContent: 'center'
         }}>
           <span style={{ fontSize: '14px' }}>{stageEmoji}</span>
           <span style={{ color: stageColor, fontSize: '11px', fontWeight: 700 }}>
             {stageName}
           </span>
         </div>
         {/* Datum */}
         <div style={{ textAlign: 'right', minWidth: '70px' }}>
           <div style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
             {formatDateShort(order.delivery_date)}
           </div>
           <div style={{ fontSize: '12px', fontWeight: 700, color: isIncoming ? '#64748b' : urgent ? '#ef4444' : soon ? '#facc15' : '#22c55e', marginTop: '1px' }}>
             {isIncoming ? 'Nyinkommen' : days === null ? '' : days < 0 ? `${Math.abs(days)}d försenad` : days === 0 ? 'Idag' : `${days}d kvar`}
           </div>
         </div>
       </div>
      </div>
      );
      }

export default function OrderDashboard() {
  const navigate = useNavigate();
  const [enrichedOrders, setEnrichedOrders] = useState([]);
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  );
  const [, setFullscreenToggle] = useState(false);
  const scrollRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const containerRef = useRef(null);

  // Clock
  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch orders + work orders, enrich
  const fetchOrders = async () => {
    let orders = [];
    let workOrders = [];

    try {
      const res = await base44.functions.invoke('getPublicOrders', {});
      const data = res.data || {};
      orders = data.orders || [];
      workOrders = data.workOrders || [];
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }

    // Build a map: order_id -> workOrder (most recent)
    const woMap = {};
    for (const wo of workOrders) {
      if (wo.order_id && !woMap[wo.order_id]) {
        woMap[wo.order_id] = wo;
      }
    }

    // Filter out completed/cancelled orders (SÄLJJ done etc), keep all active
    const EXCLUDE = ['SÄLJ'];
    const active = orders.filter(o => !EXCLUDE.includes(o.status));

    const enriched = active.map(order => {
      const wo = woMap[order.id];
      if (!wo) {
        return { ...order, _stage: 'INKOMMANDE', _isIncoming: true };
      }
      // Resolve stage from WorkOrder's current_stage or status
      const rawStage = wo.current_stage || wo.status || order.status;
      const stage = resolveStage(rawStage) || 'INKOMMANDE';
      return { ...order, _stage: stage, _isIncoming: false };
    });

    // Sort
    enriched.sort((a, b) => {
      const ua = urgencyScore(a, a._isIncoming);
      const ub = urgencyScore(b, b._isIncoming);
      if (ua !== ub) return ua - ub;
      const da = a.delivery_date ? new Date(a.delivery_date) : new Date('9999-12-31');
      const db = b.delivery_date ? new Date(b.delivery_date) : new Date('9999-12-31');
      return da - db;
    });

    setEnrichedOrders(enriched);
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
    clearInterval(scrollTimerRef.current);
    scrollTimerRef.current = setInterval(() => {
      if (scrollRef.current) {
        const el = scrollRef.current;
        if (el.scrollTop >= el.scrollHeight - el.clientHeight) {
          el.scrollTop = 0;
        } else {
          el.scrollTop += 1;
        }
      }
    }, 80);
    return () => clearInterval(scrollTimerRef.current);
  }, [enrichedOrders]);

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
    setFullscreenToggle(prev => !prev);
  };

  // Calculate summary counts
  const overdue = enrichedOrders.filter(o => !o._isIncoming && daysLeft(o.delivery_date) < 0).length;
  const soon = enrichedOrders.filter(o => !o._isIncoming && daysLeft(o.delivery_date) >= 0 && daysLeft(o.delivery_date) <= 7).length;
  const ongoing = enrichedOrders.filter(o => !o._isIncoming && daysLeft(o.delivery_date) > 7).length;
  const incoming = enrichedOrders.filter(o => o._isIncoming).length;

  // Group orders by urgency
  const groupedOrders = {
    overdue: enrichedOrders.filter(o => !o._isIncoming && daysLeft(o.delivery_date) < 0),
    soon: enrichedOrders.filter(o => !o._isIncoming && daysLeft(o.delivery_date) >= 0 && daysLeft(o.delivery_date) <= 7),
    ongoing: enrichedOrders.filter(o => !o._isIncoming && daysLeft(o.delivery_date) > 7),
    incoming: enrichedOrders.filter(o => o._isIncoming),
  };

  return (
    <div ref={containerRef} style={{ background: '#0a0f1e', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <span style={{ color: 'white', fontSize: '20px', fontWeight: 700 }}>📋 ORDERÖVERSIKT</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#3b4a6b', fontSize: '13px', fontWeight: 600 }}>{enrichedOrders.length} ordrar</span>
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#94a3b8',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {document.fullscreenElement ? '⛌' : '⛶'}
          </button>
          <span style={{ color: '#94a3b8', fontSize: '28px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', cursor: 'help' }} title="Tid sedan senaste uppdatering">{clock}</span>
        </div>
      </div>

      {/* SUMMARY ROW */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', padding: '4px 24px', borderBottom: '1px solid #1e293b', fontSize: '12px', fontWeight: 600, color: '#94a3b8', flexShrink: 0 }}>
        <span>🔴 {overdue} försenade</span>
        <span>🟡 {soon} snart</span>
        <span>🟢 {ongoing} på gång</span>
        <span>⬜ {incoming} inkommande</span>
      </div>

      {/* ORDERLISTA */}
      <div
        ref={scrollRef}
        style={{ flex: '1 1 0', height: 0, overflowY: 'auto', padding: '8px 16px', scrollbarWidth: 'none' }}
      >
        <style>{`div::-webkit-scrollbar{display:none}`}</style>
        {enrichedOrders.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#3b4a6b', fontSize: '18px', paddingTop: '80px' }}>
            Inga aktiva ordrar
          </div>
        ) : (
          <>
            {groupedOrders.overdue.length > 0 && (
              <>
                <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '2px', padding: '4px', opacity: 0.5, color: '#ef4444' }}>
                   ── FÖRSENADE ({groupedOrders.overdue.length}) ──
                 </div>
                 {groupedOrders.overdue.map(order => <OrderRow key={order.id} order={order} navigate={navigate} />)}
              </>
            )}
            {groupedOrders.soon.length > 0 && (
              <>
                <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '2px', padding: '4px', opacity: 0.5, color: '#facc15' }}>
                   ── SNART ({groupedOrders.soon.length}) ──
                 </div>
                 {groupedOrders.soon.map(order => <OrderRow key={order.id} order={order} navigate={navigate} />)}
              </>
            )}
            {groupedOrders.ongoing.length > 0 && (
              <>
                <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '2px', padding: '4px', opacity: 0.5, color: '#22c55e' }}>
                   ── PÅ GÅNG ({groupedOrders.ongoing.length}) ──
                 </div>
                 {groupedOrders.ongoing.map(order => <OrderRow key={order.id} order={order} navigate={navigate} />)}
              </>
            )}
            {groupedOrders.incoming.length > 0 && (
              <>
                <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '2px', padding: '4px', opacity: 0.5, color: '#64748b' }}>
                   ── INKOMMANDE ({groupedOrders.incoming.length}) ──
                 </div>
                 {groupedOrders.incoming.map(order => <OrderRow key={order.id} order={order} navigate={navigate} />)}
              </>
            )}
          </>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ flexShrink: 0, textAlign: 'center', padding: '8px', color: '#1e2a4a', fontSize: '11px', borderTop: '1px solid #1e293b' }}>
        IMvision · Automatisk uppdatering var 30:e sekund
      </div>
    </div>
  );
}