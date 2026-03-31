import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MaterialStatus({ materials = [] }) {
  if (!materials || materials.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-yellow-400" />
          Materialstatus
        </h2>
        <p className="text-white/50 text-sm">Ingen materialinformation tillgänglig än</p>
      </div>
    );
  }

  const allReady = materials.every(m => m.in_stock >= m.quantity);
  const needsPurchase = materials.filter(m => m.needs_purchase).length;

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-yellow-400" />
          Materialstatus
        </h2>
        {allReady && (
          <Badge className="bg-green-500/20 border-green-500/30 text-green-400 border">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Allt klart
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {materials.map((material, idx) => {
          const inStock = material.in_stock >= material.quantity;
          const status = inStock ? 'I lager' : material.needs_purchase ? 'Saknas' : 'På väg';
          const statusColor = inStock ? 'text-green-400' : material.needs_purchase ? 'text-red-400' : 'text-yellow-400';

          return (
            <div key={idx} className={cn("p-3 rounded-lg border", 
              inStock ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{material.article_name}</p>
                  <p className={cn("text-xs mt-1", statusColor)}>
                    Behövs: {material.quantity} st | I lager: {material.in_stock} st
                    {material.missing > 0 && ` | Saknas: ${material.missing} st`}
                  </p>
                </div>
                <Badge className={cn("border whitespace-nowrap",
                  inStock ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                  material.needs_purchase ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                  'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                )}>
                  {status}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {needsPurchase > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <p className="text-sm text-orange-400">{needsPurchase} artikel(ar) måste köpas in</p>
        </div>
      )}
    </div>
  );
}