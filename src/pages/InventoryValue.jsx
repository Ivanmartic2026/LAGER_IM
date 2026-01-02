import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { 
  DollarSign, TrendingUp, Package, Warehouse, 
  ArrowLeft, Download, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function InventoryValuePage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
  });

  // Calculate inventory value
  const filteredArticles = articles.filter(article => {
    const matchesWarehouse = selectedWarehouse === "all" || article.warehouse === selectedWarehouse;
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    return matchesWarehouse && matchesCategory;
  });

  const totalValue = filteredArticles.reduce((sum, article) => {
    const cost = article.unit_cost || article.supplier_price || article.calculated_cost || 0;
    const qty = article.stock_qty || 0;
    return sum + (cost * qty);
  }, 0);

  const totalItems = filteredArticles.reduce((sum, article) => sum + (article.stock_qty || 0), 0);

  // Group by warehouse
  const valueByWarehouse = {};
  articles.forEach(article => {
    const warehouse = article.warehouse || 'Ej angivet';
    if (!valueByWarehouse[warehouse]) {
      valueByWarehouse[warehouse] = { value: 0, items: 0, count: 0 };
    }
    const cost = article.unit_cost || article.supplier_price || article.calculated_cost || 0;
    const qty = article.stock_qty || 0;
    valueByWarehouse[warehouse].value += cost * qty;
    valueByWarehouse[warehouse].items += qty;
    valueByWarehouse[warehouse].count += 1;
  });

  // Group by category
  const valueByCategory = {};
  articles.forEach(article => {
    const category = article.category || 'Other';
    if (!valueByCategory[category]) {
      valueByCategory[category] = { value: 0, items: 0, count: 0 };
    }
    const cost = article.unit_cost || article.supplier_price || article.calculated_cost || 0;
    const qty = article.stock_qty || 0;
    valueByCategory[category].value += cost * qty;
    valueByCategory[category].items += qty;
    valueByCategory[category].count += 1;
  });

  // Articles without cost
  const articlesWithoutCost = filteredArticles.filter(a => {
    const cost = a.unit_cost || a.supplier_price || a.calculated_cost;
    return !cost && (a.stock_qty || 0) > 0;
  });

  const categories = ['LED Module', 'Cabinet', 'Controller', 'Power Supply', 'Cable', 'Accessory', 'Other'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-4 md:p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

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
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Lagervärde</h1>
                <p className="text-sm text-white/50">Totalt värde av lager</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-48 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white backdrop-blur-xl transition-all duration-300">
                <SelectValue placeholder="Lagerställe" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value="all">Alla lagerställen</SelectItem>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white backdrop-blur-xl transition-all duration-300">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value="all">Alla kategorier</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Total Value Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-emerald-300">Totalt värde</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {totalValue.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-white/70">Antal artiklar</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {totalItems.toLocaleString('sv-SE')} st
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-white/70">Genomsnittsvärde</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {totalItems > 0 ? (totalValue / totalItems).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} kr
            </div>
          </motion.div>
        </div>

        {/* Warning for articles without cost */}
        {articlesWithoutCost.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-300">
                  {articlesWithoutCost.length} artikel{articlesWithoutCost.length !== 1 ? 'ar' : ''} saknar kostnadsinformation
                </p>
                <p className="text-xs text-amber-400/70 mt-1">
                  Dessa artiklar ingår inte i det totala lagervärdet
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Value by Warehouse */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Per lagerställe</h2>
          <div className="space-y-3">
            {Object.entries(valueByWarehouse)
              .sort(([, a], [, b]) => b.value - a.value)
              .map(([warehouse, data], idx) => (
                <div
                  key={warehouse}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl hover:border-white/20 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Warehouse className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{warehouse}</h3>
                        <p className="text-xs text-white/50">
                          {data.count} artiklar • {data.items} st
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">
                        {data.value.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
                      </div>
                      <Badge variant="outline" className="bg-white/5 text-white/60 border-white/20 text-xs">
                        {((data.value / totalValue) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </motion.div>

        {/* Value by Category */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">Per kategori</h2>
          <div className="space-y-3">
            {Object.entries(valueByCategory)
              .sort(([, a], [, b]) => b.value - a.value)
              .map(([category, data]) => (
                <div
                  key={category}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl hover:border-white/20 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Package className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{category}</h3>
                        <p className="text-xs text-white/50">
                          {data.count} artiklar • {data.items} st
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">
                        {data.value.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
                      </div>
                      <Badge variant="outline" className="bg-white/5 text-white/60 border-white/20 text-xs">
                        {((data.value / totalValue) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}