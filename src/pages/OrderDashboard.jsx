import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const STAGE_COLORS = {
  'KONSTRUKTION': '#3b82f6',
  'PRODUKTION':   '#f97316',
  'LAGER':        '#eab308',
  'MONTERING':    '#22c55e',
  'LEVERANS':     '#8b5cf6',
};

const ACTIVE_STATUSES = ['KONSTRUKTION', 'PRODUKTION', 'LAGER', 'MONTERING'];

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
}

function urgencyScore(order) {
  const days = daysLeft(order.delivery_date);
  if (days === null) return 3;
  if (days < 0) return 0;
  if (days <= 7) return 1;
  return 2;
}

export default function OrderDashboard() {
  const [orders, setOrders] = useState([]);
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  );
  const scrollRef = useRef(null);
  const scrollTimerRef = useRef(null);

  // Clock
  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch orders
  const fetchOrders = async () => {
    const all = await base44.entities.Order.list('-updated_date', 200);
    const active = all.filter(o => ACTIVE_STATUSES.includes(o.status));
    setOrders(active);
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
    scrollTimerRef.current = setInterval(() => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
        el.scrollTop = 0;
      } else {
        el.scrollTop += 1;
      }
    }, 50);
    return () => clearInterval(scrollTimerRef.current);
  }, [orders]);

  const sortedOrders = [...orders].sort((a, b) => {
    const ua = urgencyScore(a);
    const ub = urgencyScore(b);
    if (ua !== ub) return ua - ub;
    const da = a.delivery_date ? new Date(a.delivery_date) : new Date('9999-12-31');
    const db = b.delivery_date ? new Date(b.delivery_date) : new Date('9999-12-31');
    return da - db;
  });

  return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <span style={{ color: 'white', fontSize: '20px', fontWeight: 700 }}>📋 ORDERÖVERSIKT</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#3b4a6b', fontSize: '13px', fontWeight: 600 }}>{orders.length} ordrar</span>
          <span style={{ color: '#94a3b8', fontSize: '28px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{clock}</span>
        </div>
      </div>

      {/* ORDERLISTA */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', scrollbarWidth: 'none' }}
      >
        <style>{`div::-webkit-scrollbar{display:none}`}</style>
        {sortedOrders.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#3b4a6b', fontSize: '18px', paddingTop: '80px' }}>
            Inga aktiva ordrar
          </div>
        ) : sortedOrders.map(order => {
          const days = daysLeft(order.delivery_date);
          const urgent = days !== null && days < 0;
          const soon = days !== null && days >= 0 && days <= 7;
          const stageName = order.status || '–';
          const stageColor = STAGE_COLORS[stageName] || '#6b7280';
          const leftBorder = urgent ? '#ef4444' : soon ? '#facc15' : '#22c55e';

          return (
            <div
              key={order.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #1e293b',
                borderLeft: `4px solid ${leftBorder}`,
                marginBottom: '2px',
                backgroundColor: urgent ? 'rgba(239,68,68,0.05)' : soon ? 'rgba(250,204,21,0.04)' : 'transparent',
              }}
            >
              {/* Vänster: namn + kund */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'white', fontSize: '18px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {order.fortnox_project_name || order.customer_name || order.order_number || '–'}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {order.fortnox_project_name ? order.customer_name : (order.order_number || '–')}
                </div>
              </div>

              {/* Mitten: stage-badge */}
              <div style={{
                padding: '6px 14px',
                borderRadius: '20px',
                background: stageColor + '22',
                border: `1px solid ${stageColor}66`,
                color: stageColor,
                fontSize: '13px',
                fontWeight: 700,
                margin: '0 20px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {stageName}
              </div>

              {/* Höger: datum */}
              <div style={{ textAlign: 'right', minWidth: '100px', flexShrink: 0 }}>
                <div style={{ color: 'white', fontSize: '15px', fontWeight: 600 }}>
                  {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('sv-SE') : '–'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: urgent ? '#ef4444' : soon ? '#facc15' : '#22c55e', marginTop: '2px' }}>
                  {days === null ? '' : days < 0 ? `${Math.abs(days)}d försenad` : days === 0 ? 'Idag' : `${days}d kvar`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div style={{ flexShrink: 0, textAlign: 'center', padding: '8px', color: '#1e2a4a', fontSize: '11px', borderTop: '1px solid #1e293b' }}>
        IMvision · Automatisk uppdatering var 30:e sekund
      </div>
    </div>
  );
}