import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Activity, Package, ShoppingCart, Wrench, FileText, Clock } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const ACTIVITY_ENTITIES = ['WorkOrderActivity', 'POActivity', 'ProductionActivity'];

export default function RecentActivityWidget() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [allActivities, setAllActivities] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch activities from all activity entities
  const { data: workOrderActivities = [] } = useQuery({
    queryKey: ['workOrderActivities'],
    queryFn: async () => {
      try {
        const activities = await base44.entities.WorkOrderActivity.list('-created_date', 50);
        return activities.map(a => ({ ...a, entity_type: 'WorkOrder' }));
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
  });

  const { data: poActivities = [] } = useQuery({
    queryKey: ['poActivities'],
    queryFn: async () => {
      try {
        const activities = await base44.entities.POActivity.list('-created_date', 50);
        return activities.map(a => ({ ...a, entity_type: 'PO' }));
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
  });

  const { data: productionActivities = [] } = useQuery({
    queryKey: ['productionActivities'],
    queryFn: async () => {
      try {
        const activities = await base44.entities.ProductionActivity.list('-created_date', 50);
        return activities.map(a => ({ ...a, entity_type: 'Production' }));
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
  });

  // Combine and sort all activities
  React.useEffect(() => {
    const combined = [...workOrderActivities, ...poActivities, ...productionActivities]
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 8);
    setAllActivities(combined);
  }, [workOrderActivities, poActivities, productionActivities]);

  const getActivityIcon = (type, entity_type) => {
    if (entity_type === 'PO') return ShoppingCart;
    if (entity_type === 'Production') return Wrench;
    if (entity_type === 'WorkOrder') return Package;
    
    switch (type) {
      case 'comment': return FileText;
      case 'decision': return Activity;
      case 'status_change': return Clock;
      default: return Activity;
    }
  };

  const getActivityColor = (type, entity_type) => {
    if (type === 'decision') return 'text-purple-400 bg-purple-500/10';
    if (type === 'status_change') return 'text-green-400 bg-green-500/10';
    if (type === 'comment') return 'text-blue-400 bg-blue-500/10';
    if (entity_type === 'PO') return 'text-orange-400 bg-orange-500/10';
    if (entity_type === 'Production') return 'text-yellow-400 bg-yellow-500/10';
    return 'text-slate-400 bg-slate-500/10';
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'comment': return 'Kommentar';
      case 'decision': return 'Beslut';
      case 'status_change': return 'Status ändrad';
      case 'field_change': return 'Uppdaterad';
      case 'assignment': return 'Tilldelning';
      case 'file_upload': return 'Fil uppladdad';
      default: return 'Uppdatering';
    }
  };

  const handleActivityClick = (activity) => {
    if (activity.entity_type === 'WorkOrder') {
      navigate(`/WorkOrders/${activity.work_order_id}`);
    } else if (activity.entity_type === 'PO') {
      navigate(`/PurchaseOrders/${activity.purchase_order_id}`);
    }
  };

  if (!user || allActivities.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed right-0 top-20 w-64 bg-gradient-to-b from-slate-900/80 to-black/60 backdrop-blur-xl border-l border-white/10 z-30 hidden lg:flex flex-col max-h-[calc(100vh-120px)] overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Senaste uppdateringar</h3>
        </div>
      </div>

      {/* Activities List */}
      <div className="flex-1 space-y-2 p-3 overflow-y-auto flex flex-col">
        {allActivities.map((activity, idx) => {
          const Icon = getActivityIcon(activity.type, activity.entity_type);
          const colorClass = getActivityColor(activity.type, activity.entity_type);
          
          return (
            <motion.button
              key={`${activity.id}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleActivityClick(activity)}
              className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/15 hover:border-white/30 transition-all text-xs active:scale-95"
            >
              <div className="flex gap-3">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                  colorClass
                )}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-semibold text-white truncate">
                      {getTypeLabel(activity.type)}
                    </p>
                    <span className="text-white/50 text-xs flex-shrink-0">
                      {activity.entity_type}
                    </span>
                  </div>
                  <p className="text-white/70 line-clamp-2 text-xs mb-1">
                    {activity.message}
                  </p>
                  <p className="text-white/40 text-xs">
                    {format(new Date(activity.created_date), "d MMM HH:mm", { locale: sv })}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}