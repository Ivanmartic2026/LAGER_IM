import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Package, Search, Factory, CheckCircle2, 
  Clock, FileText, ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function ProductionPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['production-orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: productionRecords = [] } = useQuery({
    queryKey: ['production-records'],
    queryFn: () => base44.entities.ProductionRecord.list('-created_date'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const productionOrders = orders.filter(o => 
    o.status === 'picked' || 
    o.status === 'in_production' || 
    o.status === 'production_completed'
  );

  const filteredOrders = productionOrders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    picked: productionOrders.filter(o => o.status === 'picked').length,
    inProduction: productionOrders.filter(o => o.status === 'in_production').length,
    completed: productionOrders.filter(o => o.status === 'production_completed').length
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-4">Produktion</h1>
            
            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className={cn(
                  "h-auto py-3 px-4 rounded-xl transition-all",
                  statusFilter === 'all'
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold">{productionOrders.length}</span>
                  <span className="text-xs font-medium">Alla</span>
                </div>
              </Button>

              <Button
                variant={statusFilter === 'picked' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('picked')}
                className={cn(
                  "h-auto py-3 px-4 rounded-xl transition-all",
                  statusFilter === 'picked'
                    ? "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/30"
                    : "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-300"
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold">{stats.picked}</span>
                  <span className="text-xs font-medium">Redo</span>
                </div>
              </Button>

              <Button
                variant={statusFilter === 'in_production' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('in_production')}
                className={cn(
                  "h-auto py-3 px-4 rounded-xl transition-all",
                  statusFilter === 'in_production'
                    ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30"
                    : "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-300"
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold">{stats.inProduction}</span>
                  <span className="text-xs font-medium">Pågående</span>
                </div>
              </Button>

              <Button
                variant={statusFilter === 'production_completed' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('production_completed')}
                className={cn(
                  "h-auto py-3 px-4 rounded-xl transition-all",
                  statusFilter === 'production_completed'
                    ? "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/30"
                    : "bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-300"
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold">{stats.completed}</span>
                  <span className="text-xs font-medium">Klara</span>
                </div>
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök projekt/order..."
              className="pl-11 h-11 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white placeholder:text-white/40 backdrop-blur-xl transition-all duration-300 text-base"
            />
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Factory className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Inga projekt i produktion
            </h3>
            <p className="text-white/50">
              Plockade ordrar dyker upp här
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => {
              const record = productionRecords.find(r => r.order_id === order.id);
              
              const statusConfig = {
                picked: { 
                  label: 'Redo för produktion', 
                  color: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30',
                  icon: Clock
                },
                in_production: { 
                  label: 'Under produktion', 
                  color: 'bg-blue-500 text-white shadow-lg shadow-blue-500/30',
                  icon: Factory
                },
                production_completed: { 
                  label: 'Produktion klar', 
                  color: 'bg-green-500 text-white shadow-lg shadow-green-500/30',
                  icon: CheckCircle2
                }
              }[order.status] || {};

              const Icon = statusConfig.icon;

              return (
                <Link 
                  key={order.id}
                  to={createPageUrl(`ProductionView?orderId=${order.id}`)}
                >
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-semibold text-white truncate">
                            {order.order_number || `Order #${order.id.slice(0, 8)}`}
                          </h3>
                          <Badge className={cn("px-3 py-1 rounded-full font-medium", statusConfig.color)}>
                            {Icon && <Icon className="w-3.5 h-3.5 mr-1.5" />}
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-white/50">
                          <span>{order.customer_name}</span>
                          {order.picked_date && (
                            <>
                              <span>•</span>
                              <span>Plockad: {format(new Date(order.picked_date), "d MMM", { locale: sv })}</span>
                            </>
                          )}
                          {record?.responsible_name && (
                            <>
                              <span>•</span>
                              <span>Montör: {record.responsible_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-white/40" />
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}