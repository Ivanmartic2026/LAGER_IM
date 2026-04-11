import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_MAP = {
  picked: { label: 'Plockat', cls: 'bg-green-500/20 border-green-500/30 text-green-400' },
  partial: { label: 'Delvis', cls: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
  pending: { label: 'Ej plockat', cls: 'bg-white/10 border-white/20 text-white/50' },
};

export default function MaterialsSection({ orderItems, articles }) {
  if (!orderItems?.length) return null;

  return (
    <div className="bg-black rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
        <Package className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-bold text-white">Material / Artiklar</h3>
        <span className="text-xs text-white/40 ml-1">({orderItems.length} rader)</span>
      </div>

      <div className="divide-y divide-white/5">
        {orderItems.map(item => {
          const article = articles?.find(a => a.id === item.article_id);
          const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.pending;
          const stockQty = article?.stock_qty ?? 0;
          const needed = item.quantity_ordered || 0;
          const shortage = needed - stockQty;

          return (
            <div key={item.id} className="px-5 py-3 flex items-center gap-3">
              {article?.image_urls?.[0] ? (
                <img src={article.image_urls[0]} alt={item.article_name}
                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-white/10" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-white/20" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.article_name || '—'}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {item.article_batch_number && (
                    <span className="text-[10px] text-white/30 font-mono">{item.article_batch_number}</span>
                  )}
                  {(item.shelf_address || article?.shelf_address?.[0]) && (
                    <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                      📦 {item.shelf_address || article.shelf_address[0]}
                    </span>
                  )}
                  {shortage > 0 && (
                    <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                      Brist: {shortage} st
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-white/50">Best:</span>
                  <span className="font-bold text-white">{item.quantity_ordered}</span>
                  {item.quantity_picked != null && item.quantity_picked > 0 && (
                    <>
                      <span className="text-white/30">·</span>
                      <span className="text-white/50">Plockat:</span>
                      <span className={cn("font-bold", item.quantity_picked >= item.quantity_ordered ? 'text-green-400' : 'text-amber-400')}>
                        {item.quantity_picked}
                      </span>
                    </>
                  )}
                </div>
                <Badge className={cn("text-[10px] px-1.5 py-0 border", statusInfo.cls)}>
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}