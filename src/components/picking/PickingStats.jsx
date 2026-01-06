import React from 'react';
import { Package, AlertCircle, ShoppingCart, Boxes } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PickingStats({ totalTasks, urgentTasks, totalOrders, totalItems }) {
  const stats = [
    {
      label: 'Artiklar',
      value: totalTasks,
      icon: Package,
      color: 'blue',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400'
    },
    {
      label: 'Brådskande',
      value: urgentTasks,
      icon: AlertCircle,
      color: 'red',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400'
    },
    {
      label: 'Aktiva ordrar',
      value: totalOrders,
      icon: ShoppingCart,
      color: 'green',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400'
    },
    {
      label: 'Totalt att plocka',
      value: totalItems,
      icon: Boxes,
      color: 'purple',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      textColor: 'text-purple-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className={`${stat.bgColor} ${stat.borderColor} border rounded-2xl p-4 backdrop-blur-xl`}
        >
          <div className="flex items-center gap-3">
            <div className={`${stat.bgColor} ${stat.borderColor} border rounded-xl p-2`}>
              <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${stat.textColor}`}>
                {stat.value}
              </div>
              <div className="text-xs text-white/50">
                {stat.label}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}