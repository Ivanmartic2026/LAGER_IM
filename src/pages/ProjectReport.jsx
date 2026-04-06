import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const fmt = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 }) + ' kr';
const fmtNum = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 });
const fmtPct = (n) => (n != null && isFinite(n) && !isNaN(n) ? n.toFixed(1) + '%' : '–');
const today = new Date().toISOString().split('T')[0];

function StatusBadge({ status }) {
  const s = (status || '').toUpperCase();
  if (s === 'ONGOING') return (
    <span style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">Pågående</span>
  );
  if (s === 'COMPLETED') return (
    <span style={{ background: 'rgba(139,144,167,0.12)', color: '#8b90a7', border: '1px solid rgba(139,144,167,0.25)' }}
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">Avslutad</span>
  );
  return (
    <span style={{ background: 'rgba(79,142,247,0.12)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.25)' }}
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">{status || 'Okänd'}</span>
  );
}

function InvStatusBadge({ balance, dueDate }) {
  if (balance === 0) return (
    <span style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">Betald</span>
  );
  if (balance > 0 && dueDate && dueDate < today) return (
    <span style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">Förfallen</span>
  );
  return (
    <span style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">Obetald</span>
  );
}

function KpiCard({ label, value, valueColor }) {
  return (
    <div style={{ background: '#1e2132', border: '1px solid #2a2d3e' }} className="rounded-xl p-6 print:bg-white print:border-gray-200">
      <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">{label}</div>
      <div style={{ color: valueColor || '#f0f2f8' }} className="text-3xl font-bold tabular-nums print:text-black">{value}</div>
    </div>
  );
}

function SectionHeading({ title }) {
  return (
    <div style={{ color: '#8b90a7', borderBottomColor: '#2a2d3e' }}
      className="text-xs font-semibold uppercase tracking-widest border-b pb-2 mb-4 mt-8 print:text-gray-500 print:border-gray-200">
      {title}
    </div>
  );
}

function DataTable({ headers, rows, footer, emptyMsg }) {
  if (!rows || rows.length === 0) {
    return <p style={{ color: '#8b90a7' }} className="text-sm italic py-6 print:text-gray-400">{emptyMsg}</p>;
  }
  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }} className="rounded-xl overflow-hidden print:border-gray-200 print:bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#0f1117' }} className="print:bg-gray-50">
            {headers.map((h, i) => (
              <th key={i} style={{ color: '#8b90a7', borderBottomColor: '#2a2d3e' }}
                className={`px-4 py-3 text-xs uppercase tracking-wide font-medium border-b print:text-gray-500 print:border-gray-200 ${h.right ? 'text-right' : 'text-left'}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottomColor: '#2a2d3e', background: ri % 2 === 0 ? 'transparent' : 'rgba(30,33,50,0.5)' }}
              className="border-b last:border-0 print:border-gray-100 transition-opacity hover:opacity-80">
              {row.map((cell, ci) => (
                <td key={ci} style={{ color: '#f0f2f8' }}
                  className={`px-4 py-3 print:text-black ${headers[ci]?.right ? 'text-right' : 'text-left'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr style={{ background: '#0f1117', borderTopColor: '#2a2d3e' }} className="border-t print:bg-gray-50 print:border-gray-200">
              {footer.map((cell, i) => (
                <td key={i} style={{ color: '#f0f2f8' }}
                  className={`px-4 py-3 font-semibold print:text-black ${headers[i]?.right ? 'text-right' : 'text-left'}`}>
                  {cell}
                </td>
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
    <div style={{ background: '#0f1117' }} className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#4f8ef7] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p style={{ color: '#8b90a7' }} className="text-sm">Hämtar projektdata...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ background: '#0f1117' }} className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p style={{ color: '#f0f2f8' }} className="text-lg font-semibold mb-2">Kunde inte hämta projekt</p>
        <p style={{ color: '#8b90a7' }} className="text-sm mb-4">{error}</p>
        <button onClick={() => window.history.back()}
          style={{ color: '#4f8ef7', border: '1px solid #2a2d3e' }}
          className="px-4 py-2 rounded-lg text-sm hover:opacity-70 transition-opacity">
          Tillbaka
        </button>
      </div>
    </div>
  );

  if (!project) return null;

  const totalHours = timeEntries.reduce((s, t) => s + (t.hours || 0), 0);
  const totalTimeCost = timeEntries.reduce((s, t) => s + ((t.hours || 0) * (t.hourlyRate || 0)), 0);
  const totalKm = drivingEntries.reduce((s, d) => s + (d.distanceKm || 0), 0);
  const unpaidBalance = (project.customerInvoices || []).reduce((s, inv) => s + (inv.balance || 0), 0);
  const marginPct = project.revenue > 0 ? ((project.result / project.revenue) * 100) : null;

  // Customer invoices
  const custHeaders = [
    { label: 'Faktura nr' }, { label: 'Kund' }, { label: 'Fakturadatum' },
    { label: 'Förfallodatum' }, { label: 'Belopp', right: true },
    { label: 'Återstår', right: true }, { label: 'Status' }
  ];
  const custRows = (project.customerInvoices || []).map(inv => [
    <span style={{ color: '#4f8ef7' }} className="font-mono text-xs">{inv.invoiceNumber}</span>,
    <span style={{ color: '#8b90a7' }}>{inv.customerName || '–'}</span>,
    <span style={{ color: '#8b90a7' }}>{inv.invoiceDate || '–'}</span>,
    <span style={{ color: '#8b90a7' }}>{inv.dueDate || '–'}</span>,
    <span className="font-semibold tabular-nums">{fmtNum(inv.total)}</span>,
    <span style={{ color: inv.balance > 0 ? '#fb923c' : '#8b90a7' }} className="tabular-nums">{fmtNum(inv.balance)}</span>,
    <InvStatusBadge balance={inv.balance} dueDate={inv.dueDate} />
  ]);
  const custTotals = (project.customerInvoices || []).reduce((acc, inv) => ({ total: acc.total + (inv.total || 0), balance: acc.balance + (inv.balance || 0) }), { total: 0, balance: 0 });
  const custFooter = (project.customerInvoices || []).length > 0
    ? ['', '', '', <span style={{ color: '#8b90a7' }} className="text-xs uppercase tracking-wide">Totalt</span>,
       <span className="tabular-nums">{fmtNum(custTotals.total)}</span>,
       <span className="tabular-nums">{fmtNum(custTotals.balance)}</span>, '']
    : null;

  // Supplier invoices
  const supHeaders = [
    { label: 'Faktura nr' }, { label: 'Leverantör' }, { label: 'Fakturadatum' },
    { label: 'Förfallodatum' }, { label: 'Belopp', right: true }, { label: 'Status' }
  ];
  const supRows = (project.supplierInvoices || []).map(inv => [
    <span style={{ color: '#a78bfa' }} className="font-mono text-xs">{inv.invoiceNumber}</span>,
    <span style={{ color: '#f0f2f8' }}>{inv.supplierName || '–'}</span>,
    <span style={{ color: '#8b90a7' }}>{inv.invoiceDate || '–'}</span>,
    <span style={{ color: '#8b90a7' }}>{inv.dueDate || '–'}</span>,
    <span className="font-semibold tabular-nums">{fmtNum(inv.total)}</span>,
    <InvStatusBadge balance={inv.balance} dueDate={inv.dueDate} />
  ]);

  // Time log
  const timeHeaders = [
    { label: 'Datum' }, { label: 'Medarbetare' }, { label: 'Timmar', right: true },
    { label: 'Beskrivning' }, { label: 'Timpris', right: true }, { label: 'Kostnad', right: true }
  ];
  const timeRows = timeEntries.map(t => [
    <span className="font-mono text-xs" style={{ color: '#8b90a7' }}>{t.date}</span>,
    t.reporter || '–',
    <span style={{ color: '#4f8ef7' }} className="font-semibold tabular-nums">{t.hours}</span>,
    <span style={{ color: '#8b90a7' }}>{t.description || '–'}</span>,
    <span style={{ color: '#8b90a7' }} className="tabular-nums">{t.hourlyRate ? fmtNum(t.hourlyRate) + ' kr/h' : '–'}</span>,
    <span className="tabular-nums">{t.hourlyRate ? fmtNum((t.hours || 0) * t.hourlyRate) : '–'}</span>
  ]);
  const timeFooter = timeEntries.length > 0
    ? ['', '', <span style={{ color: '#4f8ef7' }} className="tabular-nums">{totalHours} h</span>, '', '',
       <span className="tabular-nums">{totalTimeCost > 0 ? fmtNum(totalTimeCost) : '–'}</span>]
    : null;

  // Driving
  const fmtTime = (iso) => iso ? iso.slice(11, 16) : '–';

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '–';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    if (diffMs <= 0) return '–';
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  const totalDrivingMinutes = drivingEntries.reduce((sum, d) => {
    if (!d.startTime || !d.endTime) return sum;
    const diffMs = new Date(d.endTime) - new Date(d.startTime);
    return diffMs > 0 ? sum + Math.floor(diffMs / 60000) : sum;
  }, 0);
  const totalDurationStr = totalDrivingMinutes > 0
    ? (Math.floor(totalDrivingMinutes / 60) > 0
        ? `${Math.floor(totalDrivingMinutes / 60)}h ${totalDrivingMinutes % 60}min`
        : `${totalDrivingMinutes}min`)
    : '–';

  const driveHeaders = [
    { label: 'Datum' }, { label: 'Starttid' }, { label: 'Stopptid' }, { label: 'Körtid' }, { label: 'Förare' },
    { label: 'Från (adress)' }, { label: 'Till (adress)' }, { label: 'Km', right: true }, { label: 'Syfte' }
  ];
  const driveRows = drivingEntries.map(d => [
    <span className="font-mono text-xs" style={{ color: '#8b90a7' }}>{d.date}</span>,
    <span className="font-mono" style={{ color: '#8b90a7' }}>{fmtTime(d.startTime)}</span>,
    <span className="font-mono" style={{ color: '#8b90a7' }}>{fmtTime(d.endTime)}</span>,
    <span style={{ color: '#60a5fa' }} className="font-medium tabular-nums">{formatDuration(d.startTime, d.endTime)}</span>,
    d.driverName || '–',
    <span style={{ color: '#8b90a7' }}>{d.fromAddress || d.fromLocation || '–'}</span>,
    <span style={{ color: '#8b90a7' }}>{d.toAddress || d.toLocation || '–'}</span>,
    <span style={{ color: '#fb923c' }} className="font-semibold tabular-nums">{d.distanceKm || '–'}</span>,
    <span style={{ color: '#8b90a7' }}>{d.purpose || d.description || '–'}</span>
  ]);
  const driveFooter = drivingEntries.length > 0
    ? ['', '', '',
       <span style={{ color: '#60a5fa' }} className="font-mono tabular-nums">{`${totalDurationStr} | ${fmtNum(totalKm)} km`}</span>,
       '', '', '', '', '']
    : null;

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ background: '#0f1117', minHeight: '100vh' }} className="text-[#f0f2f8] print:bg-white print:text-black">
        <div className="max-w-[1200px] mx-auto px-6 py-10">

          {/* HEADER */}
          <div style={{ borderBottomColor: '#2a2d3e' }} className="border-b pb-6 mb-8 print:border-gray-200">
            <div className="flex items-start justify-between gap-6">
              <div>
                {/* Title row */}
                <div className="flex items-baseline gap-3 flex-wrap mb-3">
                  <span style={{ color: '#4f8ef7' }} className="text-2xl font-mono font-bold">{project.projectNumber}</span>
                  <span className="text-xl font-semibold">{project.projectName}</span>
                </div>
                {/* Chips row */}
                <div className="flex flex-wrap items-center gap-2">
                  {project.customerName && (
                    <span style={{ color: '#8b90a7', background: '#1e2132', border: '1px solid #2a2d3e' }}
                      className="text-xs px-3 py-1.5 rounded-full">{project.customerName}</span>
                  )}
                  <StatusBadge status={project.projectStatus} />
                  {(project.startDate || project.endDate) && (
                    <span style={{ color: '#8b90a7', background: '#1e2132', border: '1px solid #2a2d3e' }}
                      className="text-xs px-3 py-1.5 rounded-full font-mono">
                      {project.startDate || '?'} — {project.endDate || '?'}
                    </span>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 no-print shrink-0">
                <button onClick={() => window.print()}
                  className="border border-gray-600 text-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-800 transition-colors">
                  Skriv ut
                </button>
                <button onClick={() => window.history.back()}
                  className="border border-gray-600 text-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-800 transition-colors">
                  Tillbaka
                </button>
              </div>
            </div>
          </div>

          {/* KPI SECTION */}
          <div style={{ color: '#8b90a7' }} className="text-xs font-semibold uppercase tracking-widest mb-4 print:text-gray-500">
            Ekonomisk översikt
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-2">
            <KpiCard label="Ordervärde" value={fmt(project.orderValue)} valueColor="#4f8ef7" />
            <KpiCard label="Fakturerat" value={fmt(project.revenue)} valueColor="#34d399" />
            <KpiCard label="Ej fakturerat" value={fmt(project.unfactured)} valueColor="#fb923c" />
            <KpiCard label="Kostnader" value={fmt(project.costs)} valueColor="#f87171" />
            <KpiCard label="Resultat" value={fmt(project.result)} valueColor={project.result >= 0 ? '#34d399' : '#f87171'} />
            <KpiCard label="Obetalt" value={fmt(unpaidBalance)} valueColor={unpaidBalance > 0 ? '#f87171' : '#34d399'} />
          </div>

          {/* KUNDFAKTUROR */}
          <SectionHeading title="Kundfakturor" />
          <DataTable headers={custHeaders} rows={custRows} footer={custFooter} emptyMsg="Inga kundfakturor kopplade till detta projekt" />

          {/* LEVERANTÖRSFAKTUROR */}
          <SectionHeading title="Leverantörsfakturor" />
          <DataTable headers={supHeaders} rows={supRows} emptyMsg="Inga leverantörsfakturor kopplade till detta projekt" />

          {/* TIDSLOGG */}
          <SectionHeading title="Tidslogg" />
          <DataTable headers={timeHeaders} rows={timeRows} footer={timeFooter} emptyMsg="Ingen tidslogg registrerad" />

          {/* KÖRJOURNAL */}
          <SectionHeading title="Körjournal" />
          <DataTable headers={driveHeaders} rows={driveRows} footer={driveFooter} emptyMsg="Ingen körjournal registrerad" />

          {/* SUMMARY */}
          <SectionHeading title="Sammanfattning" />
          <div style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }} className="rounded-xl overflow-hidden print:border-gray-200 print:bg-white">
            <div className="flex divide-x" style={{ borderColor: '#2a2d3e' }}>
              {[
                { label: 'Total intäkt', value: fmt(project.revenue), color: '#34d399' },
                { label: 'Total kostnad', value: fmt(project.costs), color: '#f87171' },
                { label: 'Resultat', value: fmt(project.result), color: project.result >= 0 ? '#34d399' : '#f87171' },
                { label: 'Marginal', value: fmtPct(marginPct), color: marginPct !== null && marginPct >= 0 ? '#4f8ef7' : '#f87171' },
                { label: 'Arbetstid', value: totalHours + ' h', color: '#f0f2f8' },
                { label: 'Körsträcka', value: fmtNum(totalKm) + ' km', color: '#f0f2f8' },
              ].map((item, i) => (
                <div key={i} className="flex-1 px-6 py-5 print:border-gray-200" style={{ borderColor: '#2a2d3e' }}>
                  <div style={{ color: '#8b90a7' }} className="text-xs uppercase tracking-widest mb-2 print:text-gray-500">{item.label}</div>
                  <div style={{ color: item.color }} className="text-xl font-bold tabular-nums print:text-black">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div style={{ color: '#8b90a7', borderTopColor: '#2a2d3e' }} className="mt-8 pt-6 border-t text-xs print:text-gray-400 print:border-gray-200">
            Projektet <span style={{ color: '#f0f2f8' }} className="font-medium">{project.projectName}</span> visar ett{' '}
            <span style={{ color: project.result >= 0 ? '#34d399' : '#f87171' }} className="font-medium">{project.result >= 0 ? 'positivt' : 'negativt'}</span>{' '}
            resultat på <span style={{ color: '#f0f2f8' }} className="font-medium">{fmt(project.result)}</span> med en marginal på{' '}
            <span style={{ color: '#f0f2f8' }} className="font-medium">{fmtPct(marginPct)}</span>.
          </div>

        </div>
      </div>
    </>
  );
}