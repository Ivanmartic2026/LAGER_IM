import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

function formatDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '–';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function SummaryCard({ label, value, color = 'text-white', warn = false }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? 'bg-yellow-900/20 border-yellow-700/40' : 'bg-gray-800 border-gray-700'}`}>
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

function ProjectCard({ wsProject, timeEntries, drivingEntries, link, onSync, syncing }) {
  const [expanded, setExpanded] = useState(false);

  const projectName = wsProject.name || link?.wsProjectName || `Projekt ${wsProject.id}`;
  const projectNumber = link?.projectNumber || null;
  const isSynced = timeEntries.length > 0 || drivingEntries.length > 0;
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
    <div className={`rounded-xl border p-5 space-y-4 ${isSynced ? 'bg-gray-800 border-gray-700' : 'bg-gray-800/60 border-gray-700/50'}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          {projectNumber && (
            <span className="text-blue-400 font-mono text-sm font-semibold">{projectNumber} · </span>
          )}
          <span className="text-white font-medium">{projectName}</span>
          {wsProject.fortnoxProjectNumber && !projectNumber && (
            <p className="text-xs text-gray-500 mt-0.5">FN: {wsProject.fortnoxProjectNumber}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {isLinked ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">WS Länkat</span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-600/40 text-gray-400 border border-gray-600/40">Ej länkat</span>
          )}
          {isSynced ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">Synkad</span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Ej synkad
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Timmar</p>
          <p className={`font-bold text-lg ${isSynced ? 'text-blue-400' : 'text-gray-500'}`}>
            {totalHours.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} h
          </p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Resor</p>
          <p className={`font-bold text-lg ${isSynced ? 'text-white' : 'text-gray-500'}`}>{drivingEntries.length}</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Km</p>
          <p className={`font-bold text-lg ${isSynced ? 'text-blue-400' : 'text-gray-500'}`}>
            {Math.round(totalKm).toLocaleString('sv-SE')} km
          </p>
        </div>
      </div>

      {/* Driving time */}
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

      {/* Sync button if linked but not synced */}
      {isLinked && !isSynced && (
        <Button
          size="sm"
          onClick={() => onSync(link.projectNumber, link.wsProjectId)}
          disabled={syncing}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          Synka nu
        </Button>
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
  const [filterTab, setFilterTab] = useState('alla'); // 'alla' | 'synkade' | 'ej_synkade'
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);

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

  const { data: wsProjects = [], isFetching: fetchingWs, refetch: refetchWs } = useQuery({
    queryKey: ['ws_workspaceProjects'],
    queryFn: async () => {
      const res = await fetch('https://medarbetarappen-7890a865.base44.app/functions/listWorkspaceProjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      return data.projects || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isFetching = fetchingTime || fetchingDriving || fetchingLinks || fetchingWs;

  const refetch = () => {
    refetchTime();
    refetchDriving();
    refetchLinks();
    refetchWs();
  };

  // Build lookup maps
  const linkByProjectNumber = useMemo(() => {
    const m = {};
    allLinks.forEach(l => { m[l.projectNumber] = l; });
    return m;
  }, [allLinks]);

  const linkByWsId = useMemo(() => {
    const m = {};
    allLinks.forEach(l => { if (l.wsProjectId) m[l.wsProjectId] = l; });
    return m;
  }, [allLinks]);

  // Build merged project entries from WS projects as the primary source
  const projectEntries = useMemo(() => {
    return wsProjects.map(wp => {
      // Find link: by wsProjectId
      const link = linkByWsId[wp.id] || null;
      const projectNumber = link?.projectNumber || wp.fortnoxProjectNumber || null;

      // Find time/driving entries by projectNumber
      const timeEntries = projectNumber
        ? allProjectTime.filter(t => t.projectNumber === projectNumber)
        : [];
      const drivingEntries = projectNumber
        ? allDriving.filter(d => d.projectNumber === projectNumber)
        : [];

      const isSynced = timeEntries.length > 0 || drivingEntries.length > 0;

      const allDates = [
        ...timeEntries.map(t => t.date),
        ...drivingEntries.map(d => d.date),
      ].filter(Boolean).sort().reverse();
      const lastActive = allDates[0] || '';

      return { wsProject: wp, timeEntries, drivingEntries, link, projectNumber, isSynced, lastActive };
    });
  }, [wsProjects, allProjectTime, allDriving, linkByWsId]);

  // Summary KPIs
  const syncedCount = projectEntries.filter(p => p.isSynced).length;
  const unsyncedCount = projectEntries.length - syncedCount;
  const totalHours = allProjectTime.reduce((s, t) => s + (t.hours || 0), 0);
  const totalKm = allDriving.reduce((s, d) => s + (d.distanceKm || 0), 0);

  const handleSync = async (projectNumber, wsProjectId) => {
    setSyncingId(wsProjectId);
    try {
      await fetch('https://medarbetarappen-7890a865.base44.app/functions/syncProjectToLager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fortnoxProjectNumber: projectNumber, wsProjectId })
      });
      refetchTime();
      refetchDriving();
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    setSyncStatus(null);
    let count = 0;
    for (const link of allLinks) {
      if (link.projectNumber && link.wsProjectId) {
        await fetch('https://medarbetarappen-7890a865.base44.app/functions/syncProjectToLager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fortnoxProjectNumber: link.projectNumber, wsProjectId: link.wsProjectId })
        });
        count++;
      }
    }
    setSyncingAll(false);
    setSyncStatus(`✓ Synkade ${count} projekt`);
    refetchTime();
    refetchDriving();
    setTimeout(() => setSyncStatus(null), 4000);
  };

  const filtered = useMemo(() => {
    let list = [...projectEntries];

    if (filterTab === 'synkade') list = list.filter(p => p.isSynced);
    else if (filterTab === 'ej_synkade') list = list.filter(p => !p.isSynced);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.wsProject.name || '').toLowerCase().includes(q) ||
        (p.projectNumber || '').toLowerCase().includes(q) ||
        (p.wsProject.id || '').toLowerCase().includes(q)
      );
    }

    // Sort: synced (most recent first), then unsynced
    list.sort((a, b) => {
      if (a.isSynced && !b.isSynced) return -1;
      if (!a.isSynced && b.isSynced) return 1;
      return (b.lastActive || '').localeCompare(a.lastActive || '');
    });

    return list;
  }, [projectEntries, filterTab, search]);

  const tabs = [
    { key: 'alla', label: `Alla (${projectEntries.length})` },
    { key: 'synkade', label: `Synkade (${syncedCount})` },
    { key: 'ej_synkade', label: `Ej synkade (${unsyncedCount})` },
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Workspace Projekt</h1>
            <p className="text-sm text-gray-400 mt-0.5">Alla projekt från IM Workspace</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {syncStatus && (
              <span className="text-sm text-green-400">{syncStatus}</span>
            )}
            <Button
              onClick={handleSyncAll}
              disabled={syncingAll || allLinks.length === 0}
              variant="outline"
              className="border-indigo-600/50 text-indigo-300 hover:bg-indigo-600/20 gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} />
              {syncingAll ? 'Synkar...' : `Synka alla länkade (${allLinks.length})`}
            </Button>
            <Button onClick={refetch} disabled={isFetching} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Uppdatera
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Workspace-projekt" value={projectEntries.length} color="text-white" />
          <SummaryCard label="Synkade" value={syncedCount} color="text-green-400" />
          <SummaryCard label="Ej synkade" value={unsyncedCount} color="text-yellow-400" warn={unsyncedCount > 0} />
          <SummaryCard label="Total arbetstid" value={`${totalHours.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} h`} color="text-blue-400" />
        </div>

        {/* Filter tabs + search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-700 overflow-hidden">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  filterTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Input
            placeholder="Sök projektnr eller namn..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 w-60"
          />
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
                key={p.wsProject.id}
                wsProject={p.wsProject}
                timeEntries={p.timeEntries}
                drivingEntries={p.drivingEntries}
                link={p.link}
                onSync={handleSync}
                syncing={syncingId === p.wsProject.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}