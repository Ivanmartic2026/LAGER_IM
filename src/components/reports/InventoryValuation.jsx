import React, { useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Package, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function InventoryValuation() {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const stats = useMemo(() => {
    const activeArticles = articles.filter(a => a.status !== 'discontinued');
    
    const totalValue = activeArticles.reduce((sum, article) => {
      const qty = article.stock_qty || 0;
      const price = article.supplier_price || article.calculated_cost || 0;
      return sum + (qty * price);
    }, 0);

    const totalItems = activeArticles.reduce((sum, a) => sum + (a.stock_qty || 0), 0);

    const lowStockValue = activeArticles
      .filter(a => (a.stock_qty || 0) <= (a.min_stock_level || 5))
      .reduce((sum, article) => {
        const qty = article.stock_qty || 0;
        const price = article.supplier_price || article.calculated_cost || 0;
        return sum + (qty * price);
      }, 0);

    const categoryBreakdown = activeArticles.reduce((acc, article) => {
      const category = article.category || 'Övrigt';
      const qty = article.stock_qty || 0;
      const price = article.supplier_price || article.calculated_cost || 0;
      const value = qty * price;
      
      if (!acc[category]) {
        acc[category] = { value: 0, items: 0, quantity: 0 };
      }
      acc[category].value += value;
      acc[category].items += 1;
      acc[category].quantity += qty;
      return acc;
    }, {});

    const categoryData = Object.entries(categoryBreakdown)
      .map(([name, data]) => ({
        name,
        value: data.value,
        items: data.items,
        quantity: data.quantity
      }))
      .sort((a, b) => b.value - a.value);

    const topItems = activeArticles
      .map(article => ({
        name: article.name,
        batch: article.batch_number,
        quantity: article.stock_qty || 0,
        price: article.supplier_price || article.calculated_cost || 0,
        value: (article.stock_qty || 0) * (article.supplier_price || article.calculated_cost || 0),
        category: article.category
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      totalValue,
      totalItems,
      lowStockValue,
      categoryData,
      topItems,
      articleCount: activeArticles.length
    };
  }, [articles]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-slate-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-slate-800/50 border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Totalt värde</p>
              <p className="text-2xl font-bold text-white">
                {stats.totalValue.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-slate-800/50 border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Antal artiklar</p>
              <p className="text-2xl font-bold text-white">{stats.articleCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-slate-800/50 border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Totalt antal</p>
              <p className="text-2xl font-bold text-white">{stats.totalItems} st</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-slate-800/50 border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Lågt lager värde</p>
              <p className="text-2xl font-bold text-white">
                {stats.lowStockValue.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Värdefördelning per kategori</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value) => `${value.toLocaleString('sv-SE')} kr`}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Kategoriöversikt</h3>
          <div className="space-y-3">
            {stats.categoryData.map((cat, index) => (
              <div key={cat.name} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-white">{cat.name}</span>
                  </div>
                  <span className="text-white font-semibold">
                    {cat.value.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>{cat.items} artiklar</span>
                  <span>{cat.quantity} st i lager</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top 10 Most Valuable Items */}
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Top 10 mest värdefulla artiklar</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-sm font-medium text-slate-400 pb-3">Artikel</th>
                <th className="text-left text-sm font-medium text-slate-400 pb-3">Batch</th>
                <th className="text-left text-sm font-medium text-slate-400 pb-3">Kategori</th>
                <th className="text-right text-sm font-medium text-slate-400 pb-3">Antal</th>
                <th className="text-right text-sm font-medium text-slate-400 pb-3">Á-pris</th>
                <th className="text-right text-sm font-medium text-slate-400 pb-3">Totalt värde</th>
              </tr>
            </thead>
            <tbody>
              {stats.topItems.map((item, index) => (
                <tr key={index} className="border-b border-slate-700/50">
                  <td className="py-3 text-white">{item.name}</td>
                  <td className="py-3 text-slate-400 font-mono text-sm">{item.batch || '—'}</td>
                  <td className="py-3">
                    {item.category && (
                      <Badge variant="outline" className="bg-slate-700/30 text-slate-300 text-xs">
                        {item.category}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 text-right text-white">{item.quantity}</td>
                  <td className="py-3 text-right text-slate-400">
                    {item.price.toLocaleString('sv-SE')} kr
                  </td>
                  <td className="py-3 text-right font-semibold text-white">
                    {item.value.toLocaleString('sv-SE')} kr
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}