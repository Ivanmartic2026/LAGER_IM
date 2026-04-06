import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format, parseISO, isWithinInterval } from 'date-fns';

const RATE = 2.50; // kr/km

const fmt = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 }) + ' kr';
const fmtNum = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 1 });

function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return '–';
  const diff = new Date(endTime) - new Date(startTime);
  if (diff <= 0) return '–';
  const totalMin = Math.floor(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function fmtTime(iso) {
  if (!iso) return '–';
  return iso.slice(11, 16);
}

function getDateRange(period, customStart, customEnd) {
  const now = new Date();
  switch (period) {
    case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month': { const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) }; }
    case 'this_year': return { start: startOfYear(now), end: endOfYear(now) };
    case 'custom': return {
      start: customStart ? new Date(customStart) : startOfMonth(now),
      end: customEnd ? new Date(customEnd) : endOfMonth(now),
    };
    default: return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

const PERIOD_OPTIONS = [
  { value: 'this_month', label: 'Denna månad' },
  { value: 'last_month', label: 'Förra månaden' },
  { value: 'this_year', label: 'Detta år' },
  { value: 'custom', label: 'Anpassad' },
];

export default function KilometerErsattning() {
  const [period, setPeriod] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [paidState, setPaidState] = useState({}); // driverName -> bool

  const { data: entries = [] } = useQuery({
    queryKey: ['drivingJournal'],
    queryFn: () => base44.entities.DrivingJournalEntry.list(),
  });

  const { start, end } = getDateRange(period, customStart, customEnd);
  const periodLabel = `${format(start, 'yyyy-MM-dd')} – ${format(end, 'yyyy-MM-dd')}`;

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (!e.date) return false;
      const d = parseISO(e.date);
      if (!isWithinInterval(d, { start, end })) return false;
      if (filterEmployee !== 'all' && e.driverName !== filterEmployee) return false;
      return true;
    });
  }, [entries, start, end, filterEmployee]);

  const allDrivers = useMemo(() => {
    const set = new Set();
    entries.forEach(e => e.driverName && set.add(e.driverName));
    return Array.from(set).sort();
  }, [entries]);

  // Group by driver
  const byDriver = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const key = e.driverName || '–';
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return Object.entries(map)
      .map(([name, trips]) => ({
        name,
        trips: trips.sort((a, b) => (a.date || '').localeCompare(b.date || '')),
        totalKm: trips.reduce((s, t) => s + (t.distanceKm || 0), 0),
        ersattning: trips.reduce((s, t) => s + (t.distanceKm || 0), 0) * RATE,
      }))
      .sort((a, b) => b.totalKm - a.totalKm);
  }, [filtered]);

  // KPIs
  const totalKm = byDriver.reduce((s, d) => s + d.totalKm, 0);
  const totalErsattning = totalKm * RATE;
  const totalTrips = filtered.length;

  const togglePaid = (name) => setPaidState(prev => ({ ...prev, [name]: !prev[name] }));

  const handlePrint = () => window.print();

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; font-size: 11px; }
          .print-white { background: white !important; color: black !important; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
          th, td { border: 1px solid #ccc !important; padding: 4px 8px !important; color: black !important; background: white !important; }
          th { background: #eee !important; font-weight: bold; }
          .employee-section { page-break-inside: avoid; margin-bottom: 24px; }
          .employee-section + .employee-section { page-break-before: always; }
          .signature-line { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 8px; color: #333; font-size: 10px; }
          .expanded-detail { display: block !important; }
        }
      `}</style>

      <div className="min-h-screen bg-black text-white px-4 py-6 md:px-8">

        {/* Print Header */}
        <div className="hidden print:block mb-6 print-white">
          <div className="text-xl font-bold">IM Vision Group AB — Milersättningsunderlag</div>
          <div className="text-sm mt-1">Period: {periodLabel}</div>
          <div className="text-sm">Ersättningsnivå: {RATE.toFixed(2)} kr/km (25 kr/mil)</div>
        </div>

        {/* Page Header */}
        <div className="no-print flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Milersättning</h1>
            <p className="text-white/50 text-sm mt-0.5">{periodLabel} · {RATE.toFixed(2)} kr/km</p>
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
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="bg-white/10 border border-white/15 text-white rounded-lg px-3 py-2 text-sm outline-none">
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
              {allDrivers.map(d => <option key={d} value={d} className="bg-gray-900">{d}</option>)}
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Total körsträcka', value: fmtNum(totalKm) + ' km', color: '#60a5fa' },
            { label: 'Total milersättning', value: fmt(totalErsattning), color: '#34d399' },
            { label: 'Antal förare', value: byDriver.length, color: '#a78bfa' },
          ].map((card, i) => (
            <div key={i} style={{ background: '#1e2132', border: '1px solid #2a2d3e' }} className="rounded-xl p-5">
              <div className="text-xs uppercase tracking-widest text-white/40 mb-1">{card.label}</div>
              <div className="text-3xl font-bold tabular-nums" style={{ color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Main Table */}
        <div className="no-print mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-3">Ersättning per förare</h2>
          {byDriver.length === 0 ? (
            <p className="text-white/30 text-sm italic py-6">Inga körjournalposter för vald period</p>
          ) : (
            <div className="rounded-xl overflow-hidden border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#0f1117' }}>
                    {['Förare', 'Antal resor', 'Total km', 'Milersättning', 'Utbetald?', 'Åtgärder'].map((h, i) => (
                      <th key={i} className={`px-3 py-2.5 text-xs uppercase tracking-wide font-medium text-white/40 border-b border-white/10 ${i === 0 ? 'text-left' : i < 4 ? 'text-right' : 'text-center'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byDriver.map((driver, i) => (
                    <React.Fragment key={driver.name}>
                      <tr style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td className="px-3 py-3 text-white font-medium">{driver.name}</td>
                        <td className="px-3 py-3 text-white/70 tabular-nums text-right">{driver.trips.length}</td>
                        <td className="px-3 py-3 text-blue-300 font-semibold tabular-nums text-right">{fmtNum(driver.totalKm)} km</td>
                        <td className="px-3 py-3 text-green-400 font-bold tabular-nums text-right">{fmt(driver.ersattning)}</td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => togglePaid(driver.name)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${paidState[driver.name] ? 'bg-green-500' : 'bg-white/15'}`}
                          >
                            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${paidState[driver.name] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => setExpandedEmployee(expandedEmployee === driver.name ? null : driver.name)}
                            className="bg-white/10 hover:bg-white/20 text-white/80 text-xs px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {expandedEmployee === driver.name ? 'Dölj' : 'Visa resor'}
                          </button>
                        </td>
                      </tr>
                      {expandedEmployee === driver.name && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <div style={{ background: '#111827' }} className="p-4">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr>
                                    {['Datum', 'Starttid', 'Stopptid', 'Körtid', 'Projekt', 'Från', 'Till', 'Km', 'Ersättning', 'Syfte'].map((h, hi) => (
                                      <th key={hi} className="px-2 py-1.5 text-left text-white/30 font-medium border-b border-white/10">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {driver.trips.map((trip, ti) => (
                                    <tr key={ti} style={{ background: ti % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
                                      <td className="px-2 py-1.5 text-white/60 font-mono">{trip.date}</td>
                                      <td className="px-2 py-1.5 text-white/50">{fmtTime(trip.startTime)}</td>
                                      <td className="px-2 py-1.5 text-white/50">{fmtTime(trip.endTime)}</td>
                                      <td className="px-2 py-1.5 text-blue-300">{formatDuration(trip.startTime, trip.endTime)}</td>
                                      <td className="px-2 py-1.5 text-white/60 font-mono">{trip.projectNumber || '–'}</td>
                                      <td className="px-2 py-1.5 text-white/50">{trip.fromAddress || trip.fromLocation || '–'}</td>
                                      <td className="px-2 py-1.5 text-white/50">{trip.toAddress || trip.toLocation || '–'}</td>
                                      <td className="px-2 py-1.5 text-orange-300 font-semibold tabular-nums">{fmtNum(trip.distanceKm)} km</td>
                                      <td className="px-2 py-1.5 text-green-400 font-semibold tabular-nums">{fmt((trip.distanceKm || 0) * RATE)}</td>
                                      <td className="px-2 py-1.5 text-white/50">{trip.purpose || '–'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#0f1117', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <td className="px-3 py-3 text-white/50 text-xs uppercase tracking-wide font-semibold">Totalt</td>
                    <td className="px-3 py-3 text-white/70 tabular-nums text-right font-semibold">{totalTrips} resor</td>
                    <td className="px-3 py-3 text-blue-300 font-bold tabular-nums text-right">{fmtNum(totalKm)} km</td>
                    <td className="px-3 py-3 text-green-400 font-bold tabular-nums text-right">{fmt(totalErsattning)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Print Layout — per employee */}
        <div className="hidden print:block">
          {byDriver.map(driver => (
            <div key={driver.name} className="employee-section">
              <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: 6 }}>
                {driver.name} — {fmtNum(driver.totalKm)} km — {fmt(driver.ersattning)}
              </div>
              <table>
                <thead>
                  <tr>
                    {['Datum', 'Starttid', 'Stopptid', 'Körtid', 'Projekt', 'Från', 'Till', 'Km', 'Ersättning', 'Syfte'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {driver.trips.map((trip, ti) => (
                    <tr key={ti}>
                      <td>{trip.date}</td>
                      <td>{fmtTime(trip.startTime)}</td>
                      <td>{fmtTime(trip.endTime)}</td>
                      <td>{formatDuration(trip.startTime, trip.endTime)}</td>
                      <td>{trip.projectNumber || '–'}</td>
                      <td>{trip.fromAddress || trip.fromLocation || '–'}</td>
                      <td>{trip.toAddress || trip.toLocation || '–'}</td>
                      <td>{fmtNum(trip.distanceKm)}</td>
                      <td>{fmt((trip.distanceKm || 0) * RATE)}</td>
                      <td>{trip.purpose || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 4, fontSize: 10, color: '#333' }}>
                Summa: {driver.trips.length} resor · {fmtNum(driver.totalKm)} km · {fmt(driver.ersattning)}
              </div>
              <div className="signature-line">
                Godkänd av: _____________ &nbsp;&nbsp; Datum: _______
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}