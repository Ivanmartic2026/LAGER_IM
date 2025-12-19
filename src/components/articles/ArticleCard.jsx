import React from 'react';
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Calendar, Hash, ArrowRight } from "lucide-react";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={cn(
        "group p-5 rounded-2xl cursor-pointer transition-all duration-300",
        "bg-gradient-to-br from-slate-800/80 to-slate-800/40",
        "border border-slate-700/50 hover:border-slate-600",
        "hover:shadow-lg hover:shadow-blue-500/5"
      )}
    >
      <div className="flex items-start gap-4">
        {article.image_url ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-700 flex-shrink-0">
            <img 
              src={article.image_url} 
              alt={article.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl bg-slate-700/50 flex items-center justify-center flex-shrink-0">
            <Package className="w-7 h-7 text-slate-500" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                {article.name}
              </h3>
              <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Hash className="w-3.5 h-3.5" />
                {article.batch_number}
              </p>
            </div>
            <Badge className={cn("border flex-shrink-0", statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mt-3">
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              <span className="font-medium text-white">{article.stock_qty || 0}</span> st
            </div>
            
            {article.shelf_address && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>{article.shelf_address}</span>
              </div>
            )}

            {article.manufacturer && (
              <div className="flex items-center gap-1.5">
                <span>{article.manufacturer}</span>
              </div>
            )}
          </div>
        </div>

        <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>
    </motion.div>
  );
}