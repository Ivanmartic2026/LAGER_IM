import React from 'react';
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { 
  Package, MapPin, Calendar, AlertTriangle, Clock, 
  CheckCircle2, TrendingDown, Truck, Wrench, ArrowRight,
  Activity, HelpCircle
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  active:               { label: "I lager",           color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  low_stock:            { label: "Lågt lager",         color: "bg-amber-500/20 text-amber-400 border-amber-500/30",      icon: AlertTriangle },
  out_of_stock:         { label: "Slut i lager",       color: "bg-red-500/20 text-red-400 border-red-500/30",            icon: TrendingDown },
  in_transit:           { label: "Under transit",      color: "bg-blue-500/20 text-blue-400 border-blue-500/30",         icon: Truck },
  on_its_way_home:      { label: "På väg hem",         color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",         icon: Truck },
  on_repair:            { label: "Under reparation",   color: "bg-orange-500/20 text-orange-400 border-orange-500/30",   icon: Wrench },
  discontinued:         { label: "Utgått",             color: "bg-slate-500/20 text-slate-400 border-slate-500/30",      icon: Package },
  unknown_delivery:     { label: "Okänd leverans",     color: "bg-orange-500/20 text-orange-400 border-orange-500/30",   icon: HelpCircle },
  pending_verification: { label: "Väntar verifiering", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",   icon: Clock },
};

export default function ArticleCard({ article, onClick }) {
  const statusConfig = STATUS_CONFIG[article.status] || STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;
  const imageUrl = article.image_urls?.[0] || article.image_url;
  const shelfDisplay = Array.isArray(article.shelf_address)
    ? article.shelf_address.join(', ')
    : article.shelf_address;

  const hasIncoming = article.transit_expected_date;
  const isLow = article.stock_qty <= (article.min_stock_level || 0) && article.stock_qty > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group grid items-center gap-4 p-4 rounded-xl cursor-pointer transition-all bg-slate-800/30 border border-slate-700/50 hover:border-blue-500/30 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-blue-500/5"
      style={{ gridTemplateColumns: '72px 72px 1fr auto' }}
    >
      {/* Col 1: Image */}
      <div className="flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden bg-slate-900/60 border border-white/5 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={article.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-7 h-7 text-slate-600" />
        )}
      </div>

      {/* Col 2: Quantity */}
      <div className="flex flex-col items-center justify-center">
        <span className={cn(
          "text-3xl font-black leading-none tracking-tight",
          article.stock_qty === 0 ? "text-red-400" : isLow ? "text-amber-400" : "text-white"
        )}>
          {article.stock_qty ?? 0}
        </span>
        <span className="text-xs text-slate-500 mt-0.5 font-medium">st</span>
        {(article.reserved_stock_qty > 0) && (
          <span className="text-[10px] text-orange-400 mt-1 font-medium">
            {article.reserved_stock_qty} res.
          </span>
        )}
      </div>

      {/* Col 3: Article info */}
      <div className="min-w-0">
        <h3 className="font-semibold text-white text-sm leading-snug truncate mb-0.5">
          {article.customer_name || article.name}
        </h3>
        {article.name !== article.customer_name && article.customer_name && (
          <p className="text-xs text-slate-500 truncate mb-1">{article.name}</p>
        )}
        
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
          {article.sku && (
            <span className="font-mono text-blue-400">#{article.sku}</span>
          )}
          {!article.sku && article.batch_number && (
            <span className="font-mono text-blue-400">#{article.batch_number}</span>
          )}
          {article.supplier_name && (
            <span className="text-slate-500 truncate">{article.supplier_name}</span>
          )}
          {shelfDisplay && (
            <span className="flex items-center gap-1 text-slate-500">
              <MapPin className="w-3 h-3" />
              {shelfDisplay}
            </span>
          )}
        </div>

        {article.notes && (
          <p className="text-xs text-slate-600 truncate mt-1 max-w-[240px]">{article.notes}</p>
        )}
      </div>

      {/* Col 4: Status + Stock info */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 min-w-[160px]">
        {/* ETA-badge – visas när datum finns */}
        {article.transit_expected_date ? (
          <div className="flex flex-col items-end gap-0.5 bg-blue-600/20 border border-blue-500/30 rounded-xl px-3 py-2">
            <div className="flex items-center gap-1.5 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <Truck className="w-3 h-3" />
              ETA
            </div>
            <span className="text-white font-bold text-sm">
              {format(new Date(article.transit_expected_date), "d MMM yyyy", { locale: sv })}
            </span>
          </div>
        ) : (
          <Badge className={cn("text-xs border flex items-center gap-1 px-2 py-0.5", statusConfig.color)}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
        )}

        {/* Lågt saldo-varning (endast för active/low_stock) */}
        {isLow && article.status !== 'out_of_stock' && (
          <div className="flex items-center gap-1 text-[11px] text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            <span>Under miniminivå</span>
          </div>
        )}

        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors mt-0.5" />
      </div>
    </motion.div>
  );
}