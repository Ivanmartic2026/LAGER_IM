import React, { useState, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, Package, TrendingUp, TrendingDown, 
  AlertTriangle, Clock, ArrowRight, Zap, MapPin,
  Search, X, Hash, Factory, Printer, ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "sonner";
import LabelDownloader from "@/components/labels/LabelDownloader";
import QuickWithdrawalModal from "@/components/withdrawal/QuickWithdrawalModal";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showQuickWithdrawal, setShowQuickWithdrawal] = useState(false);
  const searchInputRef = useRef(null);

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-updated_date', 50),
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['movements'],
    queryFn: () => base44.entities.StockMovement.list('-created_date', 10),
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 10),
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: siteReports = [] } = useQuery({
    queryKey: ['siteReports'],
    queryFn: async () => {
      const reports = await base44.entities.SiteReport.list('-created_date', 10);
      return reports.filter(r => r.status === 'pending_review' || r.status === 'in_review');
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const pendingOrders = orders.filter(o => 
    (o.status === 'ready_to_pick' || o.status === 'picking' || o.status === 'picked') && 
    !o.fortnox_invoiced
  );

  const getOrderAge = (order) => {
    const createdDate = new Date(order.created_date);
    const today = new Date();
    const diffTime = Math.abs(today - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const productionOrders = orders.filter(o => 
    o.status === 'picked' || 
    o.status === 'in_production' || 
    o.status === 'production_completed'
  );

  const stats = {
    total: articles.length,
    totalValue: articles.reduce((sum, a) => sum + (a.stock_qty || 0), 0),
    lowStock: articles.filter(a => a.status === "low_stock").length,
    outOfStock: articles.filter(a => a.status === "out_of_stock").length,
    onRepair: articles.filter(a => a.status === "on_repair").length,
    ordersTotal: orders.length,
    ordersInProduction: orders.filter(o => o.status === 'in_production').length,
    ordersReadyProduction: orders.filter(o => o.status === 'picked').length
  };

  const recentArticles = articles.slice(0, 5);
  const alertArticles = articles.filter(a => 
    a.status === "low_stock" || a.status === "out_of_stock"
  ).slice(0, 3);
  
  const hasAlerts = alertArticles.length > 0;

  // Search functionality
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const results = articles.filter(article => 
      article.name?.toLowerCase().includes(query) ||
      article.batch_number?.toLowerCase().includes(query) ||
      article.manufacturer?.toLowerCase().includes(query) ||
      article.shelf_address?.toLowerCase().includes(query)
    ).slice(0, 10);
    
    setSearchResults(results);
  }, [searchQuery, articles]);

  const handleSelectArticle = (article) => {
    setSelectedArticle(article);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleReset = () => {
    setSelectedArticle(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Show selected article details
  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-black p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {selectedArticle.shelf_address ? (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 md:p-12 text-center">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-2 text-emerald-200 text-sm mb-4">
                    <MapPin className="w-5 h-5" />
                    <span>Hyllplats</span>
                  </div>
                  <div className="text-7xl md:text-8xl font-bold text-white mb-4 tracking-tight">
                    {selectedArticle.shelf_address}
                  </div>
                  {selectedArticle.warehouse && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm">
                      <Package className="w-4 h-4" />
                      {selectedArticle.warehouse}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                <MapPin className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <p className="text-lg font-medium text-amber-200">Ingen hyllplats registrerad</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                <h3 className="font-semibold text-white mb-3 tracking-tight">Artikel</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-slate-400">Namn:</span> <span className="text-white font-medium">{selectedArticle.name}</span></div>
                  <div><span className="text-slate-400">Batch:</span> <span className="text-white font-medium">{selectedArticle.batch_number}</span></div>
                  {selectedArticle.manufacturer && (
                    <div><span className="text-slate-400">Tillverkare:</span> <span className="text-white font-medium">{selectedArticle.manufacturer}</span></div>
                  )}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                <h3 className="font-semibold text-white mb-3 tracking-tight">Lagerstatus</h3>
                <div className="text-3xl font-bold text-white mb-2">{selectedArticle.stock_qty || 0} <span className="text-sm text-slate-400">st</span></div>
                <Badge className={cn(
                  selectedArticle.status === "active" && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                  selectedArticle.status === "low_stock" && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                  selectedArticle.status === "out_of_stock" && "bg-red-500/20 text-red-400 border-red-500/30"
                )}>
                  {selectedArticle.status === "active" ? "I lager" : selectedArticle.status === "low_stock" ? "Lågt lager" : "Slut"}
                </Badge>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setShowPrintModal(true)} variant="outline" className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white">
                <Printer className="w-4 h-4 mr-2" />
                Skriv ut etikett
              </Button>
              <Button onClick={handleReset} className="flex-1 bg-blue-600 hover:bg-blue-500">
                Tillbaka
              </Button>
            </div>
          </motion.div>

          {showPrintModal && (
            <LabelDownloader articles={[selectedArticle]} onClose={() => setShowPrintModal(false)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Quick Action Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
        >
          <Link to={createPageUrl("Scan") + "?mode=inbound"}>
            <motion.div 
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-6 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 backdrop-blur-sm border border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 cursor-pointer group"
            >
              <Package className="w-8 h-8 text-emerald-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-semibold text-white text-lg mb-1">Inleverans</h3>
              <p className="text-sm text-slate-400">Registrera nya varor</p>
            </motion.div>
          </Link>

          <motion.div 
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={() => setShowQuickWithdrawal(true)}
            className="p-6 rounded-2xl bg-gradient-to-br from-amber-600/20 to-orange-700/10 backdrop-blur-sm border border-amber-500/30 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 cursor-pointer group"
          >
            <Zap className="w-8 h-8 text-amber-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="font-semibold text-white text-lg mb-1">Snabb utplockning</h3>
            <p className="text-sm text-slate-400">Ta ut från lager</p>
          </motion.div>

          <Link to={createPageUrl("Scan") + "?mode=site_documentation"}>
            <motion.div 
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-6 rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-700/10 backdrop-blur-sm border border-purple-500/30 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer group"
            >
              <MapPin className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-semibold text-white text-lg mb-1">On Site-dokumentation</h3>
              <p className="text-sm text-slate-400">Dokumentera fältbesök</p>
            </motion.div>
          </Link>

          <motion.div 
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={() => searchInputRef.current?.focus()}
            className="p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-700/10 backdrop-blur-sm border border-blue-500/30 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer group"
          >
            <Search className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="font-semibold text-white text-lg mb-1">Sök artikel</h3>
            <p className="text-sm text-slate-400">Hitta snabbt i lagret</p>
          </motion.div>
        </motion.div>

        {/* Orders to Pick */}
        {pendingOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-700/10 border border-blue-500/30 mb-6 backdrop-blur-sm shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 md:mb-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-blue-300" />
                  </div>
                  <h2 className="text-base md:text-lg font-semibold text-white truncate">Ordrar att plocka</h2>
                </div>
                <p className="text-xs md:text-sm text-blue-200">{pendingOrders.length} order{pendingOrders.length !== 1 ? 'ar' : ''} väntar</p>
              </div>
              <Link to={createPageUrl("Orders")} className="flex-shrink-0">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-xs md:text-sm h-8 md:h-9 px-3 md:px-4">
                  Alla
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {pendingOrders.slice(0, 3).map(order => {
                const daysOld = getOrderAge(order);
                return (
                  <Link 
                    key={order.id}
                    to={`${createPageUrl("PickOrder")}?orderId=${order.id}`}
                    className="block p-3 md:p-4 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 border border-slate-700/50 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm md:text-base truncate">
                          {order.order_number || `Order #${order.id.slice(0, 8)}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs md:text-sm text-slate-400 truncate">{order.customer_name}</p>
                          <Badge className={cn(
                            "text-xs",
                            daysOld > 7 ? "bg-red-500/20 text-red-400 border-red-500/30" :
                            daysOld > 3 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                            "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          )}>
                            {daysOld} dag{daysOld !== 1 ? 'ar' : ''}
                          </Badge>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-blue-400 flex-shrink-0 ml-2" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Production Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link to={createPageUrl("Orders")}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.4 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-white/5 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-600/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all duration-300">
                  <ClipboardList className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.ordersTotal}</p>
              <p className="text-sm text-white/50">Totalt ordrar</p>
            </motion.div>
          </Link>

          <Link to={createPageUrl("Production") + "?status=picked"}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-5 rounded-2xl bg-gradient-to-br from-amber-600/20 to-amber-700/10 backdrop-blur-sm border border-amber-500/30 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-amber-500/30 transition-all duration-300">
                  <Clock className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.ordersReadyProduction}</p>
              <p className="text-sm text-white/50">Redo för produktion</p>
            </motion.div>
          </Link>

          <Link to={createPageUrl("Production") + "?status=in_production"}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-700/10 backdrop-blur-sm border border-blue-500/30 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-600/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
                  <Factory className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.ordersInProduction}</p>
              <p className="text-sm text-white/50">Under produktion</p>
            </motion.div>
          </Link>
        </div>

        {/* Stats Grid - Desktop Only */}
        <div className="hidden md:grid grid-cols-5 gap-4 mb-8">
          <Link to={createPageUrl("Inventory") + "?status=all"}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-white/5 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-600/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
                  <Package className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.total}</p>
              <p className="text-sm text-white/50">Artiklar</p>
            </motion.div>
          </Link>

          <Link to={createPageUrl("Inventory") + "?status=active"}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-white/5 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-all duration-300">
                  <Package className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.totalValue}</p>
              <p className="text-sm text-white/50">Totalt i lager</p>
            </motion.div>
          </Link>

          <Link to={createPageUrl("Inventory") + "?status=low_stock"}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-5 rounded-2xl bg-[#3a3d42]/60 backdrop-blur-sm border border-[#5a5d62]/50 hover:bg-[#3a3d42]/80 hover:border-[#7B7F85] hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-amber-500/30 transition-all duration-300">
                  <AlertTriangle className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.lowStock}</p>
              <p className="text-sm text-white/50">Lågt lager</p>
            </motion.div>
          </Link>

          <Link to={createPageUrl("Inventory") + "?status=out_of_stock"}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-5 rounded-2xl bg-[#3a3d42]/60 backdrop-blur-sm border border-[#5a5d62]/50 hover:bg-[#3a3d42]/80 hover:border-[#7B7F85] hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/30 to-red-600/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-red-500/30 transition-all duration-300">
                  <Package className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.outOfStock}</p>
              <p className="text-sm text-white/50">Slut i lager</p>
            </motion.div>
          </Link>

          <Link to={createPageUrl("Inventory") + "?status=on_repair"}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-5 rounded-2xl bg-[#3a3d42]/60 backdrop-blur-sm border border-[#5a5d62]/50 hover:bg-[#3a3d42]/80 hover:border-[#7B7F85] hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/30 to-orange-600/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-orange-500/30 transition-all duration-300">
                  <Package className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.onRepair}</p>
              <p className="text-sm text-white/50">På reparation</p>
            </motion.div>
          </Link>
        </div>

        {/* Mobile Stats - Simplified */}
        <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
          <Link to={createPageUrl("Inventory") + "?status=all"}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              className="p-4 rounded-xl bg-[#3a3d42]/60 backdrop-blur-sm border border-[#5a5d62]/50 active:bg-[#3a3d42]/80 hover:shadow-lg transition-all duration-200"
            >
              <Package className="w-5 h-5 text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-white mb-0.5">{stats.total}</p>
              <p className="text-xs text-slate-400">Artiklar</p>
            </motion.div>
          </Link>

          {stats.lowStock > 0 && (
            <Link to={createPageUrl("Inventory") + "?status=low_stock"}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-slate-800/50 border border-amber-500/30 active:bg-slate-800"
              >
                <AlertTriangle className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-2xl font-bold text-white mb-0.5">{stats.lowStock}</p>
                <p className="text-xs text-slate-400">Lågt lager</p>
              </motion.div>
            </Link>
          )}

          {stats.outOfStock > 0 && (
            <Link to={createPageUrl("Inventory") + "?status=out_of_stock"}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-slate-800/50 border border-red-500/30 active:bg-slate-800"
              >
                <Package className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-2xl font-bold text-white mb-0.5">{stats.outOfStock}</p>
                <p className="text-xs text-slate-400">Slut</p>
              </motion.div>
            </Link>
          )}

          {stats.totalValue > 0 && (
            <Link to={createPageUrl("Inventory") + "?status=active"}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 active:bg-slate-800"
              >
                <Package className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="text-2xl font-bold text-white mb-0.5">{stats.totalValue}</p>
                <p className="text-xs text-slate-400">I lager</p>
              </motion.div>
            </Link>
          )}
        </div>

        {/* Inkommande Site-rapporter */}
        {siteReports.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-cyan-600/20 to-cyan-700/10 border border-cyan-500/30 mb-6 backdrop-blur-sm shadow-lg shadow-cyan-500/10 hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 md:mb-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-cyan-500/30 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-4 h-4 md:w-5 md:h-5 text-cyan-300" />
                  </div>
                  <h2 className="text-base md:text-lg font-semibold text-white truncate">Inkommande Site-rapporter</h2>
                </div>
                <p className="text-xs md:text-sm text-cyan-200">{siteReports.length} rapport{siteReports.length !== 1 ? 'er' : ''} väntar på granskning</p>
              </div>
              <Link to={createPageUrl("SiteReports")} className="flex-shrink-0">
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-xs md:text-sm h-8 md:h-9 px-3 md:px-4">
                  Alla
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {siteReports.slice(0, 3).map(report => (
                <Link
                  key={report.id}
                  to={`${createPageUrl("SiteReports")}?reportId=${report.id}`}
                >
                  <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm md:text-base truncate">{report.site_name}</p>
                      <p className="text-xs md:text-sm text-slate-400 truncate">
                        {report.site_address || report.technician_name || report.technician_email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 whitespace-nowrap text-xs">
                        {report.status === 'pending_review' ? 'Väntar' : 'Granskas'}
                      </Badge>
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          
          {/* Alerts */}
          {hasAlerts && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 md:p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50"
            >
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h2 className="text-sm md:text-base font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline">Kräver uppmärksamhet</span>
                  <span className="md:hidden">Varningar</span>
                </h2>
              </div>
              <div className="space-y-3">
                {alertArticles.map(article => (
                 <div
                   key={article.id}
                   onClick={() => {
                     window.location.href = createPageUrl("Inventory") + `?articleId=${article.id}`;
                   }}
                   className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                 >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        article.status === "out_of_stock" 
                          ? "bg-red-500/20" 
                          : "bg-amber-500/20"
                      )}>
                        <Package className={cn(
                          "w-4 h-4",
                          article.status === "out_of_stock" 
                            ? "text-red-400" 
                            : "text-amber-400"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{article.name}</p>
                        <p className="text-xs text-slate-400">{article.batch_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{article.stock_qty || 0}</p>
                      <p className="text-xs text-slate-400">i lager</p>
                    </div>
                    </div>
                    ))}
                    </div>
                    </motion.div>
                    )}

                    {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="p-4 md:p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-white/5 transition-all duration-300"
            >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-sm md:text-base font-semibold text-white flex items-center gap-2 tracking-tight">
                <Clock className="w-4 h-4 text-white/40" />
                <span className="hidden md:inline">Senaste aktivitet</span>
                <span className="md:hidden">Aktivitet</span>
              </h2>
              <Link to={createPageUrl("Inventory")} className="hidden md:block">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  Visa alla
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            
            {movements.length > 0 ? (
              <div className="space-y-3">
                {movements.slice(0, 5).map(movement => {
                 const article = articles.find(a => a.id === movement.article_id);
                 return (
                   <div 
                     key={movement.id}
                     onClick={() => {
                       if (article) {
                         window.location.href = createPageUrl("Inventory") + `?articleId=${article.id}`;
                       }
                     }}
                     className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/70 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                   >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          movement.quantity > 0 
                            ? "bg-emerald-500/20" 
                            : "bg-amber-500/20"
                        )}>
                          {movement.quantity > 0 ? (
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm">
                            {movement.movement_type === "inbound" ? "Inleverans" : 
                             movement.movement_type === "outbound" ? "Uttag" :
                             movement.movement_type === "inventory" ? "Inventering" : "Justering"}
                          </p>
                          {article && (
                            <p className="text-xs text-slate-500 truncate">
                              {article.name}
                            </p>
                          )}
                          <p className="text-xs text-slate-400">
                            {movement.created_date && format(new Date(movement.created_date), "d MMM HH:mm", { locale: sv })}
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "font-bold flex-shrink-0 ml-2",
                        movement.quantity > 0 ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Ingen aktivitet ännu</p>
              </div>
            )}
          </motion.div>

          {/* Recent Articles */}
          {recentArticles.length > 0 && !hasAlerts && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 md:p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">Senaste artiklar</h2>
                <Link to={createPageUrl("Inventory")}>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                    Visa alla
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {recentArticles.map(article => (
                  <div 
                    key={article.id}
                    onClick={() => {
                      window.location.href = createPageUrl("Inventory") + `?articleId=${article.id}`;
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/70 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                        <Package className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{article.name}</p>
                        <p className="text-xs text-slate-400">{article.batch_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{article.stock_qty || 0}</p>
                      <p className="text-xs text-slate-400">i lager</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>





        {/* Quick Withdrawal Modal */}
        <AnimatePresence>
          {showQuickWithdrawal && (
            <QuickWithdrawalModal
              onClose={() => setShowQuickWithdrawal(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}