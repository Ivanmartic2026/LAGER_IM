import React, { useMemo, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Package, Calendar, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { sv } from 'date-fns/locale';

export default function ArticleTurnover() {
  const [timeRange, setTimeRange] = useState('30'); // days
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: () => base44.entities.StockMovement.list('-created_date', 500),
  });

  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const stats = useMemo(() => {
    const days = parseInt(timeRange);
    const cutoffDate = subDays(new Date(), days);
    
    const recentMovements = movements.filter(m => 
      new Date(m.created_date) >= cutoffDate
    );

    // Filter by category if selected
    const relevantArticleIds = selectedCategory === 'all' 
      ? new Set(articles.map(a => a.id))
      : new Set(articles.filter(a => a.category === selectedCategory).map(a => a.id));

    const filteredMovements = recentMovements.filter(m => 
      relevantArticleIds.has(m.article_id)
    );

    // Calculate inbound and outbound
    const inbound = filteredMovements
      .filter(m => m.movement_type === 'inbound')
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

    const outbound = filteredMovements
      .filter(m => m.movement_type === 'outbound')
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

    const adjustments = filteredMovements
      .filter(m => m.movement_type === 'adjustment')
      .reduce((sum, m) => sum + m.quantity, 0);

    // Daily breakdown
    const dailyData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStart = startOfDay(date);
      const dateEnd = endOfDay(date);
      
      const dayMovements = filteredMovements.filter(m => {
        const mDate = new Date(m.created_date);
        return mDate >= dateStart && mDate <= dateEnd;
      });

      const dayInbound = dayMovements
        .filter(m => m.movement_type === 'inbound')
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

      const dayOutbound = dayMovements
        .filter(m => m.movement_type === 'outbound')
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

      dailyData.push({
        date: format(date, 'dd MMM', { locale: sv }),
        inbound: dayInbound,
        outbound: dayOutbound,
        net: dayInbound - dayOutbound
      });
    }

    // Top movers (most activity)
    const articleActivity = filteredMovements.reduce((acc, m) => {
      if (!acc[m.article_id]) {
        const article = articles.find(a => a.id === m.article_id);
        acc[m.article_id] = {
          article_id: m.article_id,
          name: article?.name || 'Okänd',
          batch: article?.batch_number,
          category: article?.category,
          inbound: 0,
          outbound: 0,
          net: 0
        };
      }
      
      if (m.movement_type === 'inbound') {
        acc[m.article_id].inbound += Math.abs(m.quantity);
      } else if (m.movement_type === 'outbound') {
        acc[m.article_id].outbound += Math.abs(m.quantity);
      }
      acc[m.article_id].net = acc[m.article_id].inbound - acc[m.article_id].outbound;
      
      return acc;
    }, {});

    const topMovers = Object.values(articleActivity)
      .sort((a, b) => (Math.abs(b.inbound) + Math.abs(b.outbound)) - (Math.abs(a.inbound) + Math.abs(a.outbound)))
      .slice(0, 10);

    // Category breakdown
    const categoryBreakdown = filteredMovements.reduce((acc, m) => {
      const article = articles.find(a => a.id === m.article_id);
      const category = article?.category || 'Övrigt';
      
      if (!acc[category]) {
        acc[category] = { inbound: 0, outbound: 0 };
      }
      
      if (m.movement_type === 'inbound') {
        acc[category].inbound += Math.abs(m.quantity);
      } else if (m.movement_type === 'outbound') {
        acc[category].outbound += Math.abs(m.quantity);
      }
      
      return acc;
    }, {});

    const categoryData = Object.entries(categoryBreakdown).map(([name, data]) => ({
      name,
      inbound: data.inbound,
      outbound: data.outbound,
      net: data.inbound - data.outbound
    }));

    const categories = ['all', ...new Set(articles.map(a => a.category).filter(Boolean))];

    return {
      inbound,
      outbound,
      adjustments,
      net: inbound - outbound,
      dailyData,
      topMovers,
      categoryData,
      categories,
      totalMovements: filteredMovements.length
    };
  }, [movements, articles, timeRange, selectedCategory]);

  const isLoading = movementsLoading || articlesLoading;

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
      {/* Controls */}
      <Card className="p-4 bg-slate-800/50 border-slate-700">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Senaste 7 dagarna</SelectItem>
                <SelectItem value="14">Senaste 14 dagarna</SelectItem>
                <SelectItem value="30">Senaste 30 dagarna</SelectItem>
                <SelectItem value="60">Senaste 60 dagarna</SelectItem>
                <SelectItem value="90">Senaste 90 dagarna</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla kategorier</SelectItem>
                {stats.categories.filter(c => c !== 'all').map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto text-sm text-slate-400">
            {stats.totalMovements} rörelser
          </div>
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-slate-800/50 border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Inleveranser</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.inbound}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-slate-800/50 border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Uttag</p>
              <p className="text-2xl font-bold text-red-400">{stats.outbound}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-slate-800/50 border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              stats.net >= 0 ? "bg-blue-500/20" : "bg-amber-500/20"
            )}>
              {stats.net >= 0 ? (
                <TrendingUp className="w-5 h-5 text-blue-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400">Netto</p>
              <p className={cn(
                "text-2xl font-bold",
                stats.net >= 0 ? "text-blue-400" : "text-amber-400"
              )}>
                {stats.net >= 0 ? '+' : ''}{stats.net}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-slate-800/50 border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Justeringar</p>
              <p className="text-2xl font-bold text-purple-400">{Math.abs(stats.adjustments)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Daily Trend Chart */}
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Daglig omsättning</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="inbound" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Inleverans"
              dot={{ fill: '#10b981' }}
            />
            <Line 
              type="monotone" 
              dataKey="outbound" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Uttag"
              dot={{ fill: '#ef4444' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Category Breakdown */}
      {stats.categoryData.length > 0 && (
        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Omsättning per kategori</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Bar dataKey="inbound" fill="#10b981" name="Inleverans" />
              <Bar dataKey="outbound" fill="#ef4444" name="Uttag" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Top Movers Table */}
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Mest aktiva artiklar</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-sm font-medium text-slate-400 pb-3">Artikel</th>
                <th className="text-left text-sm font-medium text-slate-400 pb-3">Batch</th>
                <th className="text-left text-sm font-medium text-slate-400 pb-3">Kategori</th>
                <th className="text-right text-sm font-medium text-slate-400 pb-3">In</th>
                <th className="text-right text-sm font-medium text-slate-400 pb-3">Ut</th>
                <th className="text-right text-sm font-medium text-slate-400 pb-3">Netto</th>
              </tr>
            </thead>
            <tbody>
              {stats.topMovers.map((item, index) => (
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
                  <td className="py-3 text-right text-emerald-400 font-semibold">
                    +{item.inbound}
                  </td>
                  <td className="py-3 text-right text-red-400 font-semibold">
                    -{item.outbound}
                  </td>
                  <td className={cn(
                    "py-3 text-right font-bold",
                    item.net >= 0 ? "text-blue-400" : "text-amber-400"
                  )}>
                    {item.net >= 0 ? '+' : ''}{item.net}
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