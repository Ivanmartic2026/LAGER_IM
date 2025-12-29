import React from 'react';
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Calendar, Hash, ArrowRight, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function ArticleCard({ article, onClick }) {
  const getStatusConfig = (status) => {
    switch (status) {
      case "low_stock":
        return { label: "Lågt lager", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
      case "out_of_stock":
        return { label: "Slut i lager", color: "bg-red-500/20 text-red-400 border-red-500/30" };
      case "discontinued":
        return { label: "Utgått", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" };
      default:
        return { label: "I lager", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    }
  };

  const statusConfig = getStatusConfig(article.status);

  const hasLowStock = article.stock_qty <= (article.min_stock_level || 5);
  const imageUrl = article.image_urls?.[0] || article.image_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group p-4 rounded-xl cursor-pointer transition-all bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50"
    >
      <div className="flex items-start gap-3">
        {/* Image or Stock Display */}
        {imageUrl ? (
          <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-900/50 relative">
            <img 
              src={imageUrl} 
              alt={article.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 right-1 bg-slate-900/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs font-bold text-white">
              {article.stock_qty || 0}
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0 text-center w-16">
            <div className="text-2xl font-bold text-white leading-none mb-0.5">
              {article.stock_qty || 0}
            </div>
            <div className="text-xs text-slate-500">st</div>
          </div>
        )}

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white text-base truncate">
              {article.name}
            </h3>
            {article.status !== 'active' && (
              <Badge className={cn("text-xs border px-1.5 py-0", statusConfig.color)}>
                {statusConfig.label}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
            <span className="font-mono">#{article.batch_number}</span>
            {article.shelf_address && (
              <>
                <span>•</span>
                <MapPin className="w-3 h-3" />
                <span>{article.shelf_address}</span>
              </>
            )}
            {article.manufacturer && (
              <>
                <span>•</span>
                <span className="truncate">{article.manufacturer}</span>
              </>
            )}
          </div>

          {/* Additional info row */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {hasLowStock && article.stock_qty > 0 && (
              <div className="flex items-center gap-1 text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Lågt saldo</span>
              </div>
            )}
            {article.updated_date && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{format(new Date(article.updated_date), "d MMM", { locale: sv })}</span>
              </div>
            )}
            {article.notes && (
              <div className="flex items-center gap-1 text-blue-400">
                <span>📝</span>
                <span className="truncate max-w-[120px]">{article.notes}</span>
              </div>
            )}
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
      </div>
    </motion.div>
  );
}