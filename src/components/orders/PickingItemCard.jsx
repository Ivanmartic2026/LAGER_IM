import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MapPin, Package, CheckCircle2, AlertCircle, 
  ChevronDown, ChevronUp, Camera, Minus, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function PickingItemCard({ 
  item, 
  article, 
  onPick, 
  onScan, 
  isPicking,
  isExpanded,
  onToggleExpand
}) {
  const [quantity, setQuantity] = useState(1);
  const [optimisticPicked, setOptimisticPicked] = useState(item.quantity_picked || 0);
  const remaining = item.quantity_ordered - optimisticPicked;
  const isPicked = remaining === 0;
  const isPartial = optimisticPicked > 0 && remaining > 0;
  const hasLowStock = article && article.stock_qty < remaining;

  const handleQuickPick = () => {
    setOptimisticPicked(item.quantity_ordered);
    onPick(remaining);
  };

  const handleCustomPick = () => {
    if (quantity > 0 && quantity <= remaining) {
      setOptimisticPicked(optimisticPicked + quantity);
      onPick(quantity);
      setQuantity(1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border transition-all overflow-hidden",
        isPicked 
          ? "bg-green-500/10 border-green-500/30" 
          : isPartial
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-white/5 border-white/10"
      )}
    >
      {/* Main Content */}
      <div 
        className="p-4 cursor-pointer"
        onClick={!isPicked ? onToggleExpand : undefined}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Article Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-white text-base truncate">
                {item.article_name}
              </h3>
              {isPicked && <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />}
              {isPartial && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                  Delvis
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {item.article_batch_number && (
                <span className="font-mono text-slate-400">
                  {item.article_batch_number}
                </span>
              )}
              
              {item.shelf_address && (
                <div className="flex items-center gap-1.5 text-blue-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="font-semibold">{item.shelf_address}</span>
                </div>
              )}

              <div className={cn(
                "font-bold text-lg",
                isPicked ? "text-green-400" : "text-white"
              )}>
                {isPicked ? item.quantity_ordered : remaining} st
              </div>
            </div>

            {hasLowStock && !isPicked && (
              <div className="flex items-center gap-1.5 text-amber-400 text-xs mt-2 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1 w-fit">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Endast {article.stock_qty} st i lager</span>
              </div>
            )}

            {article?.image_urls?.[0] && isExpanded && (
              <div className="mt-3">
                <img 
                  src={article.image_urls[0]} 
                  alt={item.article_name}
                  className="w-full max-w-xs h-40 object-cover rounded-lg bg-slate-900"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          {!isPicked && (
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="text-slate-400 hover:text-white"
              >
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Actions */}
      <AnimatePresence>
        {isExpanded && !isPicked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-3 bg-black/20">
              {/* Quick Pick */}
              <div className="flex gap-2">
                <Button
                  onClick={handleQuickPick}
                  disabled={isPicking || remaining === 0}
                  className="flex-1 bg-green-600 hover:bg-green-500 h-12 text-base font-semibold"
                >
                  {isPicking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Plockar...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Plocka alla ({remaining} st)
                    </>
                  )}
                </Button>

                <Button
                  size="icon"
                  onClick={onScan}
                  disabled={isPicking}
                  className="bg-blue-600 hover:bg-blue-500 h-12 w-12"
                >
                  <Camera className="w-5 h-5" />
                </Button>
              </div>

              {/* Custom Quantity */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-800 rounded-lg border border-slate-600 overflow-hidden flex-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="h-10 w-10 rounded-none hover:bg-slate-700"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setQuantity(Math.min(remaining, Math.max(1, val)));
                    }}
                    min="1"
                    max={remaining}
                    className="border-0 text-center h-10 bg-transparent text-white font-semibold text-lg"
                  />
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setQuantity(Math.min(remaining, quantity + 1))}
                    disabled={quantity >= remaining}
                    className="h-10 w-10 rounded-none hover:bg-slate-700"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  onClick={handleCustomPick}
                  disabled={isPicking || quantity <= 0 || quantity > remaining}
                  className="bg-blue-600 hover:bg-blue-500 h-10 px-6"
                >
                  Plocka
                </Button>
              </div>

              {isPartial && (
                <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2">
                  {optimisticPicked} av {item.quantity_ordered} st redan plockade
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}