import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, Package, TrendingUp, Warehouse, 
  Download, Filter, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function InventoryValuation() {
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

  const { data: articles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-updated_date', 1000),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
  });

  // Filter articles
  const filteredArticles = articles.filter(article => {
    const warehouseMatch = warehouseFilter === "all" || article.warehouse === warehouseFilter;
    const categoryMatch = categoryFilter === "all" || article.category === categoryFilter;
    return warehouseMatch && categoryMatch && (article.stock_qty > 0);
  });

  // Calculate valuations
  const valuationByWarehouse = {};
  const valuationByCategory = {};
  let totalValue = 0;
  let totalQuantity = 0;

  filteredArticles.forEach(article => {
    const qty = article.stock_qty || 0;
    const price = article.supplier_price || article.calculated_cost || 0;
    const value = qty * price;

    totalValue += value;
    totalQuantity += qty;

    // By warehouse
    if (article.warehouse) {
      if (!valuationByWarehouse[article.warehouse]) {
        valuationByWarehouse[article.warehouse] = { value: 0, qty: 0, items: 0 };
      }
      valuationByWarehouse[article.warehouse].value += value;
      valuationByWarehouse[article.warehouse].qty += qty;
      valuationByWarehouse[article.warehouse].items += 1;
    }

    // By category
    if (article.category) {
      if (!valuationByCategory[article.category]) {
        valuationByCategory[article.category] = { value: 0, qty: 0, items: 0 };
      }
      valuationByCategory[article.category].value += value;
      valuationByCategory[article.category].qty += qty;
      valuationByCategory[article.category].items += 1;
    }
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportValuationReport', {
        warehouse: warehouseFilter,
        category: categoryFilter
      });

      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lagervardering_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Lagerställe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla lagerställen</SelectItem>
            {warehouses.map(w => (
              <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla kategorier</SelectItem>
            <SelectItem value="LED Module">LED Module</SelectItem>
            <SelectItem value="Cabinet">Cabinet</SelectItem>
            <SelectItem value="Controller">Controller</SelectItem>
            <SelectItem value="Power Supply">Power Supply</SelectItem>
            <SelectItem value="Cable">Cable</SelectItem>
            <SelectItem value="Accessory">Accessory</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={() => refetch()}
          disabled={isRefetching}
          variant="outline"
          size="sm"
          className="bg-slate-800 border-slate-700"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
          Uppdatera
        </Button>

        <Button
          onClick={handleExport}
          disabled={exporting}
          size="sm"
          className="bg-blue-600 hover:bg-blue-500 ml-auto"
        >
          {exporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Exporterar...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Exportera
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-300" />
            </div>
            <div className="text-xs text-blue-300 font-medium">TOTALT LAGERVÄRDE</div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {totalValue.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr
          </div>
          <div className="text-sm text-blue-200/80">
            {filteredArticles.length} artiklar
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
              <Package className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-xs text-slate-400 font-medium">TOTALT ANTAL</div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {totalQuantity.toLocaleString('sv-SE')} st
          </div>
          <div className="text-sm text-slate-400">
            I lager
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-xs text-slate-400 font-medium">GENOMSNITT/ARTIKEL</div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {filteredArticles.length > 0 
              ? (totalValue / filteredArticles.length).toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
              : 0} kr
          </div>
          <div className="text-sm text-slate-400">
            Per artikel
          </div>
        </div>
      </div>

      {/* By Warehouse */}
      {Object.keys(valuationByWarehouse).length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-blue-400" />
            Per Lagerställe
          </h3>
          <div className="space-y-3">
            {Object.entries(valuationByWarehouse)
              .sort((a, b) => b[1].value - a[1].value)
              .map(([warehouse, data]) => (
                <div key={warehouse} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-700/30">
                  <div className="flex-1">
                    <div className="font-medium text-white mb-1">{warehouse}</div>
                    <div className="text-sm text-slate-400">
                      {data.items} artiklar • {data.qty} st
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">
                      {data.value.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr
                    </div>
                    <div className="text-xs text-slate-500">
                      {((data.value / totalValue) * 100).toFixed(1)}% av totalt
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* By Category */}
      {Object.keys(valuationByCategory).length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            Per Kategori
          </h3>
          <div className="space-y-3">
            {Object.entries(valuationByCategory)
              .sort((a, b) => b[1].value - a[1].value)
              .map(([category, data]) => (
                <div key={category} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-700/30">
                  <div className="flex-1">
                    <div className="font-medium text-white mb-1">{category}</div>
                    <div className="text-sm text-slate-400">
                      {data.items} artiklar • {data.qty} st
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">
                      {data.value.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr
                    </div>
                    <div className="text-xs text-slate-500">
                      {((data.value / totalValue) * 100).toFixed(1)}% av totalt
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top Value Articles */}
      <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Högst Värde (Top 10)
        </h3>
        <div className="space-y-2">
          {filteredArticles
            .map(a => ({
              ...a,
              value: (a.stock_qty || 0) * (a.supplier_price || a.calculated_cost || 0)
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)
            .map((article, index) => (
              <div key={article.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
                <div className="text-lg font-bold text-slate-500 w-8 text-center">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">
                    {article.customer_name || article.name}
                  </div>
                  <div className="text-sm text-slate-400">
                    {article.stock_qty} st × {(article.supplier_price || article.calculated_cost || 0).toLocaleString('sv-SE')} kr
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {article.value.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}