import React from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OrderPickingHeader({ order }) {
  if (!order) return null;

  return (
    <div className="space-y-3 mb-6">
      {/* Delivery Address */}
      {order.delivery_address && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-blue-300 font-semibold mb-1">📦 LEVERANSADRESS</p>
              <p className="text-sm text-white whitespace-pre-wrap">{order.delivery_address}</p>
            </div>
          </div>
        </div>
      )}

      {/* Notes Banner */}
      {order.notes && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-amber-300 font-semibold mb-1">⚠️ OBS FRÅN SÄLJ</p>
              <p className="text-sm text-white whitespace-pre-wrap">{order.notes}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}