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

function OrderRow({ order }) {
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
        {stageEmoji ? `${stageEmoji} ${stageName}` : stageName}
        </div>

        {/* Höger: datum */}
        <div style={{ textAlign: 'right', minWidth: '100px', flexShrink: 0 }}>
        <div style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
          {formatDateShort(order.delivery_date)}
        </div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: isIncoming ? '#64748b' : urgent ? '#ef4444' : soon ? '#facc15' : '#22c55e', marginTop: '1px' }}>
          {isIncoming ? 'Nyinkommen' : days === null ? '' : days < 0 ? `${Math.abs(days)}d försenad` : days === 0 ? 'Idag' : `${days}d kvar`}
        </div>
        </div>
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
                {groupedOrders.overdue.map(order => <OrderRow key={order.id} order={order} />)}
              </>
            )}
            {groupedOrders.soon.length > 0 && (
              <>
                <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '2px', padding: '4px', opacity: 0.5, color: '#facc15' }}>
                  ── SNART ({groupedOrders.soon.length}) ──
                </div>
                {groupedOrders.soon.map(order => <OrderRow key={order.id} order={order} />)}
              </>
            )}
            {groupedOrders.ongoing.length > 0 && (
              <>
                <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '2px', padding: '4px', opacity: 0.5, color: '#22c55e' }}>
                  ── PÅ GÅNG ({groupedOrders.ongoing.length}) ──
                </div>
                {groupedOrders.ongoing.map(order => <OrderRow key={order.id} order={order} />)}
              </>
            )}
            {groupedOrders.incoming.length > 0 && (
              <>
                <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '2px', padding: '4px', opacity: 0.5, color: '#64748b' }}>
                  ── INKOMMANDE ({groupedOrders.incoming.length}) ──
                </div>
                {groupedOrders.incoming.map(order => <OrderRow key={order.id} order={order} />)}
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