import React, { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Package, TrendingUp, TrendingDown, Activity, 
  BarChart3, AlertTriangle, Wrench, DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { sv } from "date-fns/locale";

const COLORS = {
  active: "#10b981",
  low_stock: "#f59e0b",
  out_of_stock: "#ef4444",
  on_repair: "#f97316",
  discontinued: "#6b7280"
};

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30");

  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-created_date'),
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ['movements'],
    queryFn: () => base44.entities.StockMovement.list('-created_date', 500),
  });

  const isLoading = articlesLoading || movementsLoading;

  // Calculate statistics
  const stats = useMemo(() => {
    const total = articles.length;
    const byStatus = {
      active: articles.filter(a => a.status === "active").length,
      low_stock: articles.filter(a => a.status === "low_stock").length,
      out_of_stock: articles.filter(a => a.status === "out_of_stock").length,
      on_repair: articles.filter(a => a.status === "on_repair").length,
      discontinued: articles.filter(a => a.status === "discontinued").length
    };
    const totalStockValue = articles.reduce((sum, a) => sum + (a.stock_qty || 0), 0);
    
    return { total, byStatus, totalStockValue };
  }, [articles]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    return [
      { name: "I lager", value: stats.byStatus.active, color: COLORS.active },
      { name: "Lågt lager", value: stats.byStatus.low_stock, color: COLORS.low_stock },
      { name: "Slut", value: stats.byStatus.out_of_stock, color: COLORS.out_of_stock },
      { name: "Reparation", value: stats.byStatus.on_repair, color: COLORS.on_repair },
      { name: "Utgått", value: stats.byStatus.discontinued, color: COLORS.discontinued }
    ].filter(item => item.value > 0);
  }, [stats]);

  // Movement trends over time
  const movementTrends = useMemo(() => {
    const days = parseInt(timeRange);
    const startDate = startOfDay(subDays(new Date(), days));
    
    const dailyData = {};
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), days - i - 1), "yyyy-MM-dd");
      dailyData[date] = { date, inbound: 0, outbound: 0, adjustment: 0 };
    }

    movements.forEach(movement => {
      const date = format(new Date(movement.created_date), "yyyy-MM-dd");
      if (dailyData[date]) {
        const qty = Math.abs(movement.quantity || 0);
        if (movement.movement_type === "inbound") {
          dailyData[date].inbound += qty;
        } else if (movement.movement_type === "outbound") {
          dailyData[date].outbound += qty;
        } else if (movement.movement_type === "adjustment") {
          dailyData[date].adjustment += Math.abs(qty);
        }
      }
    });

    return Object.values(dailyData);
  }, [movements, timeRange]);

  // Stock level trend over time
  const stockTrend = useMemo(() => {
    const days = parseInt(timeRange);
    const result = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      
      // Calculate stock at that point in time
      let totalStock = 0;
      articles.forEach(article => {
        let articleStock = article.stock_qty || 0;
        
        // Subtract movements that happened after this date
        movements
          .filter(m => m.article_id === article.id && new Date(m.created_date) > date)
          .forEach(m => {
            articleStock -= (m.quantity || 0);
          });
        
        totalStock += articleStock;
      });
      
      result.push({
        date: dateStr,
        stock: Math.max(0, totalStock)
      });
    }
    
    return result;
  }, [articles, movements, timeRange]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const categories = {};
    articles.forEach(article => {
      const cat = article.category || "Okänd";
      if (!categories[cat]) {
        categories[cat] = { name: cat, count: 0, stock: 0 };
      }
      categories[cat].count++;
      categories[cat].stock += (article.stock_qty || 0);
    });
    return Object.values(categories).sort((a, b) => b.count - a.count);
  }, [articles]);

  const StatCard = ({ icon: Icon, label, value, trend, trendLabel, color = "blue" }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", 
          `bg-${color}-500/20`)}>
          <Icon className={cn("w-5 h-5", `text-${color}-400`)} />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 text-sm",
            trend > 0 ? "text-emerald-400" : "text-red-400")}>
            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
      {trendLabel && (
        <p className="text-xs text-slate-500 mt-1">{trendLabel}</p>
      )}
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Rapporter & Analys</h1>
          <p className="text-slate-400">Översikt och trender för lagret</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Package}
            label="Totalt antal artiklar"
            value={stats.total}
            color="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="Totalt i lager"
            value={stats.totalStockValue}
            trendLabel="enheter"
            color="emerald"
          />
          <StatCard
            icon={AlertTriangle}
            label="Lågt lager / Slut"
            value={stats.byStatus.low_stock + stats.byStatus.out_of_stock}
            color="amber"
          />
          <StatCard
            icon={Wrench}
            label="På reparation"
            value={stats.byStatus.on_repair}
            color="orange"
          />
        </div>

        {/* Time Range Selector */}
        <div className="mb-6">
          <Tabs value={timeRange} onValueChange={setTimeRange}>
            <TabsList className="bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="7">7 dagar</TabsTrigger>
              <TabsTrigger value="30">30 dagar</TabsTrigger>
              <TabsTrigger value="90">90 dagar</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* Status Distribution */}
          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Fördelning per status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown */}
          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Artiklar per kategori</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" name="Antal artiklar" />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* Stock Level Trend */}
        <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Lagernivå över tid</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stockTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8' }}
                tickFormatter={(date) => format(new Date(date), "d MMM", { locale: sv })}
              />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                labelFormatter={(date) => format(new Date(date), "d MMMM yyyy", { locale: sv })}
              />
              <Line 
                type="monotone" 
                dataKey="stock" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Totalt lager"
                dot={{ fill: '#10b981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Movement Trends */}
        <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">In- och utflöden</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={movementTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8' }}
                tickFormatter={(date) => format(new Date(date), "d MMM", { locale: sv })}
              />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                labelFormatter={(date) => format(new Date(date), "d MMMM yyyy", { locale: sv })}
              />
              <Legend />
              <Bar dataKey="inbound" fill="#10b981" name="Inleverans" />
              <Bar dataKey="outbound" fill="#ef4444" name="Uttag" />
              <Bar dataKey="adjustment" fill="#f59e0b" name="Justeringar" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}