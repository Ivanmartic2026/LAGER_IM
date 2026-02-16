import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Receipt, Plus } from 'lucide-react';

export default function PurchaseOrdersHeader({ stats = [], onScanInvoice, onNewOrder }) {
  const defaultStats = [
    { label: 'Totalt ordrar', value: 5, color: 'slate', glowColor: 'shadow-slate-500/20' },
    { label: 'Beställda', value: 3, color: 'blue', glowColor: 'shadow-blue-500/30' },
    { label: 'Delvis mottagna', value: 2, color: 'amber', glowColor: 'shadow-amber-500/30' },
    { label: 'Mottagna', value: 5, color: 'emerald', glowColor: 'shadow-emerald-500/30' }
  ];

  const items = stats.length > 0 ? stats : defaultStats;

  const bgColors = {
    slate: 'bg-slate-900/20 border-slate-700/40',
    blue: 'bg-blue-900/20 border-blue-500/40',
    amber: 'bg-amber-900/20 border-amber-500/40',
    emerald: 'bg-emerald-900/20 border-emerald-500/40'
  };

  const textColors = {
    slate: 'text-slate-300',
    blue: 'text-blue-300',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300'
  };

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Inköpsordrar</h1>
          <p className="text-slate-400">Hantera och spåra dina inköpsordrar</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={onScanInvoice}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2 backdrop-blur-xl"
          >
            <Receipt className="w-4 h-4" />
            Skanna faktura
          </Button>
          <Button
            onClick={onNewOrder}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 backdrop-blur-xl"
          >
            <Plus className="w-4 h-4" />
            Ny order
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-5 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all ${
              bgColors[stat.color]
            } ${stat.glowColor}`}
          >
            <div className={`text-3xl font-bold mb-2 ${textColors[stat.color]}`}>
              {stat.value}
            </div>
            <div className="text-sm text-slate-400">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}