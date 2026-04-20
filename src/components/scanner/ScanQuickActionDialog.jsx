import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MapPin, Package, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ScanQuickActionDialog({ batch, article, labelScanId, actions, onSelectAction, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        className="bg-slate-900 border border-signal/30 rounded-t-3xl md:rounded-2xl p-6 max-w-md w-full"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-signal/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-signal" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{article?.name || 'Okänd artikel'}</p>
              <p className="text-xs text-slate-400 font-mono">{batch?.batch_number || '—'}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-5 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
          {article?.stock_qty !== undefined && (
            <div className="text-center">
              <p className="text-lg font-bold text-white">{article.stock_qty}</p>
              <p className="text-xs text-slate-400">I lager</p>
            </div>
          )}
          {(article?.shelf_address?.length > 0 || article?.shelf_address) && (
            <div className="flex items-center gap-1 text-sm text-slate-300">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span className="font-mono text-xs">
                {Array.isArray(article.shelf_address) ? article.shelf_address[0] : article.shelf_address}
              </span>
            </div>
          )}
          {batch?.supplier_name && (
            <div className="text-center">
              <p className="text-xs text-slate-400">{batch.supplier_name}</p>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-300 mb-4 font-brand tracking-wide">VAD VILL DU GÖRA?</p>

        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onSelectAction(action.context)}
              className="flex items-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all text-left"
            >
              <action.icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-white font-brand tracking-wide">{action.label}</span>
            </button>
          ))}
        </div>

        <Button variant="ghost" onClick={onCancel} className="w-full mt-3 text-slate-500 hover:text-white">
          Avbryt
        </Button>
      </motion.div>
    </motion.div>
  );
}