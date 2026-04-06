import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

function formatDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '–';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function SummaryCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ReporterChip({ name }) {
  const initials = name
    .split('@')[0]
    .split('.')
    .map(p => p[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2);
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-700 border border-gray-600 text-xs text-gray-300">
      <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold">{initials}</span>
      {name.split('@')[0]}
    </span>
  );
}

function ProjectCard({ projectNumber, timeEntries, drivingEntries, link }) {
  const [expanded, setExpanded] = useState(false);

  const projectName = link?.wsProjectName || `Projekt ${projectNumber}`;
  const isLinked = !!link;

  const totalHours = timeEntries.reduce((s, t) => s + (t.hours || 0), 0);
  const totalKm = drivingEntries.reduce((s, d) => s + (d.distanceKm || 0), 0);
  const totalDrivingMin = drivingEntries.reduce((s, d) => {
    if (!d.startTime || !d.endTime) return s;
    const diff = new Date(d.endTime) - new Date(d.startTime);
    return diff > 0 ? s + Math.floor(diff / 60000) : s;
  }, 0);

  const reporters = [...new Set(timeEntries.map(t => t.reporter).filter(Boolean))];

  const allDates = [
    ...timeEntries.map(t => t.date),
    ...drivingEntries.map(d => d.date),
  ].filter(Boolean).sort().reverse();
  const lastActive = allDates[0] || null;

  const sortedTimeEntries = [...timeEntries].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const visibleEntries = expanded ? sortedTimeEntries : sortedTimeEntries.slice(0, 5);
  const hasMore = sortedTimeEntries.length > 5;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-blue-400 font-mono text-sm font-semibold">{projectNumber}</span>
          <p className="text-white font-medium mt-0.5">{projectName}</p>
        </div>
        {isLinked ? (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">WS Länkat</span>
        ) : (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-600/40 text-gray-400 border border-gray-600/40">Ej länkat</span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Timmar</p>
          <p className="text-blue-400 font-bold text-lg">{totalHours.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} h</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Resor</p>
          <p className="text-white font-bold text-lg">{drivingEntries.length}</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Km</p>
          <p className="text-blue-400 font-bold text-lg">{Math.round(totalKm).toLocaleString('sv-SE')} km</p>
        </div>
      </div>

      {/* Körtid */}
      {totalDrivingMin > 0 && (
        <p className="text-xs text-gray-400">
          Total körtid: <span className="text-blue-400 font-mono">{formatDuration(totalDrivingMin)}</span>
        </p>
      )}

      {/* Reporters */}
      {reporters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {reporters.map(r => <ReporterChip key={r} name={r} />)}
        </div>
      )}

      {/* Last active */}
      {lastActive && (
        <p className="text-xs text-gray-500">
          Senast aktiv: <span className="text-gray-300">{lastActive}</span>
        </p>
      )}

      {/* Time entries mini list */}
      {sortedTimeEntries.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Senaste aktivitet</p>
          <div className="space-y-1">
            {visibleEntries.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-gray-700/50 last:border-0">
                <span className="text-gray-500 font-mono w-20 shrink-0">{t.date}</span>
                <span className="text-gray-400 w-24 shrink-0 truncate">{(t.reporter || '').split('@')[0]}</span>
                <span className="text-blue-400 font-semibold w-12 shrink-0">{t.hours} h</span>
                <span className="text-gray-500 truncate">{t.description || '–'}</span>
              </div>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Visa färre' : `Visa alla ${sortedTimeEntries.length} poster`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function WorkspaceProjects() {
  const [search, setSearch] = useState('');
  const [onlyLinked, setOnlyLinked] = useState(false);

  const { data: allProjectTime = [], isFetching: fetchingTime, refetch: refetchTime } = useQuery({
    queryKey: ['ws_allProjectTime'],
    queryFn: () => base44.entities.ProjectTime.list(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: allDriving = [], isFetching: fetchingDriving, refetch: refetchDriving } = useQuery({
    queryKey: ['ws_allDriving'],
    queryFn: () => base44.entities.DrivingJournalEntry.list(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: allLinks = [], isFetching: fetchingLinks, refetch: refetchLinks } = useQuery({
    queryKey: ['ws_allLinks'],
    queryFn: () => base44.entities.ProjectLink.list(),
    staleTime: 2 * 60 * 1000,
  });

  const isFetching = fetchingTime || fetchingDriving || fetchingLinks;

  const refetch = () => {
    refetchTime();
    refetchDriving();
    refetchLinks();
  };

  const linkMap = useMemo(() => {
    const m = {};
    allLinks.forEach(l => { m[l.projectNumber] = l; });
    return m;
  }, [allLinks]);

  // Group by projectNumber
  const projectNumbers = useMemo(() => {
    const nums = new Set([
      ...allProjectTime.map(t => t.projectNumber),
      ...allDriving.map(d => d.projectNumber),
    ].filter(Boolean));
    return [...nums];
  }, [allProjectTime, allDriving]);

  // Summary KPIs
  const totalHours = allProjectTime.reduce((s, t) => s + (t.hours || 0), 0);
  const totalKm = allDriving.reduce((s, d) => s + (d.distanceKm || 0), 0);
  const uniqueReporters = new Set(allProjectTime.map(t => t.reporter).filter(Boolean)).size;

  // Build project entries
  const projectEntries = useMemo(() => {
    return projectNumbers.map(pn => {
      const timeEntries = allProjectTime.filter(t => t.projectNumber === pn);
      const drivingEntries = allDriving.filter(d => d.projectNumber === pn);
      const link = linkMap[pn] || null;
      const allDates = [
        ...timeEntries.map(t => t.date),
        ...drivingEntries.map(d => d.date),
      ].filter(Boolean).sort().reverse();
      const lastActive = allDates[0] || '';
      return { projectNumber: pn, timeEntries, drivingEntries, link, lastActive };
    });
  }, [projectNumbers, allProjectTime, allDriving, linkMap]);

  const filtered = useMemo(() => {
    let list = [...projectEntries];
    if (onlyLinked) list = list.filter(p => !!p.link);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.projectNumber.toLowerCase().includes(q) ||
        (p.link?.wsProjectName || '').toLowerCase().includes(q)
      );
    }
    // Sort by most recently active
    list.sort((a, b) => (b.lastActive || '').localeCompare(a.lastActive || ''));
    return list;
  }, [projectEntries, onlyLinked, search]);

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Workspace Projekt</h1>
            <p className="text-sm text-gray-400 mt-0.5">Översikt över alla projekt med Workspace-aktivitet</p>
          </div>
          <Button onClick={refetch} disabled={isFetching} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Uppdatera
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Synkade projekt" value={projectNumbers.length} color="text-white" />
          <SummaryCard label="Total arbetstid" value={`${totalHours.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} h`} color="text-blue-400" />
          <SummaryCard label="Total körsträcka" value={`${Math.round(totalKm).toLocaleString('sv-SE')} km`} color="text-blue-400" />
          <SummaryCard label="Aktiva medarbetare" value={uniqueReporters} color="text-white" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Sök projektnr eller namn..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 w-60"
          />
          <button
            onClick={() => setOnlyLinked(v => !v)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              onlyLinked
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            Visa endast länkade
          </button>
          <span className="text-xs text-gray-500 ml-auto">
            Visar {filtered.length} av {projectEntries.length} projekt
          </span>
        </div>

        {/* Project cards */}
        {isFetching && projectEntries.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-500">Inga projekt hittades</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(p => (
              <ProjectCard
                key={p.projectNumber}
                projectNumber={p.projectNumber}
                timeEntries={p.timeEntries}
                drivingEntries={p.drivingEntries}
                link={p.link}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}