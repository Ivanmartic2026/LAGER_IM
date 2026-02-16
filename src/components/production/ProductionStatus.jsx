import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Play, CheckCircle2 } from 'lucide-react';

export default function ProductionStatus({ stats = [] }) {
  const defaultStats = [
    { label: 'Alla', value: 5, color: 'white', bgColor: 'bg-white', glowColor: 'shadow-white/20' },
    { label: 'Redo', value: 3, color: 'amber', bgColor: 'bg-amber-900/20', glowColor: 'shadow-amber-500/30', icon: Zap },
    { label: 'Pågående', value: 1, color: 'blue', bgColor: 'bg-blue-900/20', glowColor: 'shadow-blue-500/30', icon: Play },
    { label: 'Klara', value: 1, color: 'emerald', bgColor: 'bg-emerald-900/20', glowColor: 'shadow-emerald-500/30', icon: CheckCircle2 }
  ];

  const items = stats.length > 0 ? stats : defaultStats;

  const textColors = {
    white: 'text-white',
    amber: 'text-amber-300',
    blue: 'text-blue-300',
    emerald: 'text-emerald-300'
  };

  return (
    <div>
      <h2 className="text-white text-xl font-bold mb-4">Produktion</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative p-6 rounded-2xl backdrop-blur-xl border ${
                stat.color === 'white'
                  ? 'bg-white text-black border-white/30 shadow-lg shadow-white/20'
                  : `${stat.bgColor} border-${stat.color}-500/40 shadow-2xl ${stat.glowColor}`
              }`}
            >
              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 ${stat.color === 'white' ? 'text-black' : textColors[stat.color]}`}>
                  {stat.value}
                </div>
                <div className={`text-sm font-medium flex items-center justify-center gap-1.5 ${
                  stat.color === 'white' ? 'text-gray-600' : `text-${stat.color}-200`
                }`}>
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {stat.label}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}