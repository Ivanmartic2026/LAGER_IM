import React, { useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MaterialStatus({ materials = [], orderItems = [] }) {
  // Fetch all articles to enrich materials with ETA data
  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Enrich materials with article ETA data
  const enrichedMaterials = useMemo(() => {
    return materials.map(material => {
      if (!material.article_id) return material;
      
      const article = articles.find(a => a.id === material.article_id);
      return {
        ...material,
        transit_expected_date: article?.transit_expected_date || material.transit_expected_date
      };
    });
  }, [materials, articles]);

  if (!enrichedMaterials || enrichedMaterials.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-yellow-400" />
          Material Status
        </h2>
        <p className="text-white/50 text-sm">No material information available yet</p>
      </div>
    );
  }

  const allReady = enrichedMaterials.every(m => m.in_stock >= m.quantity);
  const needsPurchase = enrichedMaterials.filter(m => m.needs_purchase).length;

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-yellow-400" />
          Material Status
        </h2>
        {allReady && (
          <Badge className="bg-green-500/20 border-green-500/30 text-green-400 border">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            All ready
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {enrichedMaterials.map((material, idx) => {
          const inStock = material.in_stock >= material.quantity;
          const status = inStock ? 'In Stock' : material.needs_purchase ? 'Missing' : 'On the way';
          const statusColor = inStock ? 'text-green-400' : material.needs_purchase ? 'text-red-400' : 'text-yellow-400';
          const eta = material.transit_expected_date || material.eta;

          return (
            <div key={idx} className={cn("p-3 rounded-lg border", 
              inStock ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{material.article_name}</p>
                  <p className={cn("text-xs mt-1", statusColor)}>
                    Needed: {material.quantity} pcs | In stock: {material.in_stock} pcs
                    {material.missing > 0 && ` | Missing: ${material.missing} pcs`}
                  </p>
                  {eta && !inStock && (
                    <p className="text-xs mt-1 text-blue-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      ETA: <strong>{eta}</strong>
                    </p>
                  )}
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
          <p className="text-sm text-orange-400">{needsPurchase} article(s) need to be purchased</p>
        </div>
      )}
    </div>
  );
}