import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, Trash2, Filter, Package, ShoppingCart, AlertTriangle, Wrench, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import PullToRefresh from "@/components/utils/PullToRefresh";

export default function NotificationsPage() {
  const [user, setUser] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all'); // 'all', 'unread', 'read'
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Notification.filter({ user_email: user.email }, '-created_date', 200);
    },
    enabled: !!user?.email
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Alla notifieringar markerade som lästa');
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notifiering borttagen');
    }
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: async () => {
      const read = notifications.filter(n => n.is_read);
      await Promise.all(read.map(n => base44.entities.Notification.delete(n.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Lästa notifieringar borttagna');
    }
  });

  const getIcon = (type) => {
    switch (type) {
      case 'order_status': return ShoppingCart;
      case 'low_stock': return AlertTriangle;
      case 'stock_alert': return Package;
      case 'repair_update': return Wrench;
      case 'purchase_order': return ShoppingCart;
      default: return Info;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'normal': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link_to && notification.link_page) {
      const param = notification.link_page === 'Inventory' ? 'articleId' : 
                  notification.link_page === 'Orders' ? 'orderId' : 'id';
      navigate(`${createPageUrl(notification.link_page)}?${param}=${notification.link_to}`);
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterRead === 'unread' && n.is_read) return false;
    if (filterRead === 'read' && !n.is_read) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const readCount = notifications.filter(n => n.is_read).length;

  const typeOptions = [
    { value: 'all', label: 'Alla typer', count: notifications.length },
    { value: 'order_status', label: 'Orderstatus', count: notifications.filter(n => n.type === 'order_status').length },
    { value: 'low_stock', label: 'Lågt lager', count: notifications.filter(n => n.type === 'low_stock').length },
    { value: 'stock_alert', label: 'Lagervarning', count: notifications.filter(n => n.type === 'stock_alert').length },
    { value: 'repair_update', label: 'Reparation', count: notifications.filter(n => n.type === 'repair_update').length },
    { value: 'purchase_order', label: 'Inköpsorder', count: notifications.filter(n => n.type === 'purchase_order').length },
    { value: 'system', label: 'System', count: notifications.filter(n => n.type === 'system').length }
  ].filter(opt => opt.count > 0 || opt.value === 'all');

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-400">Laddar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <PullToRefresh onRefresh={refetch} />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Bell className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Notifieringar</h1>
              <p className="text-sm text-white/50">
                {unreadCount} olästa · {readCount} lästa
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Markera alla som lästa
            </Button>
          )}
          {readCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => deleteAllReadMutation.mutate()}
              disabled={deleteAllReadMutation.isPending}
              className="bg-white/5 border-white/10 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Rensa lästa
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-6">
          {/* Read filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['all', 'unread', 'read'].map(status => (
              <Button
                key={status}
                size="sm"
                variant={filterRead === status ? "default" : "outline"}
                onClick={() => setFilterRead(status)}
                className={cn(
                  "whitespace-nowrap",
                  filterRead === status 
                    ? "bg-blue-600 text-white" 
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                )}
              >
                {status === 'all' && `Alla (${notifications.length})`}
                {status === 'unread' && `Olästa (${unreadCount})`}
                {status === 'read' && `Lästa (${readCount})`}
              </Button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {typeOptions.map(opt => (
              <Button
                key={opt.value}
                size="sm"
                variant={filterType === opt.value ? "default" : "outline"}
                onClick={() => setFilterType(opt.value)}
                className={cn(
                  "whitespace-nowrap",
                  filterType === opt.value 
                    ? "bg-blue-600 text-white" 
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                )}
              >
                {opt.label} ({opt.count})
              </Button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {filterRead === 'unread' 
                ? 'Inga olästa notifieringar' 
                : filterType !== 'all'
                ? 'Inga notifieringar av denna typ'
                : 'Inga notifieringar'}
            </h3>
            <p className="text-white/50 text-sm">
              {filterRead === 'unread' 
                ? 'Du är uppdaterad med allt!' 
                : 'Notifieringar visas här när viktiga händelser inträffar'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredNotifications.map((notification) => {
                const Icon = getIcon(notification.type);
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer group relative",
                      !notification.is_read 
                        ? "bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50" 
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                        getPriorityColor(notification.priority)
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-white">
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        
                        <p className="text-sm text-white/70 mb-3 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center gap-3 text-xs text-white/50">
                          <span>
                            {format(new Date(notification.created_date), "d MMMM, HH:mm", { locale: sv })}
                          </span>
                          
                          {notification.priority !== 'normal' && (
                            <Badge className={cn(
                              "text-xs",
                              notification.priority === 'critical' ? "bg-red-500/20 text-red-400" :
                              notification.priority === 'high' ? "bg-orange-500/20 text-orange-400" :
                              "bg-blue-500/20 text-blue-400"
                            )}>
                              {notification.priority === 'critical' ? 'Kritisk' :
                               notification.priority === 'high' ? 'Hög prioritet' : 'Normal'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.is_read && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification.id);
                            }}
                            className="w-8 h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            title="Markera som läst"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notification.id);
                          }}
                          className="w-8 h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Ta bort"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}