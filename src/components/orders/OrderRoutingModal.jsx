import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Truck, Factory, Zap, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderRoutingModal({ order, onRoute, onDownload, isDownloading }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-6 bg-slate-900/80 border border-white/10 rounded-2xl p-6"
    >
      <div className="flex flex-col items-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-1">Plockning klar!</h3>
        <p className="text-white/50 text-sm text-center">Vad ska hända med ordern nu?</p>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        {/* Option 1: Deliver directly */}
        <button
          onClick={() => onRoute('delivered')}
          className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Leverera direkt</p>
            <p className="text-white/50 text-xs">Ordern är redo att skickas — hoppa över produktion</p>
          </div>
        </button>

        {/* Option 2: To production */}
        <button
          onClick={() => onRoute('in_production')}
          className="flex items-center gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Factory className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Till produktion</p>
            <p className="text-white/50 text-xs">Kräver montering eller bearbetning innan leverans</p>
          </div>
        </button>

        {/* Option 3: Both parallel */}
        <button
          onClick={() => onRoute('parallel')}
          className="flex items-center gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Plocka & Produktion parallellt</p>
            <p className="text-white/50 text-xs">Produktion kan börja förbereda medan resterande plockas</p>
          </div>
        </button>
      </div>

      <Button
        onClick={onDownload}
        disabled={isDownloading}
        variant="outline"
        className="w-full bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
      >
        <Download className="w-4 h-4 mr-2" />
        {isDownloading ? 'Laddar ner...' : 'Ladda ner plockkvitto'}
      </Button>
    </motion.div>
  );
}