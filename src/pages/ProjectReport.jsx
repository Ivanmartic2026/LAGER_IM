import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const fmt = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 }) + ' kr';
const fmtNum = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 });
const fmtPct = (n) => (n != null && isFinite(n) && !isNaN(n) ? n.toFixed(1) + '%' : '–');
const today = new Date().toISOString().split('T')[0];

const STATUS_MAP = {
  ONGOING: { label: 'Pågående', cls: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  COMPLETED: { label: 'Avslutad', cls: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
  NOTSTARTED: { label: 'Ej startad', cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[(status || '').toUpperCase()] || { label: status || '–', cls: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function InvoiceStatusBadge({ balance, dueDate }) {
  if (balance === 0) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">Betald</span>;
  if (balance > 0 && dueDate && dueDate < today) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">Förfallen</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Obetald</span>;
}

function KpiCard({ icon, label, value, color }) {
  const colorMap = {
    blue: 'border-blue-500/30 bg-blue-500/10',
    green: 'border-green-500/30 bg-green-500/10',
    orange: 'border-orange-500/30 bg-orange-500/10',
    red: 'border-red-500/30 bg-red-500/10',
    yellow: 'border-yellow-500/30 bg-yellow-500/10',
  };
  const textMap = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
  };
  return (
    <div className={`rounded-xl border ${colorMap[color] || 'border-white/10 bg-white/5'} p-4 print:border-gray-300 print:bg-white`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-xl font-bold ${textMap[color] || 'text-white'} print:text-black`}>{value}</div>
      <div className="text-xs text-white/40 mt-1 uppercase tracking-wide print:text-gray-500">{label}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3 print:text-gray-500">{title}</h2>
      {children}
    </div>
  );
}

function Table({ headers, rows, footer, emptyMsg }) {
  if (!rows || rows.length === 0) {
    return <p className="text-white/30 italic text-sm py-4 print:text-gray-400">{emptyMsg}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 print:border-gray-300">
      <table className="w-full text-xs print:text-black">
        <thead>
          <tr className="border-b border-white/10 print:border-gray-300">
            {headers.map((h, i) => (
              <th key={i} className={`px-3 py-2.5 text-white/40 font-medium uppercase tracking-wide text-xs print:text-gray-500 ${h.right ? 'text-right' : 'text-left'}`}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={`border-b border-white/5 print:border-gray-200 ${ri % 2 === 0 ? 'bg-white/[0.02] print:bg-white' : 'bg-gray-800/30 print:bg-gray-50'}`}>
              {row.map((cell, ci) => (
                <td key={ci} className={`px-3 py-2 text-white/80 print:text-black ${headers[ci]?.right ? 'text-right' : 'text-left'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="border-t-2 border-white/20 bg-white/5 font-semibold print:border-gray-400 print:bg-gray-100">
              {footer.map((cell, i) => (
                <td key={i} className={`px-3 py-2.5 text-white print:text-black ${headers[i]?.right ? 'text-right' : 'text-left'}`}>{cell}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export default function ProjectReport() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectNumber = urlParams.get('projectNumber') || '';

  const [project, setProject] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [drivingEntries, setDrivingEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated] = useState(new Date());

  useEffect(() => {
    if (!projectNumber) { setError('Inget projektnummer angivet'); setLoading(false); return; }

    const load = async () => {
      try {
        const [financialsRes, times, drivings] = await Promise.all([
          base44.functions.invoke('getProjectFinancials', {}),
          base44.entities.ProjectTime.filter({ projectNumber }),
          base44.entities.DrivingJournalEntry.filter({ projectNumber }).catch(() => [])
        ]);

        const projects = financialsRes?.data?.projects || [];
        const found = projects.find(p => p.projectNumber === projectNumber);
        if (!found) throw new Error(`Projekt ${projectNumber} hittades inte`);

        setProject(found);
        setTimeEntries(times || []);
        setDrivingEntries(drivings || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectNumber]);

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/50 text-sm">Hämtar projektdata...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-400 text-4xl mb-4">⚠️</div>
        <p className="text-white text-lg font-medium mb-2">Kunde inte hämta projekt</p>
        <p className="text-white/40 text-sm">{error}</p>
        <button onClick={() => window.history.back()} className="mt-4 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 text-sm">← Tillbaka</button>
      </div>
    </div>
  );

  if (!project) return null;

  const totalHours = timeEntries.reduce((s, t) => s + (t.hours || 0), 0);
  const totalTimeCost = timeEntries.reduce((s, t) => s + ((t.hours || 0) * (t.hourlyRate || 0)), 0);
  const totalKm = drivingEntries.reduce((s, d) => s + (d.distanceKm || 0), 0);

  const unpaidBalance = (project.customerInvoices || []).reduce((s, inv) => s + (inv.balance || 0), 0);

  // Customer invoice table
  const custHeaders = [
    { label: 'Faktura nr' }, { label: 'Kund' }, { label: 'Fakturadatum' },
    { label: 'Förfallodatum' }, { label: 'Belopp', right: true },
    { label: 'Återstår', right: true }, { label: 'Status' }
  ];
  const custRows = (project.customerInvoices || []).map(inv => [
    <span className="font-mono text-blue-400">{inv.invoiceNumber}</span>,
    inv.customerName || '–',
    inv.invoiceDate || '–',
    inv.dueDate || '–',
    <span className="font-semibold">{fmtNum(inv.total)}</span>,
    <span className={inv.balance > 0 ? 'text-orange-400' : 'text-white/30'}>{fmtNum(inv.balance)}</span>,
    <InvoiceStatusBadge balance={inv.balance} dueDate={inv.dueDate} />
  ]);
  const custTotals = (project.customerInvoices || []).reduce((acc, inv) => ({ total: acc.total + inv.total, balance: acc.balance + inv.balance }), { total: 0, balance: 0 });
  const custFooter = ['', '', '', <span className="text-white/40 uppercase text-xs">Totalt</span>, fmtNum(custTotals.total), fmtNum(custTotals.balance), ''];

  // Supplier invoice table
  const supHeaders = [
    { label: 'Faktura nr' }, { label: 'Leverantör' }, { label: 'Fakturadatum' },
    { label: 'Förfallodatum' }, { label: 'Belopp', right: true }, { label: 'Status' }
  ];
  const supRows = (project.supplierInvoices || []).map(inv => [
    <span className="font-mono text-purple-400">{inv.invoiceNumber}</span>,
    inv.supplierName || '–',
    inv.invoiceDate || '–',
    inv.dueDate || '–',
    <span className="font-semibold">{fmtNum(inv.total)}</span>,
    <InvoiceStatusBadge balance={inv.balance} dueDate={inv.dueDate} />
  ]);

  // Time log table
  const timeHeaders = [
    { label: 'Datum' }, { label: 'Medarbetare' }, { label: 'Timmar', right: true },
    { label: 'Beskrivning' }, { label: 'Timpris', right: true }, { label: 'Kostnad', right: true }
  ];
  const timeRows = timeEntries.map(t => [
    <span className="font-mono">{t.date}</span>,
    t.reporter || '–',
    <span className="font-semibold text-blue-400">{t.hours}</span>,
    t.description || '–',
    t.hourlyRate ? fmtNum(t.hourlyRate) + ' kr/h' : '–',
    t.hourlyRate ? fmtNum((t.hours || 0) * t.hourlyRate) : '–'
  ]);
  const timeFooter = ['', '', <span className="text-blue-400">{totalHours} h</span>, '', '', totalTimeCost > 0 ? fmtNum(totalTimeCost) : '–'];

  // Driving table
  const driveHeaders = [
    { label: 'Datum' }, { label: 'Förare' }, { label: 'Från' },
    { label: 'Till' }, { label: 'Km', right: true }, { label: 'Syfte' }
  ];
  const driveRows = drivingEntries.map(d => [
    <span className="font-mono">{d.date}</span>,
    d.driverName || '–',
    d.fromLocation || '–',
    d.toLocation || '–',
    <span className="font-semibold text-orange-400">{d.distanceKm || '–'}</span>,
    d.purpose || d.description || '–'
  ]);
  const driveFooter = ['', '', '', '', <span className="text-orange-400">{fmtNum(totalKm)} km</span>, ''];

  const marginPct = project.revenue > 0 ? ((project.result / project.revenue) * 100) : null;

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-white { background: white !important; color: black !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-900 text-white print:bg-white print:text-black">
        <div className="max-w-[1200px] mx-auto px-6 py-8">

          {/* SECTION 1 — HEADER */}
          <div className="mb-8 pb-6 border-b border-white/10 print:border-gray-300">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-bold text-blue-400 print:text-blue-700">#{project.projectNumber}</span>
                  <span className="text-2xl font-semibold text-white print:text-black">{project.projectName}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 print:border-gray-300 print:bg-gray-50">
                    <span className="text-white/40 text-xs print:text-gray-500">Kund</span>
                    <span className="text-white text-xs font-medium print:text-black">{project.customerName || '–'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 print:border-gray-300 print:bg-gray-50">
                    <StatusBadge status={project.projectStatus} />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 print:border-gray-300 print:bg-gray-50">
                    <span className="text-white/40 text-xs print:text-gray-500">Period</span>
                    <span className="text-white text-xs font-medium print:text-black">{project.startDate || '?'} → {project.endDate || '?'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 print:border-gray-300 print:bg-gray-50">
                    <span className="text-white/40 text-xs print:text-gray-500">Uppdaterad</span>
                    <span className="text-white text-xs font-medium print:text-black">{lastUpdated.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 no-print">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/10 hover:border-white/20 transition-all"
                >
                  🖨️ Skriv ut
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/10 hover:border-white/20 transition-all"
                >
                  ← Tillbaka
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2 — KPI CARDS */}
          <div className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard icon="📋" label="Ordervärde" value={fmt(project.orderValue)} color="blue" />
              <KpiCard icon="🧾" label="Fakturerat" value={fmt(project.revenue)} color="green" />
              <KpiCard icon="⏳" label="Ej fakturerat" value={fmt(project.unfactured)} color="orange" />
              <KpiCard icon="📦" label="Kostnader" value={fmt(project.costs)} color="red" />
              <KpiCard icon="💰" label="Resultat" value={fmt(project.result)} color={project.result >= 0 ? 'green' : 'red'} />
              <KpiCard icon="⚠️" label="Obetalt" value={fmt(unpaidBalance)} color={unpaidBalance > 0 ? 'red' : 'green'} />
            </div>
          </div>

          {/* SECTION 3 — KUNDFAKTUROR */}
          <Section title="Kundfakturor">
            <Table
              headers={custHeaders}
              rows={custRows}
              footer={(project.customerInvoices || []).length > 0 ? custFooter : null}
              emptyMsg="Inga kundfakturor kopplade till detta projekt"
            />
          </Section>

          {/* SECTION 4 — LEVERANTÖRSFAKTUROR */}
          <Section title="Leverantörsfakturor">
            <Table
              headers={supHeaders}
              rows={supRows}
              emptyMsg="Inga leverantörsfakturor kopplade till detta projekt"
            />
          </Section>

          {/* SECTION 5 — TIDSLOGG */}
          <Section title="Tidslogg">
            <Table
              headers={timeHeaders}
              rows={timeRows}
              footer={timeEntries.length > 0 ? timeFooter : null}
              emptyMsg="Ingen tidslogg registrerad"
            />
          </Section>

          {/* SECTION 6 — KÖRJOURNAL */}
          <Section title="Körjournal">
            <Table
              headers={driveHeaders}
              rows={driveRows}
              footer={drivingEntries.length > 0 ? driveFooter : null}
              emptyMsg="Ingen körjournal registrerad"
            />
          </Section>

          {/* SECTION 7 — SAMMANFATTNING */}
          <Section title="Sammanfattning">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 print:border-gray-300 print:bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1 print:text-gray-500">Total intäkt</p>
                  <p className="text-2xl font-bold text-green-400 print:text-green-700">{fmt(project.revenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1 print:text-gray-500">Total kostnad</p>
                  <p className="text-2xl font-bold text-red-400 print:text-red-700">{fmt(project.costs)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1 print:text-gray-500">Resultat</p>
                  <p className={`text-2xl font-bold ${project.result >= 0 ? 'text-green-400 print:text-green-700' : 'text-red-400 print:text-red-700'}`}>{fmt(project.result)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1 print:text-gray-500">Marginal</p>
                  <p className={`text-2xl font-bold ${marginPct !== null && marginPct >= 0 ? 'text-blue-400 print:text-blue-700' : 'text-red-400 print:text-red-700'}`}>{fmtPct(marginPct)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1 print:text-gray-500">Total arbetstid</p>
                  <p className="text-2xl font-bold text-white print:text-black">{totalHours} h</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1 print:text-gray-500">Total körsträcka</p>
                  <p className="text-2xl font-bold text-white print:text-black">{fmtNum(totalKm)} km</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10 print:border-gray-200 text-sm text-white/60 italic print:text-gray-500">
                Projektet <span className="font-semibold text-white not-italic print:text-black">{project.projectName}</span> visar ett{' '}
                <span className={`not-italic font-semibold ${project.result >= 0 ? 'text-green-400' : 'text-red-400'}`}>{project.result >= 0 ? 'positivt' : 'negativt'}</span>{' '}
                resultat på <span className="font-semibold text-white not-italic print:text-black">{fmt(project.result)}</span> med en marginal på{' '}
                <span className="font-semibold text-white not-italic print:text-black">{fmtPct(marginPct)}</span>.
              </div>
            </div>
          </Section>

        </div>
      </div>
    </>
  );
}