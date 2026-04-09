import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function PODashboard() {
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date'),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const statusCounts = {
    draft: purchaseOrders.filter(po => po.status === 'draft').length,
    sent: purchaseOrders.filter(po => po.status === 'sent').length,
    confirmed: purchaseOrders.filter(po => po.status === 'confirmed').length,
    in_production: purchaseOrders.filter(po => po.status === 'in_production').length,
    shipped: purchaseOrders.filter(po => po.status === 'shipped').length,
    received: purchaseOrders.filter(po => po.status === 'received').length,
  };

  const upcomingDeliveries = purchaseOrders.filter(po => {
    if (!po.expected_delivery_date || po.status === 'received') return false;
    const eta = new Date(po.expected_delivery_date);
    eta.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((eta - today) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 14;
  });

  const overdueDeliveries = purchaseOrders.filter(po => {
    if (!po.expected_delivery_date || po.status === 'received') return false;
    const eta = new Date(po.expected_delivery_date);
    eta.setHours(0, 0, 0, 0);
    return eta < today;
  });

  const outstandingByAmount = {};
  purchaseOrders.forEach(po => {
    const currency = po.invoice_currency || 'SEK';
    if (po.status !== 'received' && po.total_cost) {
      outstandingByAmount[currency] = (outstandingByAmount[currency] || 0) + po.total_cost;
    }
  });

  const cards = [
    {
      label: 'Utkast',
      count: statusCounts.draft,
      icon: ShoppingCart,
      color: 'slate',
    },
    {
      label: 'Skickad',
      count: statusCounts.sent,
      icon: ShoppingCart,
      color: 'blue',
    },
    {
      label: 'Bekräftad',
      count: statusCounts.confirmed,
      icon: ShoppingCart,
      color: 'cyan',
    },
    {
      label: 'Under produktion',
      count: statusCounts.in_production,
      icon: ShoppingCart,
      color: 'purple',
    },
    {
      label: 'Skickad / I transit',
      count: statusCounts.shipped,
      icon: ShoppingCart,
      color: 'violet',
    },
    {
      label: 'Mottagen',
      count: statusCounts.received,
      icon: ShoppingCart,
      color: 'emerald',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(({ label, count, color }) => (
          <div
            key={label}
            className={cn(
              'p-4 rounded-xl border text-center',
              color === 'slate' && 'bg-slate-500/10 border-slate-500/30',
              color === 'blue' && 'bg-blue-500/10 border-blue-500/30',
              color === 'cyan' && 'bg-cyan-500/10 border-cyan-500/30',
              color === 'purple' && 'bg-purple-500/10 border-purple-500/30',
              color === 'violet' && 'bg-violet-500/10 border-violet-500/30',
              color === 'emerald' && 'bg-emerald-500/10 border-emerald-500/30',
            )}
          >
            <p className="text-2xl font-bold text-white mb-1">{count}</p>
            <p className="text-xs text-white/60">{label}</p>
          </div>
        ))}
      </div>

      {/* Upcoming & Overdue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Deliveries */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-white">Kommande leveranser (14 dagar)</h3>
          </div>
          {upcomingDeliveries.length === 0 ? (
            <p className="text-sm text-white/40">Inga kommande leveranser</p>
          ) : (
            <div className="space-y-2">
              {upcomingDeliveries.map(po => {
                const eta = new Date(po.expected_delivery_date);
                const daysUntil = Math.ceil((eta - today) / (1000 * 60 * 60 * 24));
                return (
                  <div key={po.id} className="text-sm p-2 rounded bg-amber-500/10 border border-amber-500/20">
                    <div className="font-medium text-white">{po.po_number} - {po.supplier_name}</div>
                    <div className="text-xs text-amber-300">{daysUntil}d kvar • {format(eta, 'd MMM', { locale: sv })}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Overdue Deliveries */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="font-semibold text-white">Försenade leveranser</h3>
          </div>
          {overdueDeliveries.length === 0 ? (
            <p className="text-sm text-white/40">Inga försenade leveranser</p>
          ) : (
            <div className="space-y-2">
              {overdueDeliveries.map(po => {
                const eta = new Date(po.expected_delivery_date);
                const daysSince = Math.ceil((today - eta) / (1000 * 60 * 60 * 24));
                return (
                  <div key={po.id} className="text-sm p-2 rounded bg-red-500/10 border border-red-500/20">
                    <div className="font-medium text-white">{po.po_number} - {po.supplier_name}</div>
                    <div className="text-xs text-red-300">{daysSince}d försenad • Förväntad {format(eta, 'd MMM', { locale: sv })}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Outstanding Amount */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Utestående belopp per valuta</h3>
        </div>
        {Object.keys(outstandingByAmount).length === 0 ? (
          <p className="text-sm text-white/40">Inga utestående belopp</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(outstandingByAmount).map(([currency, amount]) => (
              <div key={currency} className="text-sm p-2 rounded bg-blue-500/10 border border-blue-500/20 flex justify-between">
                <span className="text-white">{currency}</span>
                <span className="font-semibold text-blue-300">{amount.toLocaleString('sv-SE')} {currency}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}