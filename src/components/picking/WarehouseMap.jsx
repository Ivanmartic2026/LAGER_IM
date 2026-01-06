import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Package, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

export default function WarehouseMap({ tasks, warehouses }) {
  const [selectedWarehouse, setSelectedWarehouse] = useState(warehouses[0]?.name || null);

  // Gruppera tasks per hyllplats
  const locationMap = tasks.reduce((acc, task) => {
    const location = task.shelf_address || 'Okänd plats';
    if (!acc[location]) {
      acc[location] = [];
    }
    acc[location].push(task);
    return acc;
  }, {});

  const filteredLocations = selectedWarehouse 
    ? Object.entries(locationMap).filter(([_, items]) => 
        items.some(t => t.warehouse === selectedWarehouse)
      )
    : Object.entries(locationMap);

  return (
    <div>
      {/* Warehouse selector */}
      {warehouses.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {warehouses.map(wh => (
            <button
              key={wh.id}
              onClick={() => setSelectedWarehouse(wh.name)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                selectedWarehouse === wh.name
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              )}
            >
              {wh.name}
            </button>
          ))}
        </div>
      )}

      {/* Location grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredLocations.map(([location, items]) => {
          const hasUrgent = items.some(t => t.orders.some(o => o.priority === 'urgent'));
          const totalQuantity = items.reduce((sum, t) => sum + t.totalQuantity, 0);
          const hasLowStock = items.some(t => t.stock_qty < t.totalQuantity);

          return (
            <motion.div
              key={location}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "p-4 rounded-2xl backdrop-blur-xl border transition-all duration-300 cursor-pointer hover:scale-105",
                hasUrgent 
                  ? "bg-red-500/10 border-red-500/40 hover:border-red-500/60"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  hasUrgent ? "bg-red-500/20" : "bg-purple-500/20"
                )}>
                  <MapPin className={cn(
                    "w-5 h-5",
                    hasUrgent ? "text-red-400" : "text-purple-400"
                  )} />
                </div>
                {hasUrgent && (
                  <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />
                )}
              </div>

              <h3 className="text-lg font-bold text-white mb-1">
                {location}
              </h3>

              <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
                <Package className="w-4 h-4" />
                <span>{items.length} artikel{items.length !== 1 ? 'ar' : ''}</span>
                <span>•</span>
                <span className="font-semibold text-white">{totalQuantity} st</span>
              </div>

              {hasLowStock && (
                <div className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded mb-3">
                  ⚠️ Lågt lager
                </div>
              )}

              <Link to={`${createPageUrl("PickOrder")}?orderId=${items[0].orders[0].orderId}`}>
                <Button 
                  size="sm"
                  className={cn(
                    "w-full",
                    hasUrgent 
                      ? "bg-red-600 hover:bg-red-500"
                      : "bg-blue-600 hover:bg-blue-500"
                  )}
                >
                  Plocka här
                </Button>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {filteredLocations.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-white/30" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Inga plockningsuppgifter på detta lager
          </h3>
          <p className="text-white/50">
            Välj ett annat lager eller kontrollera aktiva ordrar
          </p>
        </div>
      )}
    </div>
  );
}