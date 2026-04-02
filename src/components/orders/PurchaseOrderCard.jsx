import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, Calendar, TrendingUp, CheckCircle2, 
  ShoppingCart, Trash2, XCircle, ChevronDown, ChevronUp,
  Sparkles, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function PurchaseOrderCard({ 
  order, 
  onApprove, 
  onMarkOrdered, 
  onReceive, 
  onCancel,
  onDelete,
  isUpdating 
}) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    pending: { 
      label: "Väntande", 
      color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      icon: AlertTriangle
    },
    approved: { 
      label: "Godkänd", 
      color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      icon: CheckCircle2
    },
    ordered: { 
      label: "Beställd", 
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: ShoppingCart
    },
    received: { 
      label: "Mottagen", 
      color: "bg-green-500/20 text-green-400 border-green-500/30",
      icon: Package
    },
    cancelled: { 
      label: "Avbruten", 
      color: "bg-red-500/20 text-red-400 border-red-500/30",
      icon: XCircle
    }
  };

  const priorityConfig = {
    low: { label: "Låg", color: "bg-slate-500/20 text-slate-400" },
    medium: { label: "Medel", color: "bg-blue-500/20 text-blue-400" },
    high: { label: "Hög", color: "bg-orange-500/20 text-orange-400" },
    urgent: { label: "Brådskande", color: "bg-red-500/20 text-red-400" }
  };

  const status = statusConfig[order.status] || statusConfig.pending;
  const priority = priorityConfig[order.priority] || priorityConfig.medium;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "rounded-2xl border transition-all",
        order.priority === 'urgent' 
          ? "bg-red-500/5 border-red-500/30"
          : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white">
                {order.article_name}
              </h3>
              <Badge className={cn("border text-xs", status.color)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              {order.priority !== 'medium' && (
                <Badge className={cn("border text-xs", priority.color)}>
                  {priority.label}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-400">
              Batch: {order.article_batch_number}
            </p>
          </div>

          <div className="text-right">
            <p className="text-3xl font-bold text-white">
              {order.suggested_quantity}
            </p>
            <p className="text-xs text-slate-400">st föreslagna</p>
          </div>
        </div>

        {/* Stock info */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
            <p className="text-xs text-slate-400 mb-1">Nuvarande lager</p>
            <p className="text-xl font-bold text-white">{order.current_stock}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
            <p className="text-xs text-slate-400 mb-1">Min. lagernivå</p>
            <p className="text-xl font-bold text-white">{order.min_stock_level}</p>
          </div>
        </div>

        {/* AI Reasoning - Collapsible */}
        {order.ai_reasoning && (
          <div className="mb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/15 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-200">AI-analys</span>
              </div>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-blue-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-blue-400" />
              )}
            </button>
            
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 p-3 rounded-lg bg-slate-900/50 border border-slate-700/30"
              >
                <p className="text-sm text-slate-300 whitespace-pre-wrap">
                  {order.ai_reasoning}
                </p>
              </motion.div>
            )}
          </div>
        )}

        {/* Additional info */}
        <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-4">
          {order.supplier && (
            <div className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              <span>{order.supplier}</span>
            </div>
          )}
          {order.estimated_delivery_date && order.status !== 'received' && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                Leverans: {format(new Date(order.estimated_delivery_date), "d MMM", { locale: sv })}
              </span>
            </div>
          )}
          {order.order_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                Beställd: {format(new Date(order.order_date), "d MMM", { locale: sv })}
              </span>
            </div>
          )}
          {order.estimated_cost && (
            <div className="flex items-center gap-1 font-semibold text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              <span>{Math.round(order.estimated_cost)} kr</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {order.status === 'pending' && (
            <>
              <Button
                size="sm"
                onClick={() => onApprove(order)}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Godkänn
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel(order)}
                disabled={isUpdating}
                className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
              >
                <XCircle className="w-3 h-3 mr-1" />
                Avbryt
              </Button>
            </>
          )}

          {order.status === 'approved' && (
            <Button
              size="sm"
              onClick={() => onMarkOrdered(order)}
              disabled={isUpdating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <ShoppingCart className="w-3 h-3 mr-1" />
              Markera som beställd
            </Button>
          )}

          {order.status === 'ordered' && (
            <Button
              size="sm"
              onClick={() => onReceive(order)}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              <Package className="w-3 h-3 mr-1" />
              Mottagen
            </Button>
          )}

          {(order.status === 'cancelled' || order.status === 'received') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(order)}
              disabled={isUpdating}
              className="bg-slate-800 border-slate-600 hover:bg-red-900/50 hover:border-red-500/50 text-white"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Ta bort
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}