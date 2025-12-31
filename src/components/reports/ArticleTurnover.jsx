import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, ArrowUpCircle, ArrowDownCircle, Package,
  Download, Calendar, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay } from "date-fns";
import { sv } from "date-fns/locale";

export default function ArticleTurnover() {
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [exporting, setExporting] = useState(false);

  const { data: movements = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['movements-turnover', dateRange],
    queryFn: async () => {
      const allMovements = await base44.entities.StockMovement.list('-created_date', 5000);
      return allMovements.filter(m => {
        const movementDate = new Date(m.created_date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        return movementDate >= startDate && movementDate <= endDate;
      });
    },
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-updated_date', 1000),
  });

  // Calculate turnover by article
  const turnoverByArticle = {};
  movements.forEach(movement => {
    if (!turnoverByArticle[movement.article_id]) {
      const article = articles.find(a => a.id === movement.article_id);
      turnoverByArticle[movement.article_id] = {
        article_name: article?.name || 'Okänd artikel',
        batch_number: article?.batch_number,
        inbound: 0,
        outbound: 0,
        adjustments: 0,
        net: 0,
        movements_count: 0
      };
    }

    const qty = Math.abs(movement.quantity);
    turnoverByArticle[movement.article_id].movements_count += 1;

    if (movement.movement_type === 'inbound') {
      turnoverByArticle[movement.article_id].inbound += qty;
      turnoverByArticle[movement.article_id].net += qty;
    } else if (movement.movement_type === 'outbound') {
      turnoverByArticle[movement.article_id].outbound += qty;
      turnoverByArticle[movement.article_id].net -= qty;
    } else if (movement.movement_type === 'adjustment') {
      turnoverByArticle[movement.article_id].adjustments += Math.abs(movement.quantity);
      turnoverByArticle[movement.article_id].net += movement.quantity;
    }
  });

  const turnoverList = Object.entries(turnoverByArticle).map(([id, data]) => ({
    article_id: id,
    ...data,
    total_activity: data.inbound + data.outbound
  }));

  const totalInbound = movements
    .filter(m => m.movement_type === 'inbound')
    .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

  const totalOutbound = movements
    .filter(m => m.movement_type === 'outbound')
    .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportTurnoverReport', {
        start_date: dateRange.start,
        end_date: dateRange.end
      });

      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `artikelomsattning_${dateRange.start}_${dateRange.end}.xlsx`;
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
      {/* Date Range & Actions */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-slate-300 mb-2">Från datum</Label>
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <Label className="text-slate-300 mb-2">Till datum</Label>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setDateRange({
              start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
              end: format(new Date(), 'yyyy-MM-dd')
            })}
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-700"
          >
            30 dagar
          </Button>
          
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
            className="bg-blue-600 hover:bg-blue-500"
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="text-xs text-emerald-300 font-medium">INLEVERANSER</div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {totalInbound.toLocaleString('sv-SE')} st
          </div>
          <div className="text-sm text-emerald-200/80">
            Mottaget under perioden
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/30 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-red-300" />
            </div>
            <div className="text-xs text-red-300 font-medium">UTTAG</div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {totalOutbound.toLocaleString('sv-SE')} st
          </div>
          <div className="text-sm text-red-200/80">
            Plockat under perioden
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-xs text-slate-400 font-medium">NETTO FÖRÄNDRING</div>
          </div>
          <div className={cn(
            "text-3xl font-bold mb-1",
            (totalInbound - totalOutbound) >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {(totalInbound - totalOutbound) >= 0 ? '+' : ''}
            {(totalInbound - totalOutbound).toLocaleString('sv-SE')} st
          </div>
          <div className="text-sm text-slate-400">
            Under perioden
          </div>
        </div>
      </div>

      {/* Most Active Articles */}
      <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          Mest aktiva artiklar
        </h3>
        <div className="space-y-2">
          {turnoverList
            .sort((a, b) => b.total_activity - a.total_activity)
            .slice(0, 15)
            .map((item, index) => (
              <div key={item.article_id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/30">
                <div className="flex items-start gap-4 mb-3">
                  <div className="text-lg font-bold text-slate-500 w-8 text-center">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white mb-1">
                      {item.article_name}
                    </div>
                    {item.batch_number && (
                      <div className="text-sm text-slate-400 font-mono">
                        #{item.batch_number}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {item.total_activity} st
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.movements_count} rörelser
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-xs text-emerald-400 mb-1">In</div>
                    <div className="text-sm font-semibold text-white">
                      +{item.inbound} st
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="text-xs text-red-400 mb-1">Ut</div>
                    <div className="text-sm font-semibold text-white">
                      -{item.outbound} st
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-700/50 border border-slate-600/50">
                    <div className="text-xs text-slate-400 mb-1">Netto</div>
                    <div className={cn(
                      "text-sm font-semibold",
                      item.net >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {item.net >= 0 ? '+' : ''}{item.net} st
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Movement Timeline */}
      <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          Senaste rörelser
        </h3>
        <div className="space-y-2">
          {movements.slice(0, 20).map((movement) => {
            const article = articles.find(a => a.id === movement.article_id);
            const typeConfig = {
              inbound: { icon: <ArrowUpCircle className="w-4 h-4" />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              outbound: { icon: <ArrowDownCircle className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
              adjustment: { icon: <Package className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
              inventory: { icon: <Package className="w-4 h-4" />, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" }
            }[movement.movement_type] || { icon: <Package className="w-4 h-4" />, color: "text-slate-400", bg: "bg-slate-700/50", border: "border-slate-600/50" };

            return (
              <div key={movement.id} className={cn("p-3 rounded-lg border", typeConfig.bg, typeConfig.border)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn("mt-0.5", typeConfig.color)}>
                      {typeConfig.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white mb-1 truncate">
                        {article?.name || 'Okänd artikel'}
                      </div>
                      <div className="text-sm text-slate-400">
                        {movement.reason || 'Ingen anledning angiven'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {format(new Date(movement.created_date), "d MMM yyyy HH:mm", { locale: sv })}
                      </div>
                    </div>
                  </div>
                  <div className={cn("font-bold text-lg", typeConfig.color)}>
                    {movement.quantity >= 0 ? '+' : ''}{movement.quantity} st
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}