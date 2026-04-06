import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, format, parseISO, isWithinInterval } from 'date-fns';

const DEFAULT_RATE = 590;
const MILEAGE_RATE = 2.5; // kr/km

const fmt = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 }) + ' kr';
const fmtNum = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 1 });

function getDateRange(period, customStart, customEnd) {
  const now = new Date();
  switch (period) {
    case 'this_week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'last_week': { const lw = subDays(now, 7); return { start: startOfWeek(lw, { weekStartsOn: 1 }), end: endOfWeek(lw, { weekStartsOn: 1 }) }; }
    case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month': { const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) }; }
    case 'custom': return { start: customStart ? new Date(customStart) : startOfMonth(now), end: customEnd ? new Date(customEnd) : endOfMonth(now) };
    default: return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

const PERIOD_OPTIONS = [
  { value: 'this_week', label: 'Denna vecka' },
  { value: 'last_week', label: 'Förra veckan' },
  { value: 'this_month', label: 'Denna månad' },
  { value: 'last_month', label: 'Förra månaden' },
  { value: 'custom', label: 'Anpassad' },
];

const DAY_NAMES_SV = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];

export default function TidsRapport() {
  const [period, setPeriod] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterProject, setFilterProject] = useState('all');

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['projectTime'],
    queryFn: () => base44.entities.ProjectTime.list(),
  });

  const { data: drivingEntries = [] } = useQuery({
    queryKey: ['drivingJournal'],
    queryFn: () => base44.entities.DrivingJournalEntry.list(),
  });

  const { start, end } = getDateRange(period, customStart, customEnd);

  const filteredTime = useMemo(() => {
    return timeEntries.filter(e => {
      if (!e.date) return false;
      const d = parseISO(e.date);
      if (!isWithinInterval(d, { start, end })) return false;
      if (filterEmployee !== 'all' && e.reporter !== filterEmployee) return false;
      if (filterProject !== 'all' && e.projectNumber !== filterProject) return false;
      return true;
    });
  }, [timeEntries, start, end, filterEmployee, filterProject]);

  const filteredDriving = useMemo(() => {
    return drivingEntries.filter(e => {
      if (!e.date) return false;
      const d = parseISO(e.date);
      if (!isWithinInterval(d, { start, end })) return false;
      if (filterEmployee !== 'all' && e.driverName !== filterEmployee) return false;
      if (filterProject !== 'all' && e.projectNumber !== filterProject) return false;
      return true;
    });
  }, [drivingEntries, start, end, filterEmployee, filterProject]);

  // Derive employee + project lists
  const allEmployees = useMemo(() => {
    const set = new Set();
    timeEntries.forEach(e => e.reporter && set.add(e.reporter));
    drivingEntries.forEach(e => e.driverName && set.add(e.driverName));
    return Array.from(set).sort();
  }, [timeEntries, drivingEntries]);

  const allProjects = useMemo(() => {
    const set = new Set();
    timeEntries.forEach(e => e.projectNumber && set.add(e.projectNumber));
    drivingEntries.forEach(e => e.projectNumber && set.add(e.projectNumber));
    return Array.from(set).sort();
  }, [timeEntries, drivingEntries]);

  // KPIs
  const totalHours = filteredTime.reduce((s, e) => s + (e.hours || 0), 0);
  const laborValue = filteredTime.reduce((s, e) => s + (e.hours || 0) * (e.hourlyRate || DEFAULT_RATE), 0);
  const totalKm = filteredDriving.reduce((s, e) => s + (e.distanceKm || 0), 0);
  const mileageValue = totalKm * MILEAGE_RATE;
  const totalUnderlag = laborValue + mileageValue;

  // Daily breakdown
  const entriesByDate = useMemo(() => {
    const map = {};
    filteredTime.forEach(e => {
      if (!map[e.date]) map[e.date] = { time: [], driving: [] };
      map[e.date].time.push(e);
    });
    filteredDriving.forEach(e => {
      if (!map[e.date]) map[e.date] = { time: [], driving: [] };
      map[e.date].driving.push(e);
    });
    return map;
  }, [filteredTime, filteredDriving]);

  const sortedDates = Object.keys(entriesByDate).sort();

  // Employee summary
  const employeeSummary = useMemo(() => {
    const map = {};
    filteredTime.forEach(e => {
      const key = e.reporter || '–';
      if (!map[key]) map[key] = { hours: 0, value: 0, km: 0 };
      map[key].hours += e.hours || 0;
      map[key].value += (e.hours || 0) * (e.hourlyRate || DEFAULT_RATE);
    });
    filteredDriving.forEach(e => {
      const key = e.driverName || '–';
      if (!map[key]) map[key] = { hours: 0, value: 0, km: 0 };
      map[key].km += e.distanceKm || 0;
    });
    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
      milersattning: data.km * MILEAGE_RATE,
      totalt: data.value + data.km * MILEAGE_RATE,
    })).sort((a, b) => b.totalt - a.totalt);
  }, [filteredTime, filteredDriving]);

  // Project summary
  const projectSummary = useMemo(() => {
    const map = {};
    filteredTime.forEach(e => {
      const key = e.projectNumber || '–';
      if (!map[key]) map[key] = { hours: 0, value: 0, employees: new Set() };
      map[key].hours += e.hours || 0;
      map[key].value += (e.hours || 0) * (e.hourlyRate || DEFAULT_RATE);
      if (e.reporter) map[key].employees.add(e.reporter);
    });
    return Object.entries(map).map(([proj, data]) => ({
      proj,
      hours: data.hours,
      value: data.value,
      employees: Array.from(data.employees).join(', ') || '–',
    })).sort((a, b) => b.hours - a.hours);
  }, [filteredTime]);

  const periodLabel = `${format(start, 'yyyy-MM-dd')} – ${format(end, 'yyyy-MM-dd')}`;

  const handlePrint = () => window.print();

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; font-size: 11px; }
          .print-page { background: white !important; color: black !important; padding: 20px !important; }
          .print-card { background: #f5f5f5 !important; border: 1px solid #ddd !important; color: black !important; break-inside: avoid; }
          .print-table-container { border: 1px solid #ddd !important; break-inside: avoid; }
          .print-section { page-break-before: auto; }
          .print-section + .print-section { page-break-before: always; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc !important; padding: 4px 8px !important; color: black !important; background: white !important; }
          th { background: #eee !important; font-weight: bold; }
          .print-date-row { background: #e8e8e8 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-black text-white print-page px-4 py-6 md:px-8">
        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <div className="text-xl font-bold text-black">IM Vision Group AB</div>
          <div className="text-lg font-semibold text-black mt-1">Tidrapport: {periodLabel}</div>
        </div>

        {/* Page Header */}
        <div className="no-print flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Tidrapport</h1>
            <p className="text-white/50 text-sm mt-0.5">{periodLabel}</p>
          </div>
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-500/30"
          >
            Exportera PDF
          </button>
        </div>

        {/* Filter Bar */}
        <div className="no-print bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/50 uppercase tracking-wide">Period</label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="bg-white/10 border border-white/15 text-white rounded-lg px-3 py-2 text-sm outline-none"
            >
              {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>)}
            </select>
          </div>

          {period === 'custom' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50 uppercase tracking-wide">Från</label>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="bg-white/10 border border-white/15 text-white rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50 uppercase tracking-wide">Till</label>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="bg-white/10 border border-white/15 text-white rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/50 uppercase tracking-wide">Medarbetare</label>
            <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
              className="bg-white/10 border border-white/15 text-white rounded-lg px-3 py-2 text-sm outline-none">
              <option value="all" className="bg-gray-900">Alla</option>
              {allEmployees.map(emp => <option key={emp} value={emp} className="bg-gray-900">{emp}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/50 uppercase tracking-wide">Projekt</label>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
              className="bg-white/10 border border-white/15 text-white rounded-lg px-3 py-2 text-sm outline-none">
              <option value="all" className="bg-gray-900">Alla</option>
              {allProjects.map(p => <option key={p} value={p} className="bg-gray-900">{p}</option>)}
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Arbetstimmar', value: fmtNum(totalHours) + ' h', color: '#4f8ef7' },
            { label: 'Inarbetat värde', value: fmt(laborValue), color: '#a78bfa' },
            { label: 'Körsträcka', value: fmtNum(totalKm) + ' km', color: '#60a5fa' },
            { label: 'Milersättning', value: fmt(mileageValue), color: '#fb923c' },
            { label: 'Totalt underlag', value: fmt(totalUnderlag), color: '#34d399', highlight: true },
          ].map((card, i) => (
            <div key={i}
              style={{ background: card.highlight ? 'rgba(52,211,153,0.1)' : '#1e2132', border: card.highlight ? '1px solid rgba(52,211,153,0.4)' : '1px solid #2a2d3e' }}
              className="rounded-xl p-4 print-card">
              <div className="text-xs uppercase tracking-widest text-white/40 mb-1">{card.label}</div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Daily Breakdown */}
        <div className="print-section mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-3">Daglig sammanställning</h2>
          {sortedDates.length === 0 ? (
            <p className="text-white/30 text-sm italic py-6">Inga poster för vald period</p>
          ) : (
            <div className="rounded-xl overflow-hidden border border-white/10 print-table-container">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#0f1117' }}>
                    {['Projekt', 'Medarbetare', 'Timmar', 'Värde', 'Km', 'Beskrivning'].map((h, i) => (
                      <th key={i} className="px-3 py-2.5 text-left text-xs uppercase tracking-wide font-medium text-white/40 border-b border-white/10">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedDates.map(date => {
                    const dayEntries = entriesByDate[date];
                    const dayHours = dayEntries.time.reduce((s, e) => s + (e.hours || 0), 0);
                    const dayKm = dayEntries.driving.reduce((s, e) => s + (e.distanceKm || 0), 0);
                    const d = parseISO(date);
                    const dayName = DAY_NAMES_SV[d.getDay()];
                    return (
                      <React.Fragment key={date}>
                        <tr className="print-date-row" style={{ background: 'rgba(79,142,247,0.08)', borderTop: '1px solid rgba(79,142,247,0.2)' }}>
                          <td colSpan={3} className="px-3 py-2 font-semibold text-blue-300">
                            {dayName} {date}
                          </td>
                          <td className="px-3 py-2 text-white/60 font-semibold text-xs tabular-nums">{dayHours > 0 ? fmtNum(dayHours) + ' h' : ''}</td>
                          <td className="px-3 py-2 text-white/60 font-semibold text-xs tabular-nums">{dayKm > 0 ? fmtNum(dayKm) + ' km' : ''}</td>
                          <td className="px-3 py-2"></td>
                        </tr>
                        {dayEntries.time.map((e, i) => (
                          <tr key={`t-${i}`} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            <td className="px-3 py-2 text-white/70 font-mono text-xs">{e.projectNumber || '–'}</td>
                            <td className="px-3 py-2 text-white/70">{e.reporter || '–'}</td>
                            <td className="px-3 py-2 text-blue-300 font-semibold tabular-nums">{e.hours || 0} h</td>
                            <td className="px-3 py-2 text-white/60 tabular-nums text-xs">{fmt((e.hours || 0) * (e.hourlyRate || DEFAULT_RATE))}</td>
                            <td className="px-3 py-2 text-white/30">–</td>
                            <td className="px-3 py-2 text-white/50 text-xs">{e.description || ''}</td>
                          </tr>
                        ))}
                        {dayEntries.driving.map((e, i) => (
                          <tr key={`d-${i}`} style={{ background: (dayEntries.time.length + i) % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            <td className="px-3 py-2 text-white/70 font-mono text-xs">{e.projectNumber || '–'}</td>
                            <td className="px-3 py-2 text-white/70">{e.driverName || '–'}</td>
                            <td className="px-3 py-2 text-white/30">–</td>
                            <td className="px-3 py-2 text-white/30">–</td>
                            <td className="px-3 py-2 text-orange-300 font-semibold tabular-nums">{e.distanceKm || 0} km</td>
                            <td className="px-3 py-2 text-white/50 text-xs">{e.purpose || ''}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Employee Summary */}
        <div className="print-section mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-3">Medarbetarsammanställning</h2>
          {employeeSummary.length === 0 ? (
            <p className="text-white/30 text-sm italic py-4">Inga poster</p>
          ) : (
            <div className="rounded-xl overflow-hidden border border-white/10 print-table-container">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#0f1117' }}>
                    {['Medarbetare', 'Timmar', 'Värde', 'Km', 'Milersättning', 'Totalt underlag'].map((h, i) => (
                      <th key={i} className={`px-3 py-2.5 text-xs uppercase tracking-wide font-medium text-white/40 border-b border-white/10 ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employeeSummary.map((row, i) => (
                    <tr key={row.name} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="px-3 py-2.5 text-white font-medium">{row.name}</td>
                      <td className="px-3 py-2.5 text-blue-300 font-semibold tabular-nums text-right">{fmtNum(row.hours)} h</td>
                      <td className="px-3 py-2.5 text-white/70 tabular-nums text-right">{fmt(row.value)}</td>
                      <td className="px-3 py-2.5 text-orange-300 tabular-nums text-right">{fmtNum(row.km)} km</td>
                      <td className="px-3 py-2.5 text-white/70 tabular-nums text-right">{fmt(row.milersattning)}</td>
                      <td className="px-3 py-2.5 text-green-400 font-bold tabular-nums text-right">{fmt(row.totalt)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#0f1117', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <td className="px-3 py-2.5 text-white/50 text-xs uppercase tracking-wide">Totalt</td>
                    <td className="px-3 py-2.5 text-blue-300 font-bold tabular-nums text-right">{fmtNum(totalHours)} h</td>
                    <td className="px-3 py-2.5 font-bold tabular-nums text-right text-white/80">{fmt(laborValue)}</td>
                    <td className="px-3 py-2.5 text-orange-300 font-bold tabular-nums text-right">{fmtNum(totalKm)} km</td>
                    <td className="px-3 py-2.5 font-bold tabular-nums text-right text-white/80">{fmt(mileageValue)}</td>
                    <td className="px-3 py-2.5 text-green-400 font-bold tabular-nums text-right">{fmt(totalUnderlag)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Project Summary */}
        <div className="print-section mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-3">Projektsammanställning</h2>
          {projectSummary.length === 0 ? (
            <p className="text-white/30 text-sm italic py-4">Inga poster</p>
          ) : (
            <div className="rounded-xl overflow-hidden border border-white/10 print-table-container">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#0f1117' }}>
                    {['Projekt', 'Timmar', 'Värde', 'Medarbetare'].map((h, i) => (
                      <th key={i} className={`px-3 py-2.5 text-xs uppercase tracking-wide font-medium text-white/40 border-b border-white/10 ${i === 0 || i === 3 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectSummary.map((row, i) => (
                    <tr key={row.proj} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="px-3 py-2.5 text-blue-300 font-mono font-semibold">{row.proj}</td>
                      <td className="px-3 py-2.5 text-blue-300 font-semibold tabular-nums text-right">{fmtNum(row.hours)} h</td>
                      <td className="px-3 py-2.5 text-white/70 tabular-nums text-right">{fmt(row.value)}</td>
                      <td className="px-3 py-2.5 text-white/60 text-xs">{row.employees}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}