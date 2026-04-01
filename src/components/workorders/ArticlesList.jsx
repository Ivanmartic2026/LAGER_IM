import React from 'react';
import { Package, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ArticlesList({ items = [], articles = [] }) {
  const navigate = useNavigate();
  if (items.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
      <h2 className="font-bold text-white mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-white/60" />
        Artiklar ({items.length})
      </h2>
      <div className="space-y-2">
        {items.map(item => {
          const article = articles.find(a => a.id === item.article_id);
          const missing = item.quantity_ordered - (item.quantity_picked || 0);
          const status = item.status === 'picked' ? 'Klar' : missing > 0 ? `Saknas ${missing}` : 'Delvis';

          return (
            <div key={item.id} className={cn(
              "flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-white/10 transition-colors",
              item.status === 'picked' ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10'
            )} onClick={() => navigate(createPageUrl(`Inventory?id=${item.article_id}`))}>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{item.article_name}</p>
                {article?.shelf_address?.[0] && (
                  <p className="text-white/40 text-xs mt-1">{article.shelf_address[0]}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm">{item.quantity_ordered} st</span>
                <Badge className={cn("border",
                  item.status === 'picked' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                  missing > 0 ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                  'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                )}>
                  {status}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}