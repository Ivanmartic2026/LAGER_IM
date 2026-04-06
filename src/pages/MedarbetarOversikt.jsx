import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronDown, ChevronUp } from 'lucide-react';

const DEFAULT_RATE = 590;

function fmt(n) {
  return (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 }) + ' kr';
}
function fmtH(n) {
  return (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 1 }) + ' h';
}

function SummaryCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function EmployeeRow({ employee, drivingEntries }) {
  const [expanded, setExpanded] = useState(false);

  const displayName = employee.reporter.includes('@')
    ? employee.reporter.split('@')[0]
    : employee.reporter;

  // Match driving: by driverName containing first name or by email prefix
  const emailPrefix = employee.reporter.split('@')[0].toLowerCase();
  const firstName = emailPrefix.split('.')[0];
  const myDriving = drivingEntries.filter(d => {
    if (!d.driverName) return false;
    const dn = d.driverName.toLowerCase();
    return dn.includes(firstName) || dn.includes(emailPrefix);
  });
  const totalKm = myDriving.reduce((s, d) => s + (d.distanceKm || 0), 0);

  const sortedEntries = [...employee.entries].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Per-project breakdown
  const projectMap = {};
  employee.entries.forEach(e => {
    if (!projectMap[e.projectNumber]) projectMap[e.projectNumber] = { hours: 0, value: 0 };
    const rate = (e.hourlyRate && e.hourlyRate > 0) ? e.hourlyRate : DEFAULT_RATE;
    projectMap[e.projectNumber].hours += (e.hours || 0);
    projectMap[e.projectNumber].value += (e.hours || 0) * rate;
  });

  return (
    <>
      <tr
        className="border-b border-gray-700/50 hover:bg-white/[0.03] cursor-pointer transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <td className="px-4 py-3">
          <span className="text-white font-medium" title={employee.reporter}>{displayName}</span>
        </td>
        <td className="px-4 py-3 text-blue-400 font-semibold tabular-nums">{fmtH(employee.totalHours)}</td>
        <td className="px-4 py-3 text-green-400 font-semibold tabular-nums">{fmt(employee.totalValue)}</td>
        <td className="px-4 py-3 text-gray-300 tabular-nums">{employee.projectCount}</td>
        <td className="px-4 py-3 text-gray-300 tabular-nums">{Math.round(totalKm).toLocaleString('sv-SE')} km</td>
        <td className="px-4 py-3 text-gray-300 tabular-nums">{myDriving.length}</td>
        <td className="px-4 py-3 text-gray-400 font-mono text-sm">{employee.lastActive || '–'}</td>
        <td className="px-4 py-3 text-gray-500">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-800/50">
          <td colSpan={8} className="px-4 py-4">
            <div className="space-y-4">
              {/* Time entries table */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Tidsposter</p>
                <div className="overflow-x-auto rounded border border-gray-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-900 border-b border-gray-700 text-gray-400">
                        <th className="text-left px-3 py-2">Datum</th>
                        <th className="text-left px-3 py-2">Projekt</th>
                        <th className="text-right px-3 py-2">Timmar</th>
                        <th className="text-right px-3 py-2">Timpris</th>
                        <th className="text-right px-3 py-2">Värde</th>
                        <th className="text-left px-3 py-2">Beskrivning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEntries.map((e, i) => {
                        const rate = (e.hourlyRate && e.hourlyRate > 0) ? e.hourlyRate : DEFAULT_RATE;
                        return (
                          <tr key={i} className="border-b border-gray-700/30 last:border-0">
                            <td className="px-3 py-1.5 text-gray-400 font-mono">{e.date}</td>
                            <td className="px-3 py-1.5 text-blue-400">{e.projectNumber}</td>
                            <td className="px-3 py-1.5 text-right text-white">{e.hours} h</td>
                            <td className="px-3 py-1.5 text-right text-gray-400">{rate} kr/h</td>
                            <td className="px-3 py-1.5 text-right text-green-400">{fmt((e.hours || 0) * rate)}</td>
                            <td className="px-3 py-1.5 text-gray-500 max-w-xs truncate">{e.description || '–'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Per-project summary */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Per projekt</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(projectMap).sort((a, b) => b[1].value - a[1].value).map(([pn, d]) => (
                    <div key={pn} className="bg-gray-700/50 rounded-lg px-3 py-2 text-xs">
                      <span className="text-blue-400 font-mono font-semibold">{pn}</span>
                      <span className="text-gray-400 ml-2">{fmtH(d.hours)}</span>
                      <span className="text-green-400 ml-2">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function MedarbetarOversikt() {
  const { data: allProjectTime = [], isFetching: fetchingTime } = useQuery({
    queryKey: ['mo_allProjectTime'],
    queryFn: () => base44.entities.ProjectTime.list(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: allDriving = [], isFetching: fetchingDriving } = useQuery({
    queryKey: ['mo_allDriving'],
    queryFn: () => base44.entities.DrivingJournalEntry.list(),
    staleTime: 2 * 60 * 1000,
  });

  const isFetching = fetchingTime || fetchingDriving;

  // Build per-employee data
  const employees = useMemo(() => {
    const map = {};
    allProjectTime.forEach(e => {
      const rep = e.reporter || 'Okänd';
      if (!map[rep]) map[rep] = { reporter: rep, entries: [], totalHours: 0, totalValue: 0, projects: new Set(), lastActive: '' };
      const rate = (e.hourlyRate && e.hourlyRate > 0) ? e.hourlyRate : DEFAULT_RATE;
      map[rep].entries.push(e);
      map[rep].totalHours += (e.hours || 0);
      map[rep].totalValue += (e.hours || 0) * rate;
      if (e.projectNumber) map[rep].projects.add(e.projectNumber);
      if (e.date && e.date > map[rep].lastActive) map[rep].lastActive = e.date;
    });
    return Object.values(map).map(emp => ({
      ...emp,
      projectCount: emp.projects.size,
    })).sort((a, b) => b.totalValue - a.totalValue);
  }, [allProjectTime]);

  // Per-project summary
  const projectSummary = useMemo(() => {
    const map = {};
    allProjectTime.forEach(e => {
      const pn = e.projectNumber || 'Okänt';
      if (!map[pn]) map[pn] = { projectNumber: pn, hours: 0, value: 0, reporters: new Set() };
      const rate = (e.hourlyRate && e.hourlyRate > 0) ? e.hourlyRate : DEFAULT_RATE;
      map[pn].hours += (e.hours || 0);
      map[pn].value += (e.hours || 0) * rate;
      if (e.reporter) map[pn].reporters.add(e.reporter);
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [allProjectTime]);

  // KPIs
  const totalHours = allProjectTime.reduce((s, e) => s + (e.hours || 0), 0);
  const totalValue = allProjectTime.reduce((s, e) => {
    const rate = (e.hourlyRate && e.hourlyRate > 0) ? e.hourlyRate : DEFAULT_RATE;
    return s + (e.hours || 0) * rate;
  }, 0);
  const totalKm = allDriving.reduce((s, d) => s + (d.distanceKm || 0), 0);
  const uniqueReporters = new Set(allProjectTime.map(e => e.reporter).filter(Boolean)).size;
  const grandTotalHours = projectSummary.reduce((s, p) => s + p.hours, 0);
  const grandTotalValue = projectSummary.reduce((s, p) => s + p.value, 0);

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Medarbetaröversikt</h1>
          <p className="text-xs text-gray-500 mt-1">
            Värdeberäkning baseras på 590 kr/h (standardtaxa). Visas endast i Lager AI.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Totalt inarbetad tid" value={fmtH(totalHours)} color="text-blue-400" />
          <SummaryCard label="Totalt värde" value={fmt(totalValue)} color="text-green-400" />
          <SummaryCard label="Total körsträcka" value={`${Math.round(totalKm).toLocaleString('sv-SE')} km`} color="text-blue-400" />
          <SummaryCard label="Aktiva medarbetare" value={uniqueReporters} color="text-white" />
        </div>

        {/* Employee table */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Medarbetare</h2>
          {isFetching && employees.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-500">Hämtar data...</div>
          ) : (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-900 border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3">Medarbetare</th>
                      <th className="text-left px-4 py-3">Timmar</th>
                      <th className="text-left px-4 py-3">Värde (kr)</th>
                      <th className="text-left px-4 py-3">Projekt</th>
                      <th className="text-left px-4 py-3">Km</th>
                      <th className="text-left px-4 py-3">Resor</th>
                      <th className="text-left px-4 py-3">Senast aktiv</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <EmployeeRow key={emp.reporter} employee={emp} drivingEntries={allDriving} />
                    ))}
                    {employees.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">Ingen data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Project value summary */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Värde per projekt</h2>
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900 border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Projekt</th>
                    <th className="text-right px-4 py-3">Timmar</th>
                    <th className="text-right px-4 py-3">Värde (kr)</th>
                    <th className="text-right px-4 py-3">Medarbetare</th>
                  </tr>
                </thead>
                <tbody>
                  {projectSummary.map((p, i) => (
                    <tr key={p.projectNumber} className={`border-b border-gray-700/30 ${i % 2 === 1 ? 'bg-gray-700/20' : ''}`}>
                      <td className="px-4 py-2.5 text-blue-400 font-mono font-semibold">{p.projectNumber}</td>
                      <td className="px-4 py-2.5 text-right text-white tabular-nums">{fmtH(p.hours)}</td>
                      <td className="px-4 py-2.5 text-right text-green-400 font-semibold tabular-nums">{fmt(p.value)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{p.reporters.size}</td>
                    </tr>
                  ))}
                  {/* Grand total row */}
                  <tr className="border-t-2 border-gray-600 bg-gray-900/50 font-semibold">
                    <td className="px-4 py-3 text-gray-300">Totalt</td>
                    <td className="px-4 py-3 text-right text-blue-400 tabular-nums">{fmtH(grandTotalHours)}</td>
                    <td className="px-4 py-3 text-right text-green-400 tabular-nums">{fmt(grandTotalValue)}</td>
                    <td className="px-4 py-3 text-right text-gray-400 tabular-nums">{uniqueReporters}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}