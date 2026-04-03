import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Activity, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const fmt = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 });
const fmtPct = (n) => (isFinite(n) && !isNaN(n) ? n.toFixed(1) + ' %' : '–');

const STATUS_MAP = {
  ONGOING: { label: 'Pågående', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  COMPLETED: { label: 'Avslutad', cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  NOTSTARTED: { label: 'Ej startad', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[(status || '').toUpperCase()] || { label: status || '–', cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function KpiCard({ title, value, icon: Icon, positive, negative }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-widest mb-1">{title}</p>
          <p className={`text-2xl font-bold ${positive ? 'text-green-400' : negative ? 'text-red-400' : 'text-white'}`}>
            {value}
          </p>
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
            <Icon className="w-4 h-4 text-white/40" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InvoiceSubTable({ title, rows, numKey, nameKey, color }) {
  return (
    <div>
      <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">{title}</p>
      {rows?.length ? (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/40 border-b border-white/10">
              <th className="text-left pb-1">Nr</th>
              <th className="text-left pb-1">Namn</th>
              <th className="text-right pb-1">Belopp</th>
              <th className="text-left pb-1 pl-3">Datum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv, i) => (
              <tr key={i} className="border-b border-white/5 text-white/70">
                <td className="py-1 font-mono">{inv[numKey]}</td>
                <td className="py-1 truncate max-w-[130px]">{inv[nameKey]}</td>
                <td className={`py-1 text-right ${color}`}>{fmt(inv.Total)}</td>
                <td className="py-1 pl-3 text-white/40">{inv.InvoiceDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-white/30 text-xs italic">Inga fakturor</p>
      )}
    </div>
  );
}

function ExpandedRow({ project }) {
  return (
    <tr>
      <td colSpan={8} className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InvoiceSubTable
            title="Kundfakturor"
            rows={project.customerInvoices}
            numKey="DocumentNumber"
            nameKey="CustomerName"
            color="text-green-400"
          />
          <InvoiceSubTable
            title="Leverantörsfakturor"
            rows={project.supplierInvoices}
            numKey="GivenNumber"
            nameKey="SupplierName"
            color="text-orange-400"
          />
        </div>
      </td>
    </tr>
  );
}

export default function ProjectResults() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showEmpty, setShowEmpty] = useState(false);
  const [sortBy, setSortBy] = useState('result');
  const [expanded, setExpanded] = useState(new Set());

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['projectFinancials'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getProjectFinancials', {});
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const projects = data?.projects || [];

  const filtered = useMemo(() => {
    let list = [...projects];
    if (!showEmpty) list = list.filter(p => p.revenue !== 0 || p.costs !== 0);
    if (statusFilter !== 'all') list = list.filter(p => (p.projectStatus || '').toUpperCase() === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.projectNumber?.toLowerCase().includes(q) || p.projectName?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === 'result') return b.result - a.result;
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'costs') return b.costs - a.costs;
      return (a.projectNumber || '').localeCompare(b.projectNumber || '');
    });
    return list;
  }, [projects, search, statusFilter, showEmpty, sortBy]);

  const totalRevenue = filtered.reduce((s, p) => s + p.revenue, 0);
  const totalCosts = filtered.reduce((s, p) => s + p.costs, 0);
  const totalResult = totalRevenue - totalCosts;
  const totalTb = totalRevenue > 0 ? (totalResult / totalRevenue) * 100 : 0;

  const top5 = useMemo(() =>
    [...projects]
      .filter(p => p.revenue > 0 || p.costs > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(p => ({
        name: p.projectNumber,
        label: (p.projectName || p.projectNumber)?.slice(0, 22),
        Intäkter: p.revenue,
        Kostnader: p.costs,
      })),
    [projects]
  );

  const toggleRow = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Projektresultat</h1>
            <p className="text-sm text-white/40 mt-0.5">Ekonomisk översikt per projekt från Fortnox</p>
          </div>
          <Button onClick={() => refetch()} disabled={isFetching} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Hämta data
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-40">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard title="Total intäkter" value={fmt(totalRevenue) + ' kr'} icon={TrendingUp} />
              <KpiCard title="Total kostnader" value={fmt(totalCosts) + ' kr'} icon={TrendingDown} />
              <KpiCard title="Total resultat" value={fmt(totalResult) + ' kr'} icon={Activity} positive={totalResult > 0} negative={totalResult < 0} />
              <KpiCard title="Täckningsbidrag %" value={fmtPct(totalTb)} icon={Percent} positive={totalTb > 0} negative={totalTb < 0} />
            </div>

            {/* Top 5 Chart */}
            {top5.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm font-semibold">Top 5 projekt efter intäkter</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={top5} layout="vertical" margin={{ left: 100, right: 20 }}>
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => fmt(v)} />
                      <YAxis type="category" dataKey="label" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} width={100} />
                      <Tooltip
                        contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                        formatter={(v, name) => [fmt(v) + ' kr', name]}
                      />
                      <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                      <Bar dataKey="Intäkter" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Kostnader" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Sök projekt..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 w-48"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  <SelectItem value="all">Alla statusar</SelectItem>
                  <SelectItem value="ONGOING">Pågående</SelectItem>
                  <SelectItem value="COMPLETED">Avslutade</SelectItem>
                  <SelectItem value="NOTSTARTED">Ej startade</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  <SelectItem value="result">Resultat ↓</SelectItem>
                  <SelectItem value="revenue">Intäkter ↓</SelectItem>
                  <SelectItem value="costs">Kostnader ↓</SelectItem>
                  <SelectItem value="number">Projektnummer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmpty(v => !v)}
                className={`border-white/20 text-sm transition-colors ${showEmpty ? 'bg-blue-600/30 text-blue-300 border-blue-500/40' : 'bg-white/5 text-white/50 hover:text-white'}`}
              >
                Visa tomma projekt
              </Button>
              <span className="text-xs text-white/40 ml-auto">Visar {filtered.length} av {projects.length} projekt</span>
            </div>

            {/* Table */}
            <Card className="bg-white/5 border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 w-8"></th>
                      <th className="text-left px-4 py-3">Nr</th>
                      <th className="text-left px-4 py-3">Projektnamn</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Intäkter</th>
                      <th className="text-right px-4 py-3">Kostnader</th>
                      <th className="text-right px-4 py-3">Resultat</th>
                      <th className="text-right px-4 py-3">TB%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(project => {
                      const isExpanded = expanded.has(project.projectNumber);
                      const tb = project.revenue > 0 ? (project.result / project.revenue) * 100 : 0;
                      return (
                        <React.Fragment key={project.projectNumber}>
                          <tr
                            onClick={() => toggleRow(project.projectNumber)}
                            className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 text-white/30">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </td>
                            <td className="px-4 py-3 text-white/50 font-mono text-xs">{project.projectNumber}</td>
                            <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">{project.projectName}</td>
                            <td className="px-4 py-3"><StatusBadge status={project.projectStatus} /></td>
                            <td className="px-4 py-3 text-right text-white/80">{fmt(project.revenue)}</td>
                            <td className="px-4 py-3 text-right text-white/80">{fmt(project.costs)}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${project.result >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {fmt(project.result)}
                            </td>
                            <td className={`px-4 py-3 text-right text-xs ${tb >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>
                              {fmtPct(tb)}
                            </td>
                          </tr>
                          {isExpanded && <ExpandedRow project={project} />}
                        </React.Fragment>
                      );
                    })}

                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center text-white/30">
                          Inga projekt matchar filtret
                        </td>
                      </tr>
                    )}

                    {/* Footer totals */}
                    {filtered.length > 0 && (
                      <tr className="border-t-2 border-white/20 bg-white/5 font-semibold">
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-white/50 text-xs uppercase tracking-wider">
                          Totalt ({filtered.length} projekt)
                        </td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-right text-white">{fmt(totalRevenue)}</td>
                        <td className="px-4 py-3 text-right text-white">{fmt(totalCosts)}</td>
                        <td className={`px-4 py-3 text-right ${totalResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {fmt(totalResult)}
                        </td>
                        <td className={`px-4 py-3 text-right text-xs ${totalTb >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {fmtPct(totalTb)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}