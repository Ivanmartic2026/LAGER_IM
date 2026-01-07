import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, TrendingUp, Package, AlertTriangle, 
  ArrowLeft, MapPin, Calendar, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function StockForecastPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list(),
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['orderItems'],
    queryFn: () => base44.entities.OrderItem.list(),
  });

  // Filter articles with reserved stock
  const reservedArticles = articles
    .filter(article => (article.reserved_stock_qty || 0) > 0)
    .filter(article => {
      if (!searchQuery) return true;
      return article.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             article.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             article.batch_number?.toLowerCase().includes(searchQuery.toLowerCase());
    });

  // Get orders for each article
  const getArticleOrders = (articleId) => {
    const items = orderItems.filter(item => 
      item.article_id === articleId && 
      item.status !== 'picked'
    );
    
    return items.map(item => {
      const order = orders.find(o => o.id === item.order_id);
      return {
        ...item,
        order
      };
    }).filter(item => 
      item.order && 
      (item.order.status === 'ready_to_pick' || item.order.status === 'picking')
    );
  };

  const totalReserved = reservedArticles.reduce((sum, a) => sum + (a.reserved_stock_qty || 0), 0);

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Admin")}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tillbaka
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Lagerprognos</h1>
                <p className="text-sm text-white/50">Artiklar bokade i pågående ordrar</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                {reservedArticles.length} artiklar
              </Badge>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                {totalReserved} st reserverat
              </Badge>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök artikel, SKU eller batch..."
              className="pl-11 h-11 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white placeholder:text-white/40 backdrop-blur-xl transition-all duration-300"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : reservedArticles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchQuery ? "Inga reserverade artiklar hittades" : "Inga reserverade artiklar"}
            </h3>
            <p className="text-white/50">
              {searchQuery 
                ? "Prova ett annat sökord" 
                : "Artiklar kommer visas här när de är bokade i ordrar"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservedArticles.map((article) => {
              const articleOrders = getArticleOrders(article.id);
              const available = (article.stock_qty || 0) - (article.reserved_stock_qty || 0);
              
              return (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {article.customer_name || article.name}
                        </h3>
                        {article.batch_number && (
                          <span className="text-sm font-mono text-white/50">
                            #{article.batch_number}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-white/50 mb-3">
                        {article.shelf_address && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            <span>{article.shelf_address}</span>
                          </div>
                        )}
                        {article.warehouse && (
                          <span>• {article.warehouse}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-bold text-white">
                          {article.stock_qty || 0}
                        </span>
                        <span className="text-sm text-white/40">st i lager</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          {article.reserved_stock_qty} reserverat
                        </Badge>
                        <Badge className={cn(
                          available > 0 
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        )}>
                          {available} tillgängligt
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Orders */}
                  {articleOrders.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-white/10">
                      <h4 className="text-sm font-medium text-white/70 mb-3">
                        Bokad i {articleOrders.length} order{articleOrders.length !== 1 ? '' : ''}:
                      </h4>
                      {articleOrders.map((item, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-white/40" />
                            <div>
                              <div className="text-sm font-medium text-white">
                                {item.order.order_number || `Order #${item.order.id.slice(0, 8)}`}
                              </div>
                              <div className="text-xs text-white/50">
                                {item.order.customer_name}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {item.order.delivery_date && (
                              <div className="flex items-center gap-1.5 text-xs text-white/50">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(item.order.delivery_date), "d MMM", { locale: sv })}
                              </div>
                            )}
                            <div className="text-sm font-semibold text-white">
                              {item.quantity_ordered - (item.quantity_picked || 0)} st
                            </div>
                            <Badge className={cn(
                              "text-xs",
                              item.order.status === 'picking' 
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            )}>
                              {item.order.status === 'picking' ? 'Plockar' : 'Redo'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}