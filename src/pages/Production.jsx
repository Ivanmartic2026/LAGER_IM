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
  Clock, FileText, ArrowRight, Zap, Play, Trophy, Upload
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ProductionPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['production-orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 2,
    networkMode: 'always'
  });

  const { data: productionRecords = [] } = useQuery({
    queryKey: ['production-records'],
    queryFn: () => base44.entities.ProductionRecord.list('-created_date'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
    networkMode: 'always'
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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      toast.success('Fil uppladdad - du kan nu ladda upp den till en specifik arbetsorder');
    } catch (error) {
      toast.error('Kunde inte ladda upp fil');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-4">Produktion</h1>
            
            {/* Status Cards */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
               <motion.button
                 whileHover={{ y: -4, transition: { duration: 0.2 } }}
                 onClick={() => setStatusFilter('all')}
                 className={cn(
                   "p-5 rounded-2xl backdrop-blur-xl border transition-all duration-300 cursor-pointer group text-left",
                   statusFilter === 'all'
                     ? "bg-white/10 border-white/30 shadow-lg shadow-white/10"
                     : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-white/5"
                 )}
               >
                 <div className="flex items-center justify-between mb-3">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
                     <Package className="w-5 h-5 text-white/70" />
                   </div>
                 </div>
                 <p className="text-3xl font-bold text-white mb-1 tracking-tight">{productionOrders.length}</p>
                 <p className="text-sm text-white/50">Alla</p>
               </motion.button>

               <motion.button
                 whileHover={{ y: -4, transition: { duration: 0.2 } }}
                 onClick={() => setStatusFilter('picked')}
                 className={cn(
                   "p-5 rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer group text-left",
                   statusFilter === 'picked'
                     ? "bg-amber-500/20 border-amber-500/40 shadow-lg shadow-amber-500/10"
                     : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-amber-500/10"
                 )}
               >
                 <div className="flex items-center justify-between mb-3">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/30 flex items-center justify-center">
                     <Zap className="w-5 h-5 text-amber-400" />
                   </div>
                 </div>
                 <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.picked}</p>
                 <p className="text-sm text-white/50">Redo</p>
               </motion.button>

               <motion.button
                 whileHover={{ y: -4, transition: { duration: 0.2 } }}
                 onClick={() => setStatusFilter('in_production')}
                 className={cn(
                   "p-5 rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer group text-left",
                   statusFilter === 'in_production'
                     ? "bg-blue-500/20 border-blue-500/40 shadow-lg shadow-blue-500/10"
                     : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-blue-500/10"
                 )}
               >
                 <div className="flex items-center justify-between mb-3">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-600/30 flex items-center justify-center">
                     <Play className="w-5 h-5 text-blue-400" />
                   </div>
                 </div>
                 <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.inProduction}</p>
                 <p className="text-sm text-white/50">Pågående</p>
               </motion.button>

               <motion.button
                 whileHover={{ y: -4, transition: { duration: 0.2 } }}
                 onClick={() => setStatusFilter('production_completed')}
                 className={cn(
                   "p-5 rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer group text-left",
                   statusFilter === 'production_completed'
                     ? "bg-green-500/20 border-green-500/40 shadow-lg shadow-green-500/10"
                     : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-green-500/10"
                 )}
               >
                 <div className="flex items-center justify-between mb-3">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/30 to-green-600/30 flex items-center justify-center">
                     <Trophy className="w-5 h-5 text-green-400" />
                   </div>
                 </div>
                 <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.completed}</p>
                 <p className="text-sm text-white/50">Klara</p>
               </motion.button>
             </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök projekt/order..."
              className="pl-11 h-11 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white placeholder:text-white/40 backdrop-blur-xl transition-all duration-300 text-base"
            />
          </div>

          {/* File Upload Section */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2 mb-1">
                  <Upload className="w-5 h-5" />
                  Ladda upp filer till produktion
                </h3>
                <p className="text-sm text-white/60">
                  Ladda upp ritningar, montageinstruktioner och andra dokument
                </p>
              </div>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="production-file-upload"
                disabled={uploadingFile}
              />
              <label
                htmlFor="production-file-upload"
                className={cn(
                  "px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium cursor-pointer transition-colors flex items-center gap-2 whitespace-nowrap",
                  uploadingFile && "opacity-50 cursor-not-allowed"
                )}
              >
                {uploadingFile ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Laddar upp...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Välj fil
                  </>
                )}
              </label>
            </div>
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
                        <div className="flex items-center gap-3 flex-nowrap mb-2">
                          <h3 className="text-base font-semibold text-white truncate">
                            {order.order_number || `Order #${order.id.slice(0, 8)}`}
                          </h3>
                          <Badge className={cn("px-3 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0", statusConfig.color)}>
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