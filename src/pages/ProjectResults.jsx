import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { RefreshCw, AlertTriangle, CheckCircle2, Printer, TrendingUp, TrendingDown, Activity, Percent, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import ExpandedRow from '@/components/ExpandedRow';

const TODAY = new Date();
const fmt = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 }) + ' kr';
const fmtNum = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 });
const fmtPct = (n) => (n != null && isFinite(n) && !isNaN(n) ? n.toFixed(1) + '%' : '–');
const tb = (rev, res) => rev > 0 ? (res / rev) * 100 : null;
const isOverdue = (dueDate) => dueDate && new Date(dueDate) < TODAY;

const STATUS_MAP = {
  ONGOING: { label: 'Pågående', cls: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  COMPLETED: { label: 'Avslutad', cls: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
  NOTSTARTED: { label: 'Ej startad', cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[(status || '').toUpperCase()] ||
    { label: status || '–', cls: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function InvoiceStatusBadge({ inv }) {
  if (inv.isPaid) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">Betald</span>;
  if (!inv.isPaid && isOverdue(inv.dueDate)) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">Förfallen</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">Obetald</span>;
}

function KpiCard({ title, value, color }) {
  const colorMap = {
    blue: 'border-blue-500/20 bg-blue-500/5',
    green: 'border-green-500/20 bg-green-500/5',
    orange: 'border-orange-500/20 bg-orange-500/5',
    red: 'border-red-500/20 bg-red-500/5',
    yellow: 'border-yellow-500/20 bg-yellow-500/5',
    dynamic: '',
  };
  const textMap = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
  };
  return (
    <Card className={`border ${colorMap[color] || 'bg-white/5 border-white/10'}`}>
      <CardContent className="p-4">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{title}</p>
        <p className={`text-lg font-bold ${textMap[color] || 'text-white'}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InvoiceDetailModal({ invoice, projectName, projectNumber, type, onClose }) {
  if (!invoice) return null;
  const name = type === 'customer' ? invoice.customerName : invoice.supplierName;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            Faktura #{invoice.invoiceNumber}
            <span className="text-xs text-white/40 font-normal">{type === 'customer' ? 'Kundfaktura' : 'Leverantörsfaktura'}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
          <div><p className="text-white/40 text-xs mb-1">{type === 'customer' ? 'Kund' : 'Leverantör'}</p><p className="text-white font-medium">{name || '–'}</p></div>
          <div><p className="text-white/40 text-xs mb-1">Projekt</p><p className="text-white font-medium">{projectName} ({projectNumber})</p></div>
          <div><p className="text-white/40 text-xs mb-1">Fakturadatum</p><p className="text-white">{invoice.invoiceDate || '–'}</p></div>
          <div><p className="text-white/40 text-xs mb-1">Förfallodatum</p><p className="text-white">{invoice.dueDate || '–'}</p></div>
          <div><p className="text-white/40 text-xs mb-1">Totalbelopp</p><p className="text-white font-semibold">{fmt(invoice.total)}</p></div>
          <div><p className="text-white/40 text-xs mb-1">Återstående</p><p className={`font-semibold ${invoice.balance > 0 ? 'text-orange-400' : 'text-green-400'}`}>{fmt(invoice.balance)}</p></div>
          <div className="col-span-2"><p className="text-white/40 text-xs mb-1">Status</p><InvoiceStatusBadge inv={invoice} /></div>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={onClose} variant="outline" className="border-white/20 text-white bg-white/5 hover:bg-white/10">Stäng</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SlutrapportModal({ project, onClose }) {
  if (!project) return null;
  const tbPct = tb(project.revenue, project.result);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white text-lg">Slutrapport — {project.projectName}</DialogTitle>
            <Button onClick={() => window.print()} variant="outline" size="sm" className="border-white/20 text-white bg-white/5 hover:bg-white/10 gap-2">
              <Printer className="w-4 h-4" />Skriv ut
            </Button>
          </div>
        </DialogHeader>
        <div className="space-y-6 mt-2">
          <div>
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Projektinfo</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-white/40 text-xs mb-1">Projektnr</p><p className="text-white font-medium">{project.projectNumber}</p></div>
              <div><p className="text-white/40 text-xs mb-1">Kund</p><p className="text-white font-medium">{project.customerName || '–'}</p></div>
              <div><p className="text-white/40 text-xs mb-1">Status</p><StatusBadge status={project.projectStatus} /></div>
              <div><p className="text-white/40 text-xs mb-1">Period</p><p className="text-white">{project.startDate || '?'} → {project.endDate || '?'}</p></div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Ekonomisk sammanfattning</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard title="Ordervärde" value={fmt(project.orderValue)} color="blue" />
              <KpiCard title="Fakturerat" value={fmt(project.revenue)} color="green" />
              <KpiCard title="Kostnader" value={fmt(project.costs)} color="red" />
              <KpiCard title="Resultat" value={fmt(project.result)} color={project.result >= 0 ? 'green' : 'red'} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Kundfakturor</h3>
            {project.customerInvoices?.length ? (
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/10 text-white/40">
                    <th className="text-left px-3 py-2">Nr</th><th className="text-left px-3 py-2">Kund</th>
                    <th className="text-left px-3 py-2">Datum</th><th className="text-left px-3 py-2">Förfaller</th>
                    <th className="text-right px-3 py-2">Belopp</th><th className="text-right px-3 py-2">Återstår</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {project.customerInvoices.map((inv, i) => (
                      <tr key={i} className="border-b border-white/5 text-white/80">
                        <td className="px-3 py-2 font-mono">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2">{inv.customerName}</td>
                        <td className="px-3 py-2">{inv.invoiceDate}</td>
                        <td className="px-3 py-2">{inv.dueDate}</td>
                        <td className="px-3 py-2 text-right">{fmtNum(inv.total)}</td>
                        <td className="px-3 py-2 text-right">{fmtNum(inv.balance)}</td>
                        <td className="px-3 py-2"><InvoiceStatusBadge inv={inv} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-white/30 text-sm italic">Inga kundfakturor</p>}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Leverantörsfakturor</h3>
            {project.supplierInvoices?.length ? (
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/10 text-white/40">
                    <th className="text-left px-3 py-2">Nr</th><th className="text-left px-3 py-2">Leverantör</th>
                    <th className="text-left px-3 py-2">Datum</th><th className="text-right px-3 py-2">Belopp</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {project.supplierInvoices.map((inv, i) => (
                      <tr key={i} className="border-b border-white/5 text-white/80">
                        <td className="px-3 py-2 font-mono">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2">{inv.supplierName}</td>
                        <td className="px-3 py-2">{inv.invoiceDate}</td>
                        <td className="px-3 py-2 text-right">{fmtNum(inv.total)}</td>
                        <td className="px-3 py-2"><InvoiceStatusBadge inv={inv} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-white/30 text-sm italic">Inga leverantörsfakturor</p>}
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 italic">
            Projektet <span className="font-semibold text-white not-italic">{project.projectName}</span> visar ett{' '}
            <span className={project.result >= 0 ? 'text-green-400 not-italic' : 'text-red-400 not-italic'}>{project.result >= 0 ? 'positivt' : 'negativt'}</span>{' '}
            resultat på <span className="font-semibold text-white not-italic">{fmt(project.result)}</span> med en marginal på{' '}
            <span className="font-semibold text-white not-italic">{fmtPct(tbPct)}</span>.
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={onClose} variant="outline" className="border-white/20 text-white bg-white/5 hover:bg-white/10">Stäng</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateProjectModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ description: '', status: 'NOTSTARTED', projectNumber: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.description.trim()) { toast.error('Projektnamn krävs'); return; }
    setLoading(true);
    try {
      await base44.functions.invoke('createFortnoxProject', {
        projectNumber: form.projectNumber || undefined,
        description: form.description,
        status: form.status,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined
      });
      toast.success('Projekt skapat');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Fel vid skapande av projekt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
        <DialogHeader><DialogTitle className="text-white">Skapa nytt projekt</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-xs text-white/50 uppercase">Projektnummer (valfritt)</label>
            <Input placeholder="Genereras automatiskt av Fortnox" value={form.projectNumber} onChange={e => setForm({ ...form, projectNumber: e.target.value })} className="bg-white/5 border-white/20 text-white mt-1" />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase">Projektnamn (obligatoriskt)</label>
            <Input placeholder="T.ex. LED-skärm installation" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-white/5 border-white/20 text-white mt-1" />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase">Status</label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                <SelectItem value="NOTSTARTED">Ej startad</SelectItem>
                <SelectItem value="ONGOING">Pågående</SelectItem>
                <SelectItem value="COMPLETED">Avslutad</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase">Startdatum</label>
            <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="bg-white/5 border-white/20 text-white mt-1" />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase">Slutdatum</label>
            <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="bg-white/5 border-white/20 text-white mt-1" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onClose} variant="outline" className="border-white/20 text-white bg-white/5 hover:bg-white/10">Avbryt</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white">{loading ? 'Skapar...' : 'Skapa projekt'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function marginColor(pct) {
  if (pct === null) return 'text-white/30';
  if (pct >= 20) return 'text-green-400';
  if (pct >= 5) return 'text-yellow-400';
  return 'text-red-400';
}

function SortableHeader({ label, col, sortBy, sortDir, onSort, className = '' }) {
  const active = sortBy === col;
  return (
    <th
      className={`px-3 py-3 cursor-pointer select-none hover:text-white/70 ${active ? 'text-white' : 'text-white/40'} ${className}`}
      onClick={() => onSort(col)}
    >
      {label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );
}

function MainTable({ projects, onSlutModal, onInvoiceClick }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hideEmpty, setHideEmpty] = useState(false);
  const [sortBy, setSortBy] = useState('result');
  const [sortDir, setSortDir] = useState('asc');
  const [expanded, setExpanded] = useState(new Set());
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [slutModal, setSlutModal] = useState(null);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = [...projects];
    if (hideEmpty) list = list.filter(p => p.revenue !== 0 || p.costs !== 0 || (p.orderValue || 0) !== 0);
    if (statusFilter === 'ONGOING') list = list.filter(p => (p.projectStatus || '').toUpperCase() === 'ONGOING');
    else if (statusFilter === 'COMPLETED') list = list.filter(p => (p.projectStatus || '').toUpperCase() === 'COMPLETED');
    else if (statusFilter === 'NOTSTARTED') list = list.filter(p => (p.projectStatus || '').toUpperCase() === 'NOTSTARTED');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.projectNumber?.toLowerCase().includes(q) || p.projectName?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case 'result': va = a.result; vb = b.result; break;
        case 'revenue': va = a.revenue; vb = b.revenue; break;
        case 'costs': va = a.costs; vb = b.costs; break;
        case 'orderValue': va = a.orderValue || 0; vb = b.orderValue || 0; break;
        case 'unfactured': va = a.unfactured || 0; vb = b.unfactured || 0; break;
        case 'margin': va = a.marginPct ?? -999; vb = b.marginPct ?? -999; break;
        case 'unpaid': va = a.unpaidAmount || 0; vb = b.unpaidAmount || 0; break;
        default: return (a.projectNumber || '').localeCompare(b.projectNumber || '');
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return list;
  }, [projects, search, statusFilter, hideEmpty, sortBy, sortDir]);

  const toggleRow = (id) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Warning counts
  const negativeCount = filtered.filter(p => p.warnings?.includes('Negativ marginal')).length;
  const overdueCount = filtered.filter(p => p.warnings?.includes('Förfallen faktura')).length;
  const unfacturedCount = filtered.filter(p => p.warnings?.includes('Ej fakturerat')).length;
  const hasWarnings = negativeCount > 0 || overdueCount > 0 || unfacturedCount > 0;

  // Totals
  const totals = useMemo(() => ({
    orderValue: filtered.reduce((s, p) => s + (p.orderValue || 0), 0),
    revenue: filtered.reduce((s, p) => s + p.revenue, 0),
    unfactured: filtered.reduce((s, p) => s + (p.unfactured || 0), 0),
    costs: filtered.reduce((s, p) => s + p.costs, 0),
    result: filtered.reduce((s, p) => s + p.result, 0),
    paid: filtered.reduce((s, p) => s + (p.paidAmount || 0), 0),
    unpaid: filtered.reduce((s, p) => s + (p.unpaidAmount || 0), 0),
  }), [filtered]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Sök projektnr eller namn..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 w-56"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-white">
            <SelectItem value="all">Alla</SelectItem>
            <SelectItem value="ONGOING">Pågående</SelectItem>
            <SelectItem value="NOTSTARTED">Ej startade</SelectItem>
            <SelectItem value="COMPLETED">Avslutade</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline" size="sm"
          onClick={() => setHideEmpty(v => !v)}
          className={`border-white/20 text-sm ${hideEmpty ? 'bg-blue-600/30 text-blue-300 border-blue-500/40' : 'bg-white/5 text-white/50 hover:text-white'}`}
        >
          Dölj utan aktivitet
        </Button>
        <span className="text-xs text-white/30 ml-auto">Visar {filtered.length} av {projects.length} projekt</span>
      </div>

      {/* Warnings summary bar */}
      {hasWarnings && (
        <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
          {negativeCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
              🔴 {negativeCount} projekt med negativ marginal
            </span>
          )}
          {overdueCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
              🟠 {overdueCount} projekt med förfallna fakturor
            </span>
          )}
          {unfacturedCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              🟡 {unfacturedCount} projekt ej fakturerat
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider">
              <th className="px-3 py-3 w-8 text-white/40" />
              <SortableHeader label="Projektnummer" col="number" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-left" />
              <th className="text-left px-3 py-3 text-white/40">Projektnamn</th>
              <SortableHeader label="Ordervärde" col="orderValue" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHeader label="Fakturerat" col="revenue" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHeader label="Ej fakturerat" col="unfactured" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHeader label="Kostnader" col="costs" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHeader label="Resultat" col="result" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHeader label="Marginal" col="margin" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHeader label="Betalt" col="paid" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHeader label="Obetalt" col="unpaid" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-right" />
              <th className="text-center px-3 py-3 text-white/40">Varningar</th>
              <th className="text-center px-3 py-3 text-white/40">Rapport</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const isExp = expanded.has(p.projectNumber);
              return (
                <React.Fragment key={p.projectNumber}>
                  <tr
                    className="border-b border-white/5 hover:bg-white/[0.04] cursor-pointer"
                    onClick={() => toggleRow(p.projectNumber)}
                  >
                    <td className="px-3 py-2.5 text-white/40">
                      {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-white/70">{p.projectNumber}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium truncate max-w-[180px]">{p.projectName}</span>
                        <StatusBadge status={p.projectStatus} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-blue-400">{fmtNum(p.orderValue || 0)}</td>
                    <td className="px-3 py-2.5 text-right text-green-400">{fmtNum(p.revenue)}</td>
                    <td className={`px-3 py-2.5 text-right ${(p.unfactured || 0) > 0 ? 'text-orange-400' : 'text-white/30'}`}>
                      {fmtNum(p.unfactured || 0)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-red-400/80">{fmtNum(p.costs)}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold ${p.result >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmtNum(p.result)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-medium ${marginColor(p.marginPct)}`}>
                      {fmtPct(p.marginPct)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-green-400/70">{fmtNum(p.paidAmount || 0)}</td>
                    <td className={`px-3 py-2.5 text-right ${(p.overdueAmount || 0) > 0 ? 'text-red-400' : (p.unpaidAmount || 0) > 0 ? 'text-yellow-400' : 'text-white/30'}`}>
                      {fmtNum(p.unpaidAmount || 0)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {p.warnings?.includes('Negativ marginal') && <span title="Negativ marginal">🔴</span>}
                      {p.warnings?.includes('Förfallen faktura') && <span title="Förfallen faktura">🟠</span>}
                      {p.warnings?.includes('Ej fakturerat') && <span title="Ej fakturerat >5000 kr">🟡</span>}
                      {p.warnings?.includes('Inga kostnader') && <span title="Inga kostnader">⚠️</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { window.location.href = '/ProjectReport?projectNumber=' + p.projectNumber; }}
                        className="text-xs border-white/20 text-white/60 bg-white/5 hover:bg-white/10 hover:text-white h-6 px-2"
                      >
                        Slutrapport
                      </Button>
                    </td>
                  </tr>
                  {isExp && <ExpandedRow project={p} onInvoiceClick={(inv, type, proj) => setInvoiceModal({ inv, type, proj })} />}
                </React.Fragment>
              );
            })}
          </tbody>
          {/* Footer totals */}
          <tfoot>
            <tr className="border-t-2 border-white/20 bg-white/5 font-semibold text-xs">
              <td colSpan={3} className="px-3 py-3 text-white/40 uppercase tracking-wider">Totalt ({filtered.length} projekt)</td>
              <td className="px-3 py-3 text-right text-blue-400">{fmtNum(totals.orderValue)}</td>
              <td className="px-3 py-3 text-right text-green-400">{fmtNum(totals.revenue)}</td>
              <td className={`px-3 py-3 text-right ${totals.unfactured > 0 ? 'text-orange-400' : 'text-white/30'}`}>{fmtNum(totals.unfactured)}</td>
              <td className="px-3 py-3 text-right text-red-400/80">{fmtNum(totals.costs)}</td>
              <td className={`px-3 py-3 text-right ${totals.result >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtNum(totals.result)}</td>
              <td className={`px-3 py-3 text-right ${marginColor(totals.revenue > 0 ? (totals.result / totals.revenue * 100) : null)}`}>
                {fmtPct(totals.revenue > 0 ? (totals.result / totals.revenue * 100) : null)}
              </td>
              <td className="px-3 py-3 text-right text-green-400/70">{fmtNum(totals.paid)}</td>
              <td className={`px-3 py-3 text-right ${totals.unpaid > 0 ? 'text-yellow-400' : 'text-white/30'}`}>{fmtNum(totals.unpaid)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {invoiceModal && (
        <InvoiceDetailModal
          invoice={invoiceModal.inv}
          type={invoiceModal.type}
          projectName={invoiceModal.proj.projectName}
          projectNumber={invoiceModal.proj.projectNumber}
          onClose={() => setInvoiceModal(null)}
        />
      )}
      {slutModal && <SlutrapportModal project={slutModal} onClose={() => setSlutModal(null)} />}
    </div>
  );
}

// ---- MAIN PAGE ----

export default function ProjectResults() {
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('ongoing');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['projectFinancials'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getProjectFinancials', {});
      setLastUpdated(new Date());
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const projects = data?.projects || [];

  const ongoingProjects = useMemo(() =>
    projects.filter(p => (p.projectStatus || '').toUpperCase() !== 'COMPLETED'),
    [projects]
  );
  const completedProjects = useMemo(() =>
    projects.filter(p => (p.projectStatus || '').toUpperCase() === 'COMPLETED'),
    [projects]
  );

  const tabProjects = activeTab === 'ongoing' ? ongoingProjects : completedProjects;

  const kpis = useMemo(() => ({
    orderValue: tabProjects.reduce((s, p) => s + (p.orderValue || 0), 0),
    revenue: tabProjects.reduce((s, p) => s + p.revenue, 0),
    unfactured: tabProjects.reduce((s, p) => s + (p.unfactured || 0), 0),
    costs: tabProjects.reduce((s, p) => s + p.costs, 0),
    result: tabProjects.reduce((s, p) => s + p.result, 0),
    unpaid: tabProjects.reduce((s, p) => s + (p.unpaidAmount || 0), 0),
  }), [tabProjects]);

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Projektresultat</h1>
            {lastUpdated && (
              <p className="text-xs text-white/30 mt-0.5">Senast uppdaterad: {lastUpdated.toLocaleTimeString('sv-SE')}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateProject(true)} className="bg-green-600 hover:bg-green-500 text-white gap-2">
              <Plus className="w-4 h-4" />Nytt projekt
            </Button>
            <Button onClick={() => refetch()} disabled={isFetching} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Hämta data
            </Button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'ongoing'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-white/50 hover:text-white hover:bg-white/15'
            }`}
          >
            Pågående projekt ({ongoingProjects.length})
          </button>
          <button
            onClick={() => setActiveTab('avslutade')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'avslutade'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-white/50 hover:text-white hover:bg-white/15'
            }`}
          >
            Avslutade projekt ({completedProjects.length})
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-48 gap-3">
            <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
            <p className="text-white/40 text-sm">Hämtar projektdata från Fortnox...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard title="Totalt ordervärde" value={fmt(kpis.orderValue)} color="blue" />
              <KpiCard title="Fakturerat" value={fmt(kpis.revenue)} color="green" />
              <KpiCard title="Ej fakturerat" value={fmt(kpis.unfactured)} color="orange" />
              <KpiCard title="Bokförda kostnader" value={fmt(kpis.costs)} color="red" />
              <KpiCard title="Resultat" value={fmt(kpis.result)} color={kpis.result >= 0 ? 'green' : 'red'} />
              <KpiCard title="Obetalt" value={fmt(kpis.unpaid)} color="yellow" />
            </div>

            {/* Main table */}
            <MainTable projects={tabProjects} />
          </>
        )}
      </div>

      {showCreateProject && <CreateProjectModal onClose={() => setShowCreateProject(false)} onSuccess={() => refetch()} />}
    </div>
  );
}