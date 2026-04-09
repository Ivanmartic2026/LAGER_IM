import React from 'react';
import { MapPin, Calendar, Truck, FileText, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ProjectInfoCard({ order }) {
  if (!order) return null;

  // Determine delivery status
  const deliveryDate = order.delivery_date ? new Date(order.delivery_date) : null;
  const today = new Date();
  const daysUntilDelivery = deliveryDate ? Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24)) : null;
  
  let deliveryBadge = null;
  if (daysUntilDelivery !== null) {
    if (daysUntilDelivery < 0) {
      deliveryBadge = { label: 'FÖRSENAD', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    } else if (daysUntilDelivery <= 3) {
      deliveryBadge = { label: 'SNART', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-950/40 to-blue-900/20 border border-blue-500/30 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-400" />
        Projektinformation
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kundinformation */}
        <div className="space-y-3">
          <div>
            <p className="text-xs text-blue-300 mb-1">📋 Kundnamn</p>
            <p className="text-white font-medium">{order.customer_name || '—'}</p>
          </div>
          {order.customer_reference && (
            <div>
              <p className="text-xs text-blue-300 mb-1">Kundreferens</p>
              <p className="text-white font-medium">{order.customer_reference}</p>
            </div>
          )}
        </div>

        {/* Leveransinformation */}
        <div className="space-y-3">
          {order.delivery_date && (
            <div>
              <p className="text-xs text-blue-300 mb-1">📅 Leveransdatum</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-medium">
                  {format(new Date(order.delivery_date), 'd MMMM yyyy', { locale: sv })}
                </p>
                {deliveryBadge && (
                  <span className={cn('text-xs px-2 py-1 rounded font-semibold border', deliveryBadge.color)}>
                    {deliveryBadge.label}
                  </span>
                )}
              </div>
            </div>
          )}
          {order.delivery_method && (
            <div>
              <p className="text-xs text-blue-300 mb-1">🚚 Leveranssätt</p>
              <p className="text-white font-medium">
                {order.delivery_method}
                {order.shipping_company && ` (${order.shipping_company})`}
              </p>
            </div>
          )}
        </div>

        {/* Leveransadress */}
        {order.delivery_address && (
          <div className="md:col-span-2">
            <p className="text-xs text-blue-300 mb-1">📍 Leveransadress</p>
            <p className="text-white font-medium whitespace-pre-wrap text-sm">{order.delivery_address}</p>
          </div>
        )}

        {/* Anteckningar */}
        {order.notes && (
          <div className="md:col-span-2">
            <p className="text-xs text-blue-300 mb-1">📝 Anteckningar</p>
            <p className="text-white/80 text-sm whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        {/* Platsbesöksinfo */}
        {order.site_visit_info && (
          <div className="md:col-span-2">
            <p className="text-xs text-blue-300 mb-1">🏗️ Platsbesöksinfo</p>
            <p className="text-white/80 text-sm whitespace-pre-wrap">{order.site_visit_info}</p>
          </div>
        )}

        {/* Fortnox */}
        {(order.fortnox_project_number || order.fortnox_invoice_number || order.financial_status) && (
          <div className="md:col-span-2 pt-2 border-t border-blue-500/20">
            <p className="text-xs text-blue-300 mb-2">💼 Fortnox</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {order.fortnox_project_number && (
                <div>
                  <p className="text-blue-300/70">Projektnr</p>
                  <p className="text-white font-mono">{order.fortnox_project_number}</p>
                </div>
              )}
              {order.order_number && (
                <div>
                  <p className="text-blue-300/70">Ordernr</p>
                  <p className="text-white font-mono">{order.order_number}</p>
                </div>
              )}
              {order.financial_status && (
                <div>
                  <p className="text-blue-300/70">Status</p>
                  <p className="text-white">
                    {order.financial_status === 'unbilled' ? 'Ej fakturerad' :
                     order.financial_status === 'pending_billing' ? 'Väntar' : 'Fakturerad'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}