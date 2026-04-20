import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { Activity, Package, ShoppingCart, Wrench, FileText, Clock } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const ACTIVITY_ENTITIES = ['WorkOrderActivity', 'POActivity', 'ProductionActivity'];

export default function RecentActivityWidget() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const timerRef = useRef(null);


  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Auto-collapse after 8 seconds of inactivity
  useEffect(() => {
    if (isExpanded) {
      timerRef.current = setTimeout(() => setIsExpanded(false), 8000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isExpanded]);

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
    staleTime: 120000,
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
    staleTime: 120000,
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
    staleTime: 120000,
  });

  // Real-time listeners for activity updates
  useEffect(() => {
    const unsubscribeWO = base44.entities.WorkOrderActivity.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['workOrderActivities'] });
    });

    const unsubscribePO = base44.entities.POActivity.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['poActivities'] });
    });

    const unsubscribeProd = base44.entities.ProductionActivity.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['productionActivities'] });
    });

    const unsubscribeOrder = base44.entities.Order.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['ordersData'] });
    });

    const unsubscribeWOData = base44.entities.WorkOrder.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['workOrdersData'] });
    });

    return () => {
      unsubscribeWO();
      unsubscribePO();
      unsubscribeProd();
      unsubscribeOrder();
      unsubscribeWOData();
    };
  }, []);

  // Fetch work order and PO details for titles
  const { data: workOrders = {} } = useQuery({
    queryKey: ['workOrdersForActivity'],
    queryFn: async () => {
      try {
        const all = await base44.entities.WorkOrder.list('', 100);
        return Object.fromEntries(all.map(w => [w.id, w]));
      } catch {
        return {};
      }
    },
    staleTime: 120000,
  });

  const { data: purchaseOrders = {} } = useQuery({
    queryKey: ['poForActivity'],
    queryFn: async () => {
      try {
        const all = await base44.entities.PurchaseOrder.list('', 100);
        return Object.fromEntries(all.map(p => [p.id, p]));
      } catch {
        return {};
      }
    },
    staleTime: 120000,
  });

  const { data: orders = {} } = useQuery({
    queryKey: ['ordersForActivity'],
    queryFn: async () => {
      try {
        const all = await base44.entities.Order.list('', 100);
        return Object.fromEntries(all.map(o => [o.id, o]));
      } catch {
        return {};
      }
    },
    staleTime: 120000,
  });

  const { data: ordersList = [] } = useQuery({
    queryKey: ['ordersData'],
    queryFn: async () => {
      try {
        return await base44.entities.Order.list('-updated_date', 50);
      } catch {
        return [];
      }
    },
    staleTime: 120000,
  });

  const { data: workOrdersList = [] } = useQuery({
    queryKey: ['workOrdersData'],
    queryFn: async () => {
      try {
        return await base44.entities.WorkOrder.list('-updated_date', 50);
      } catch {
        return [];
      }
    },
    staleTime: 120000,
  });

  // Combine and sort all activities including direct Order and WorkOrder updates
  const allActivities = useMemo(() => {
    const directOrderActivities = ordersList.map(o => ({
      ...o,
      entity_type: 'Order',
      type: 'system',
      message: `Uppdaterad`,
      created_date: o.updated_date || o.created_date,
      order_id: o.id
    }));

    const directWOActivities = workOrdersList.map(wo => ({
      ...wo,
      entity_type: 'WorkOrder',
      type: 'system',
      message: `Uppdaterad`,
      created_date: wo.updated_date || wo.created_date,
      work_order_id: wo.id
    }));

    return [...workOrderActivities, ...poActivities, ...productionActivities, ...directOrderActivities, ...directWOActivities]
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 8);
  }, [workOrderActivities, poActivities, productionActivities, ordersList, workOrdersList]);

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

  const getActivityTitle = (activity) => {
    if (activity.entity_type === 'WorkOrder') {
      if (workOrders[activity.work_order_id]) {
        const wo = workOrders[activity.work_order_id];
        return `${wo.customer_name} - ${wo.name || 'Arbetsorder'}`;
      }
      // Direct WorkOrder update
      return `${activity.customer_name} - ${activity.name || 'Arbetsorder'}`;
    }
    if (activity.entity_type === 'Order') {
      return `${activity.customer_name} - Order${activity.order_number || ''}`;
    }
    if (activity.entity_type === 'PO' && purchaseOrders[activity.purchase_order_id]) {
      const po = purchaseOrders[activity.purchase_order_id];
      return `${po.supplier_name} - PO${po.po_number || ''}`;
    }
    if (activity.entity_type === 'Production' && orders[activity.order_id]) {
      const ord = orders[activity.order_id];
      return `${ord.customer_name} - Order${ord.order_number || ''}`;
    }
    return activity.entity_type;
  };

  const handleActivityClick = (activity) => {
    if (activity.entity_type === 'WorkOrder') {
      navigate(`/WorkOrders/${activity.work_order_id || activity.id}`);
    } else if (activity.entity_type === 'Order') {
      navigate(`/Orders/${activity.id}`);
    } else if (activity.entity_type === 'PO') {
      navigate(`/PurchaseOrders/${activity.purchase_order_id}`);
    }
  };

  if (!user || allActivities.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed right-0 top-20 w-96 bg-gradient-to-b from-slate-800/90 via-slate-900/85 to-black/70 backdrop-blur-2xl border-l border-white/20 z-30 hidden lg:flex flex-col overflow-hidden shadow-2xl"
      style={{ boxShadow: '0 0 40px rgba(59, 130, 246, 0.1)', maxHeight: 'calc(100vh - 120px)' }}
      onMouseEnter={() => { clearTimeout(timerRef.current); }}
      onMouseLeave={() => { if (isExpanded) { timerRef.current = setTimeout(() => setIsExpanded(false), 8000); } }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/15 flex-shrink-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent" onClick={() => { setIsExpanded(prev => !prev); clearTimeout(timerRef.current); }} style={{cursor: 'pointer'}}>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Senaste uppdateringar</h3>
        </div>
      </div>

      {/* Activities List */}
      <div className="flex-1 space-y-2 p-3 overflow-y-auto flex flex-col">
        {isExpanded && allActivities.map((activity, idx) => {
          const Icon = getActivityIcon(activity.type, activity.entity_type);
          const colorClass = getActivityColor(activity.type, activity.entity_type);
          
          return (
            <motion.button
              key={`${activity.id}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleActivityClick(activity)}
              className="w-full text-left p-3 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:from-white/15 hover:to-white/10 hover:border-white/40 transition-all text-xs active:scale-95 shadow-lg hover:shadow-xl"
              style={{ backdropFilter: 'blur(10px)' }}
            >
              <div className="flex gap-3">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                  colorClass
                )}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate text-xs mb-1">
                    {getActivityTitle(activity)}
                  </p>
                  <p className="text-white/70 text-xs mb-1">
                    Uppdaterad — {getTypeLabel(activity.type)}
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