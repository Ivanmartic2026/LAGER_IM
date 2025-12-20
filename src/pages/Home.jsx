import React from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Camera, Package, TrendingUp, TrendingDown, 
  AlertTriangle, Clock, ArrowRight, Zap, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function HomePage() {
  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-updated_date', 50),
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['movements'],
    queryFn: () => base44.entities.StockMovement.list('-created_date', 10),
  });

  const stats = {
    total: articles.length,
    totalValue: articles.reduce((sum, a) => sum + (a.stock_qty || 0), 0),
    lowStock: articles.filter(a => a.status === "low_stock").length,
    outOfStock: articles.filter(a => a.status === "out_of_stock").length
  };

  const recentArticles = articles.slice(0, 5);
  const alertArticles = articles.filter(a => 
    a.status === "low_stock" || a.status === "out_of_stock"
  ).slice(0, 3);
  
  const hasAlerts = alertArticles.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 md:p-10 mb-8"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-20 -translate-y-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl transform -translate-x-10 translate-y-10" />
          
          <div className="relative z-10">
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Smart Lagerhantering
            </h1>
            <p className="text-blue-100 mb-6 max-w-lg">
              Fotografera en etikett och fyll i alla artikeluppgifter automatiskt. 
              Snabb inleverans och inventering.
            </p>
            
            <Link to={createPageUrl("Scan")}>
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                <Camera className="w-5 h-5 mr-2" />
                Starta skanning
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stats.total}</p>
            <p className="text-sm text-slate-400">Artiklar</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stats.totalValue}</p>
            <p className="text-sm text-slate-400">Totalt i lager</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stats.lowStock}</p>
            <p className="text-sm text-slate-400">Lågt lager</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stats.outOfStock}</p>
            <p className="text-sm text-slate-400">Slut i lager</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Alerts */}
          {hasAlerts && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Kräver uppmärksamhet
                </h2>
              </div>
              <div className="space-y-3">
                {alertArticles.map(article => (
                  <Link 
                    key={article.id} 
                    to={createPageUrl("Inventory")}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
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
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Senaste aktivitet
              </h2>
              <Link to={createPageUrl("Inventory")}>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  Visa alla
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            
            {movements.length > 0 ? (
              <div className="space-y-3">
                {movements.slice(0, 5).map(movement => (
                  <div 
                    key={movement.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
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
                      <div>
                        <p className="font-medium text-white text-sm">
                          {movement.movement_type === "inbound" ? "Inleverans" : 
                           movement.movement_type === "outbound" ? "Uttag" :
                           movement.movement_type === "inventory" ? "Inventering" : "Justering"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {movement.created_date && format(new Date(movement.created_date), "d MMM HH:mm", { locale: sv })}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "font-bold",
                      movement.quantity > 0 ? "text-emerald-400" : "text-amber-400"
                    )}>
                      {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                    </div>
                  </div>
                ))}
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
              className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50"
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
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50"
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

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          <Link to={createPageUrl("Find")}>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-700/10 border border-purple-500/30 hover:border-purple-500/50 transition-colors cursor-pointer">
              <MapPin className="w-6 h-6 text-purple-400 mb-3" />
              <h3 className="font-semibold text-white mb-1">Hitta</h3>
              <p className="text-sm text-slate-400">Sök hyllplats</p>
            </div>
          </Link>
          
          <Link to={createPageUrl("Scan") + "?mode=inbound"}>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 border border-emerald-500/30 hover:border-emerald-500/50 transition-colors cursor-pointer">
              <Package className="w-6 h-6 text-emerald-400 mb-3" />
              <h3 className="font-semibold text-white mb-1">Inleverans</h3>
              <p className="text-sm text-slate-400">Registrera nya varor</p>
            </div>
          </Link>
          
          <Link to={createPageUrl("Scan") + "?mode=inventory"}>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-700/10 border border-blue-500/30 hover:border-blue-500/50 transition-colors cursor-pointer">
              <Camera className="w-6 h-6 text-blue-400 mb-3" />
              <h3 className="font-semibold text-white mb-1">Inventering</h3>
              <p className="text-sm text-slate-400">Justera lagersaldo</p>
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}