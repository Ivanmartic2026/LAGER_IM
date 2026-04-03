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
import { RefreshCw, AlertTriangle, CheckCircle2, Printer, TrendingUp, TrendingDown, Activity, Percent, Plus, Clock } from 'lucide-react';
import { toast } from 'sonner';
import ProjectTableRow from '@/components/ProjectTableRow';
import LoggaTidModal from '@/components/LoggaTidModal';
import ExpandedRow from '@/components/ExpandedRow';

const TODAY = new Date();
const fmt = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 }) + ' kr';
const fmtNum = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 });
const fmtPct = (n) => (n != null && isFinite(n) && !isNaN(n) ? n.toFixed(1) + ' %' : '–');
const tb = (rev, res) => rev > 0 ? (res / rev) * 100 : null;
const isOverdue = (dueDate) => dueDate && new Date(dueDate) < TODAY;

const STATUS_MAP = {
  ONGOING: { label: 'Pågående', cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  COMPLETED: { label: 'Avslutad', cls: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
  NOTSTARTED: { label: 'Ej startad', cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
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

function KpiCard({ title, value, icon: Icon, positive, negative }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-widest mb-1">{title}</p>
          <p className={`text-xl font-bold ${positive ? 'text-green-400' : negative ? 'text-red-400' : 'text-white'}`}>{value}</p>
        </div>
        {Icon && <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"><Icon className="w-4 h-4 text-white/40" /></div>}
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
  const revTotal = project.customerInvoices.reduce((s, i) => s + i.total, 0);
  const costTotal = project.supplierInvoices.reduce((s, i) => s + i.total, 0);

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
          {/* Section 1 */}
          <div>
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Projektinfo</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-white/40 text-xs mb-1">Projektnr</p><p className="text-white font-medium">{project.projectNumber}</p></div>
              <div><p className="text-white/40 text-xs mb-1">Kund</p><p className="text-white font-medium">{project.customerName || '–'}</p></div>
              <div><p className="text-white/40 text-xs mb-1">Status</p><StatusBadge status={project.projectStatus} /></div>
              <div><p className="text-white/40 text-xs mb-1">Period</p><p className="text-white">{project.startDate || '?'} → {project.endDate || '?'}</p></div>
            </div>
          </div>

          {/* Section 2 */}
          <div>
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Ekonomisk sammanfattning</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard title="Intäkter" value={fmt(project.revenue)} icon={TrendingUp} />
              <KpiCard title="Kostnader" value={fmt(project.costs)} icon={TrendingDown} />
              <KpiCard title="Resultat" value={fmt(project.result)} icon={Activity} positive={project.result >= 0} negative={project.result < 0} />
              <KpiCard title="TB%" value={fmtPct(tbPct)} icon={Percent} positive={tbPct >= 0} negative={tbPct < 0} />
            </div>
          </div>

          {/* Section 3 */}
          <div>
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Kundfakturor</h3>
            {project.customerInvoices.length ? (
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/10 text-white/40">
                    <th className="text-left px-3 py-2">Nr</th>
                    <th className="text-left px-3 py-2">Kund</th>
                    <th className="text-left px-3 py-2">Datum</th>
                    <th className="text-left px-3 py-2">Förfaller</th>
                    <th className="text-right px-3 py-2">Belopp</th>
                    <th className="text-right px-3 py-2">Återstår</th>
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
                    <tr className="border-t border-white/20 font-semibold text-white">
                      <td colSpan={4} className="px-3 py-2 text-white/50">Totalt</td>
                      <td className="px-3 py-2 text-right">{fmtNum(revTotal)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : <p className="text-white/30 text-sm italic">Inga kundfakturor</p>}
          </div>

          {/* Section 4 */}
          <div>
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Leverantörsfakturor</h3>
            {project.supplierInvoices.length ? (
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/10 text-white/40">
                    <th className="text-left px-3 py-2">Nr</th>
                    <th className="text-left px-3 py-2">Leverantör</th>
                    <th className="text-left px-3 py-2">Datum</th>
                    <th className="text-left px-3 py-2">Förfaller</th>
                    <th className="text-right px-3 py-2">Belopp</th>
                    <th className="text-right px-3 py-2">Återstår</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {project.supplierInvoices.map((inv, i) => (
                      <tr key={i} className="border-b border-white/5 text-white/80">
                        <td className="px-3 py-2 font-mono">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2">{inv.supplierName}</td>
                        <td className="px-3 py-2">{inv.invoiceDate}</td>
                        <td className="px-3 py-2">{inv.dueDate}</td>
                        <td className="px-3 py-2 text-right">{fmtNum(inv.total)}</td>
                        <td className="px-3 py-2 text-right">{fmtNum(inv.balance)}</td>
                        <td className="px-3 py-2"><InvoiceStatusBadge inv={inv} /></td>
                      </tr>
                    ))}
                    <tr className="border-t border-white/20 font-semibold text-white">
                      <td colSpan={4} className="px-3 py-2 text-white/50">Totalt</td>
                      <td className="px-3 py-2 text-right">{fmtNum(costTotal)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : <p className="text-white/30 text-sm italic">Inga leverantörsfakturor</p>}
          </div>

          {/* Section 5 */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 italic">
            Projektet <span className="font-semibold text-white not-italic">{project.projectName}</span> visar ett{' '}
            <span className={project.result >= 0 ? 'text-green-400 not-italic' : 'text-red-400 not-italic'}>{project.result >= 0 ? 'positivt' : 'negativt'}</span>{' '}
            resultat på <span className="font-semibold text-white not-italic">{fmt(project.result)}</span> med ett täckningsbidrag på{' '}
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
    if (!form.description.trim()) {
      toast.error('Projektnamn krävs');
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('createFortnoxProject', {
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

          // ---- TABS ----

function TabOverview({ projects }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hideEmpty, setHideEmpty] = useState(true);
  const [sortBy, setSortBy] = useState('result');
  const [expanded, setExpanded] = useState(new Set());
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [slutModal, setSlutModal] = useState(null);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (hideEmpty) list = list.filter(p => p.revenue !== 0 || p.costs !== 0);
    if (statusFilter !== 'all') list = list.filter(p => (p.projectStatus || '').toUpperCase() === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.projectNumber?.toLowerCase().includes(q) || p.projectName?.toLowerCase().includes(q) || p.customerName?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === 'result') return b.result - a.result;
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'costs') return b.costs - a.costs;
      return (a.projectNumber || '').localeCompare(b.projectNumber || '');
    });
    return list;
  }, [projects, search, statusFilter, hideEmpty, sortBy]);

  const totalRevenue = filtered.reduce((s, p) => s + p.revenue, 0);
  const totalCosts = filtered.reduce((s, p) => s + p.costs, 0);
  const totalResult = totalRevenue - totalCosts;
  const totalTb = tb(totalRevenue, totalResult);

  const toggleRow = (id) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Split by active/completed
  const activeProjects = filtered.filter(p => p.projectStatus?.toUpperCase() !== 'COMPLETED');
  const completedProjects = filtered.filter(p => p.projectStatus?.toUpperCase() === 'COMPLETED');

  const renderProjectTable = (projects, title, icon) => {
    const tableRevenue = projects.reduce((s, p) => s + p.revenue, 0);
    const tableCosts = projects.reduce((s, p) => s + p.costs, 0);
    const tableResult = tableRevenue - tableCosts;
    const tableTb = tb(tableRevenue, tableResult);

    if (projects.length === 0) {
      return <p className="text-white/30 text-sm italic py-4">Inga projekt</p>;
    }

    return (
      <Card className="bg-white/5 border-white/10 overflow-hidden">
        <CardHeader className="pb-2"><CardTitle className="text-white text-sm">{title}</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                <th className="px-3 py-3 w-8" />
                <th className="text-left px-3 py-3">Nr</th>
                <th className="text-left px-3 py-3">Projektnamn</th>
                <th className="text-left px-3 py-3">Kund</th>
                <th className="text-right px-3 py-3">Intäkter</th>
                <th className="text-right px-3 py-3">Kostnader</th>
                <th className="text-right px-3 py-3">Resultat</th>
                <th className="text-right px-3 py-3">TB%</th>
                <th className="text-center px-3 py-3">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const isExp = expanded.has(p.projectNumber);
                const tbPct = tb(p.revenue, p.result);
                return (
                  <React.Fragment key={p.projectNumber}>
                    <ProjectTableRow 
                      p={p}
                      isExp={isExp}
                      tbPct={tbPct}
                      toggleRow={toggleRow}
                      setSlutModal={setSlutModal}
                      onInvoiceClick={(inv, type, proj) => setInvoiceModal({ inv, type, proj })}
                    />
                    {isExp && <ExpandedRow project={p} onInvoiceClick={(inv, type, proj) => setInvoiceModal({ inv, type, proj })} />}
                  </React.Fragment>
                );
              })}
              <tr className="border-t-2 border-white/20 bg-white/5 font-semibold text-sm">
                <td colSpan={4} className="px-3 py-3 text-white/40 text-xs uppercase tracking-wider">Totalt ({projects.length})</td>
                <td className="px-3 py-3 text-right text-white">{fmtNum(tableRevenue)}</td>
                <td className="px-3 py-3 text-right text-white">{fmtNum(tableCosts)}</td>
                <td className={`px-3 py-3 text-right ${tableResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtNum(tableResult)}</td>
                <td className={`px-3 py-3 text-right text-xs ${tableTb >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPct(tableTb)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Sök projekt..." value={search} onChange={e => setSearch(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 w-44" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-white">
            <SelectItem value="all">Alla</SelectItem>
            <SelectItem value="ONGOING">Pågående</SelectItem>
            <SelectItem value="COMPLETED">Avslutade</SelectItem>
            <SelectItem value="NOTSTARTED">Ej startade</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-white">
            <SelectItem value="result">Resultat ↓</SelectItem>
            <SelectItem value="revenue">Intäkter ↓</SelectItem>
            <SelectItem value="costs">Kostnader ↓</SelectItem>
            <SelectItem value="number">Projektnummer</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setHideEmpty(v => !v)}
          className={`border-white/20 text-sm ${hideEmpty ? 'bg-blue-600/30 text-blue-300 border-blue-500/40' : 'bg-white/5 text-white/50 hover:text-white'}`}>
          Dölj tomma
        </Button>
        <span className="text-xs text-white/30 ml-auto">Visar {filtered.length} av {projects.length}</span>
      </div>

      {/* Active Projects */}
      <div>
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Aktiva projekt ({activeProjects.length})</h3>
        {renderProjectTable(activeProjects, 'Pågående och ej startade')}
      </div>

      {/* Completed Projects */}
      <div>
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Avslutade projekt ({completedProjects.length})</h3>
        {renderProjectTable(completedProjects, 'Avslutade')}
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

function TabWarnings({ projects }) {
  const warnings = useMemo(() => {
    const list = [];
    projects.forEach(p => {
      if (p.result < 0 && (p.revenue > 0 || p.costs > 0))
        list.push({ project: p, severity: 'critical', message: 'Negativt resultat' });
      if (p.revenue > 0 && tb(p.revenue, p.result) < 20)
        list.push({ project: p, severity: 'warning', message: `Lågt TB% (${fmtPct(tb(p.revenue, p.result))})` });
      if (p.costs > 0 && p.revenue === 0)
        list.push({ project: p, severity: 'critical', message: 'Kostnader utan intäkter' });
      const overdueCustomer = p.customerInvoices?.some(inv => !inv.isPaid && isOverdue(inv.dueDate));
      const overdueSupplier = p.supplierInvoices?.some(inv => !inv.isPaid && isOverdue(inv.dueDate));
      if (overdueCustomer) list.push({ project: p, severity: 'info', message: 'Förfallna kundfakturor' });
      if (overdueSupplier) list.push({ project: p, severity: 'info', message: 'Förfallna leverantörsfakturor' });
    });
    return list;
  }, [projects]);

  if (!warnings.length) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <CheckCircle2 className="w-12 h-12 text-green-400" />
      <p className="text-white/60 text-sm">Inga varningar — allt ser bra ut!</p>
    </div>
  );

  const colorMap = { critical: 'border-red-500/30 bg-red-500/10', warning: 'border-orange-500/30 bg-orange-500/10', info: 'border-yellow-500/30 bg-yellow-500/10' };
  const textMap = { critical: 'text-red-400', warning: 'text-orange-400', info: 'text-yellow-400' };
  const labelMap = { critical: 'Kritisk', warning: 'Varning', info: 'Info' };

  return (
    <div className="space-y-3">
      {warnings.map((w, i) => (
        <div key={i} className={`p-4 rounded-xl border ${colorMap[w.severity]} flex items-start gap-3`}>
          <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${textMap[w.severity]}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold uppercase ${textMap[w.severity]}`}>{labelMap[w.severity]}</span>
              <span className="text-white font-medium text-sm">{w.message}</span>
            </div>
            <p className="text-white/50 text-xs mt-0.5">{w.project.projectName} ({w.project.projectNumber})</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TabTidstrend({ projects }) {
  const { monthData, bestMonth, last3Total } = useMemo(() => {
    const map = {};
    projects.forEach(p => {
      p.customerInvoices?.forEach(inv => {
        if (!inv.invoiceDate) return;
        const m = inv.invoiceDate.slice(0, 7);
        if (!map[m]) map[m] = { month: m, Intäkter: 0, Kostnader: 0 };
        map[m].Intäkter += inv.total;
      });
      p.supplierInvoices?.forEach(inv => {
        if (!inv.invoiceDate) return;
        const m = inv.invoiceDate.slice(0, 7);
        if (!map[m]) map[m] = { month: m, Intäkter: 0, Kostnader: 0 };
        map[m].Kostnader += inv.total;
      });
    });
    const sorted = Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
    const best = sorted.reduce((b, c) => (!b || c.Intäkter > b.Intäkter ? c : b), null);
    const last3 = sorted.slice(-3).reduce((s, m) => s + m.Intäkter - m.Kostnader, 0);
    return { monthData: sorted, bestMonth: best, last3Total: last3 };
  }, [projects]);

  if (!monthData.length) return <p className="text-white/30 text-sm italic py-10 text-center">Ingen data med datum tillgänglig</p>;

  return (
    <div className="space-y-4">
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthData} margin={{ left: 10, right: 20, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => fmtNum(v)} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v, n) => [fmtNum(v) + ' kr', n]} />
              <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
              <Line type="monotone" dataKey="Intäkter" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Kostnader" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Bästa månad</p>
            <p className="text-white font-bold text-lg">{bestMonth?.month || '–'}</p>
            <p className="text-blue-400 text-sm">{fmt(bestMonth?.Intäkter || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Senaste 3 månader (resultat)</p>
            <p className={`font-bold text-lg ${last3Total >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(last3Total)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TabKundlonsamhet({ projects }) {
  const customers = useMemo(() => {
    const map = {};
    projects.forEach(p => {
      const key = p.customerName || 'Okänd';
      if (!map[key]) map[key] = { name: key, revenue: 0, costs: 0, count: 0 };
      map[key].revenue += p.revenue;
      map[key].costs += p.costs;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [projects]);

  const top10 = customers.map(c => ({ name: c.name?.slice(0, 18), Intäkter: c.revenue, Kostnader: c.costs }));
  const totals = customers.reduce((s, c) => ({ revenue: s.revenue + c.revenue, costs: s.costs + c.costs }), { revenue: 0, costs: 0 });

  return (
    <div className="space-y-4">
      {top10.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-1"><CardTitle className="text-white text-sm">Top 10 kunder efter intäkter</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10} layout="vertical" margin={{ left: 130, right: 20 }}>
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => fmtNum(v)} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} width={130} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v, n) => [fmtNum(v) + ' kr', n]} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                <Bar dataKey="Intäkter" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Kostnader" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      <Card className="bg-white/5 border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Kund</th>
              <th className="text-right px-4 py-3">Projekt</th>
              <th className="text-right px-4 py-3">Intäkter</th>
              <th className="text-right px-4 py-3">Kostnader</th>
              <th className="text-right px-4 py-3">Resultat</th>
              <th className="text-right px-4 py-3">TB%</th>
            </tr></thead>
            <tbody>
              {customers.map((c, i) => {
                const res = c.revenue - c.costs;
                const tbPct = tb(c.revenue, res);
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.04]">
                    <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-right text-white/60">{c.count}</td>
                    <td className="px-4 py-3 text-right text-white/80">{fmtNum(c.revenue)}</td>
                    <td className="px-4 py-3 text-right text-white/80">{fmtNum(c.costs)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${res >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtNum(res)}</td>
                    <td className={`px-4 py-3 text-right text-xs ${tbPct == null ? 'text-white/30' : tbPct >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>{fmtPct(tbPct)}</td>
                  </tr>
                );
              })}
              {customers.length > 0 && (() => {
                const res = totals.revenue - totals.costs;
                const tbPct = tb(totals.revenue, res);
                return (
                  <tr className="border-t-2 border-white/20 bg-white/5 font-semibold">
                    <td colSpan={2} className="px-4 py-3 text-white/40 text-xs uppercase">Totalt</td>
                    <td className="px-4 py-3 text-right text-white">{fmtNum(totals.revenue)}</td>
                    <td className="px-4 py-3 text-right text-white">{fmtNum(totals.costs)}</td>
                    <td className={`px-4 py-3 text-right ${res >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtNum(res)}</td>
                    <td className={`px-4 py-3 text-right text-xs ${tbPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPct(tbPct)}</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TabLeverantorsanalys({ projects }) {
  const { suppliers, totalCost } = useMemo(() => {
    const map = {};
    projects.forEach(p => {
      p.supplierInvoices?.forEach(inv => {
        const key = inv.supplierName || 'Okänd';
        if (!map[key]) map[key] = { name: key, total: 0, count: 0 };
        map[key].total += inv.total;
        map[key].count += 1;
      });
    });
    const sorted = Object.values(map).sort((a, b) => b.total - a.total);
    const total = sorted.reduce((s, s2) => s + s2.total, 0);
    return { suppliers: sorted, totalCost: total };
  }, [projects]);

  const top10 = suppliers.map(s => ({ name: s.name?.slice(0, 18), Kostnad: s.total }));

  return (
    <div className="space-y-4">
      {top10.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-1"><CardTitle className="text-white text-sm">Top 10 leverantörer efter kostnad</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10} layout="vertical" margin={{ left: 130, right: 20 }}>
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => fmtNum(v)} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} width={130} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v, n) => [fmtNum(v) + ' kr', n]} />
                <Bar dataKey="Kostnad" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      <Card className="bg-white/5 border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Leverantör</th>
              <th className="text-right px-4 py-3">Fakturor</th>
              <th className="text-right px-4 py-3">Total kostnad</th>
              <th className="text-right px-4 py-3">% av totalt</th>
            </tr></thead>
            <tbody>
              {suppliers.map((s, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.04]">
                  <td className="px-4 py-3 text-white font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-right text-white/60">{s.count}</td>
                  <td className="px-4 py-3 text-right text-orange-400">{fmtNum(s.total)}</td>
                  <td className="px-4 py-3 text-right text-white/50 text-xs">{totalCost > 0 ? ((s.total / totalCost) * 100).toFixed(1) + ' %' : '–'}</td>
                </tr>
              ))}
              {!suppliers.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-white/30">Inga leverantörsfakturor</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TabGantt({ projects }) {
  const datedProjects = projects.filter(p => p.startDate && p.endDate);

  if (!datedProjects.length) return (
    <div className="py-20 text-center text-white/30 text-sm">Inga projektdatum tillgängliga i Fortnox</div>
  );

  const statusColors = { ONGOING: '#3b82f6', COMPLETED: '#64748b', NOTSTARTED: '#22c55e' };

  const data = datedProjects.map(p => {
    const start = new Date(p.startDate).getTime();
    const end = new Date(p.endDate).getTime();
    return {
      name: (p.projectName || p.projectNumber)?.slice(0, 22),
      start,
      duration: Math.max(end - start, 86400000),
      color: statusColors[(p.projectStatus || '').toUpperCase()] || '#64748b'
    };
  }).sort((a, b) => a.start - b.start);

  const minStart = Math.min(...data.map(d => d.start));

  const normalizedData = data.map(d => ({
    ...d,
    offset: d.start - minStart,
  }));

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-1"><CardTitle className="text-white text-sm">Projekttidslinje (Gantt)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, datedProjects.length * 40)}>
          <BarChart data={normalizedData} layout="vertical" margin={{ left: 140, right: 20 }}>
            <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={v => { const d = new Date(minStart + v); return d.toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' }); }} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} width={140} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
              formatter={(v) => [Math.round(v / 86400000) + ' dagar']}
              labelFormatter={(label) => label} />
            <Bar dataKey="offset" fill="transparent" stackId="a" />
            <Bar dataKey="duration" stackId="a" radius={[4, 4, 4, 4]}>
              {normalizedData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500" />Pågående</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-500" />Avslutad</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500" />Ej startad</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- MAIN PAGE ----

export default function ProjectResults() {
  const [showCreateProject, setShowCreateProject] = useState(false);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['projectFinancials'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getProjectFinancials', {});
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const projects = data?.projects || [];

  const { totalRevenue, totalCosts, totalResult, totalTb } = useMemo(() => {
    const revenue = projects.reduce((s, p) => s + p.revenue, 0);
    const costs = projects.reduce((s, p) => s + p.costs, 0);
    const result = revenue - costs;
    return { totalRevenue: revenue, totalCosts: costs, totalResult: result, totalTb: tb(revenue, result) };
  }, [projects]);

  const warningCount = useMemo(() => {
    let count = 0;
    projects.forEach(p => {
      if (p.result < 0 && (p.revenue > 0 || p.costs > 0)) count++;
      if (p.revenue > 0 && tb(p.revenue, p.result) < 20) count++;
      if (p.costs > 0 && p.revenue === 0) count++;
      if (p.customerInvoices?.some(inv => !inv.isPaid && isOverdue(inv.dueDate))) count++;
      if (p.supplierInvoices?.some(inv => !inv.isPaid && isOverdue(inv.dueDate))) count++;
    });
    return count;
  }, [projects]);

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Projektresultat</h1>
            <p className="text-sm text-white/40 mt-0.5">Ekonomisk översikt per projekt från Fortnox</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateProject(true)} className="bg-green-600 hover:bg-green-500 text-white gap-2">
              <Plus className="w-4 h-4" />
              Nytt projekt
            </Button>
            <Button onClick={() => refetch()} disabled={isFetching} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Hämta data
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-48">
            <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard title="Total intäkter" value={fmt(totalRevenue)} icon={TrendingUp} />
              <KpiCard title="Total kostnader" value={fmt(totalCosts)} icon={TrendingDown} />
              <KpiCard title="Total resultat" value={fmt(totalResult)} icon={Activity} positive={totalResult > 0} negative={totalResult < 0} />
              <KpiCard title="Täckningsbidrag %" value={fmtPct(totalTb)} icon={Percent} positive={totalTb > 0} negative={totalTb < 0} />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview">
              <TabsList className="bg-white/5 border border-white/10 h-auto flex-wrap gap-1 p-1">
                <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/50 text-sm">Översikt</TabsTrigger>
                <TabsTrigger value="warnings" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/50 text-sm flex items-center gap-1.5">
                  Varningar
                  {warningCount > 0 && <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">{warningCount}</span>}
                </TabsTrigger>
                <TabsTrigger value="trend" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/50 text-sm">Tidstrend</TabsTrigger>
                <TabsTrigger value="customers" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/50 text-sm">Kundlönsamhet</TabsTrigger>
                <TabsTrigger value="suppliers" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/50 text-sm">Leverantörsanalys</TabsTrigger>
                <TabsTrigger value="gantt" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/50 text-sm">Gantt</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4"><TabOverview projects={projects} /></TabsContent>
              <TabsContent value="warnings" className="mt-4"><TabWarnings projects={projects} /></TabsContent>
              <TabsContent value="trend" className="mt-4"><TabTidstrend projects={projects} /></TabsContent>
              <TabsContent value="customers" className="mt-4"><TabKundlonsamhet projects={projects} /></TabsContent>
              <TabsContent value="suppliers" className="mt-4"><TabLeverantorsanalys projects={projects} /></TabsContent>
              <TabsContent value="gantt" className="mt-4"><TabGantt projects={projects} /></TabsContent>
            </Tabs>
          </>
        )}
        </div>
        {showCreateProject && <CreateProjectModal onClose={() => setShowCreateProject(false)} onSuccess={() => refetch()} />}
        </div>
        );
        }