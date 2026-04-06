import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import LoggaTidModal from './LoggaTidModal';

export default function ExpandedRow({ project, onInvoiceClick }) {
  const [showLoggaTid, setShowLoggaTid] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [wsProjects, setWsProjects] = useState([]);
  const [wsLoading, setWsLoading] = useState(false);
  const [wsSearch, setWsSearch] = useState('');
  const [syncStatus, setSyncStatus] = useState(null);
  const queryClient = useQueryClient();

  // Load persisted link from DB
  const { data: projectLink, refetch: refetchLink } = useQuery({
    queryKey: ['projectLink', project.projectNumber],
    queryFn: async () => {
      const results = await base44.entities.ProjectLink.filter({ projectNumber: project.projectNumber });
      return results?.[0] || null;
    },
    staleTime: 0,
    gcTime: 0,
  });

  const linkedWsProjectId = projectLink?.wsProjectId || '';
  const linkedName = projectLink?.wsProjectName || '';
  const linkResult = projectLink ? 'linked' : null;

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['projectTime', project.projectNumber],
    queryFn: () => base44.entities.ProjectTime.filter({ projectNumber: project.projectNumber }),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['projectExpenses', project.projectNumber],
    queryFn: () => base44.entities.ProjectExpense.filter({ projectNumber: project.projectNumber }),
  });

  const { data: drivingEntries = [] } = useQuery({
    queryKey: ['drivingJournal', project.projectNumber],
    queryFn: () => base44.entities.DrivingJournalEntry.filter({ projectNumber: project.projectNumber }),
    staleTime: 0,
  });

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

  const totalHours = timeEntries.reduce((sum, t) => sum + (t.hours || 0), 0);
  const totalExpenseCost = expenses.reduce((sum, e) => sum + (e.costSEK || 0), 0);
  const totalKm = drivingEntries.reduce((sum, d) => sum + (d.distanceKm || 0), 0);

  const handleLoggaTidSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['projectTime', project.projectNumber] });
    queryClient.invalidateQueries({ queryKey: ['projectFinancials'] });
    setShowLoggaTid(false);
  };

  const openLinkModal = async () => {
    setShowLinkModal(true);
    setWsLoading(true);
    setWsSearch('');
    try {
      const res = await fetch('https://medarbetarappen-7890a865.base44.app/functions/listWorkspaceProjects');
      const data = await res.json();
      setWsProjects(data.projects || []);
    } catch(e) { setWsProjects([]); }
    setWsLoading(false);
  };

  const syncFromWorkspace = async () => {
    setSyncStatus('syncing');
    try {
      const res = await fetch('https://medarbetarappen-7890a865.base44.app/functions/syncProjectToLager', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ fortnoxProjectNumber: project.projectNumber, wsProjectId: linkedWsProjectId })
      });
      const data = await res.json();
      setSyncStatus(`synced:${data.timesSynced || 0}:${data.drivingSynced || 0}`);
      await queryClient.invalidateQueries({ queryKey: ['projectTime', project.projectNumber] });
      await queryClient.refetchQueries({ queryKey: ['projectTime', project.projectNumber] });
      await queryClient.invalidateQueries({ queryKey: ['drivingJournal', project.projectNumber] });
      await queryClient.refetchQueries({ queryKey: ['drivingJournal', project.projectNumber] });
      await queryClient.invalidateQueries({ queryKey: ['projectExpenses', project.projectNumber] });
      await queryClient.refetchQueries({ queryKey: ['projectExpenses', project.projectNumber] });
    } catch(e) { setSyncStatus('error'); }
  };

  const saveLink = async (wsProjectId, wsProjectName) => {
    if (projectLink?.id) {
      await base44.entities.ProjectLink.update(projectLink.id, { wsProjectId, wsProjectName });
    } else {
      await base44.entities.ProjectLink.create({ projectNumber: project.projectNumber, wsProjectId, wsProjectName });
    }
    await refetchLink();
  };

  const linkToExisting = async (wp) => {
    try {
      await fetch('https://medarbetarappen-7890a865.base44.app/functions/linkProjectToLager', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ workspaceProjectId: wp.id, fortnoxProjectNumber: project.projectNumber, name: wp.name })
      });
      await saveLink(wp.id, wp.name);
      setShowLinkModal(false);
      fetch('https://medarbetarappen-7890a865.base44.app/functions/syncProjectToLager', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ fortnoxProjectNumber: project.projectNumber, wsProjectId: wp.id })
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['projectTime', project.projectNumber] });
        queryClient.invalidateQueries({ queryKey: ['drivingJournal', project.projectNumber] });
        queryClient.invalidateQueries({ queryKey: ['projectExpenses', project.projectNumber] });
      });
    } catch(e) { /* silent */ }
  };

  const createInWorkspace = async () => {
    try {
      const name = project.description || project.projectNumber;
      const res = await fetch('https://medarbetarappen-7890a865.base44.app/functions/createProjectFromLager', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ fortnoxProjectNumber: project.projectNumber, name, description: project.description || '' })
      });
      const data = await res.json();
      await saveLink(data.id, name);
      setShowLinkModal(false);
      fetch('https://medarbetarappen-7890a865.base44.app/functions/syncProjectToLager', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ fortnoxProjectNumber: project.projectNumber, wsProjectId: data.id })
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['projectTime', project.projectNumber] });
        queryClient.invalidateQueries({ queryKey: ['drivingJournal', project.projectNumber] });
        queryClient.invalidateQueries({ queryKey: ['projectExpenses', project.projectNumber] });
      });
    } catch(e) { /* silent */ }
  };

  return (
    <>
      <tr className="bg-white/[0.02] border-b border-white/5">
        <td colSpan={11} className="px-3 py-4">
          <div className="space-y-6">

            {/* IM Workspace link section */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-gray-600">IM Workspace:</span>
                {!linkResult && (
                  <button onClick={openLinkModal} className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    🔗 Länka projekt till Workspace
                  </button>
                )}
                {linkResult === 'linked' && (
                  <>
                    <span className="text-sm text-green-600 font-medium">✓ Länkat till: {linkedName}</span>
                    <button onClick={openLinkModal} className="text-xs text-gray-400 underline hover:text-gray-600">Byt</button>
                    <button
                      onClick={syncFromWorkspace}
                      disabled={syncStatus === 'syncing'}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {syncStatus === 'syncing' ? 'Synkar...' :
                       syncStatus?.startsWith('synced:') ? `✓ Synkat! ${syncStatus.split(':')[1]} tider, ${syncStatus.split(':')[2]} resor` :
                       syncStatus === 'error' ? 'Fel vid synk' :
                       '🔄 Synka från Workspace'}
                    </button>
                  </>
                )}
              </div>
              {showLinkModal && (
                <div className="mt-3 border border-gray-200 rounded bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Välj ett Workspace-projekt att länka:</span>
                    <button onClick={() => { setShowLinkModal(false); setWsSearch(''); }} className="text-gray-400 hover:text-gray-600 text-xs">✕ Stäng</button>
                  </div>
                  {wsLoading && <p className="text-sm text-gray-500">Hämtar projekt...</p>}
                  {!wsLoading && (
                    <input
                      type="text"
                      autoFocus
                      placeholder="Sök projekt..."
                      value={wsSearch}
                      onChange={e => setWsSearch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  )}
                  {!wsLoading && wsProjects.length === 0 && <p className="text-sm text-gray-400 italic">Inga Workspace-projekt hittades</p>}
                  {!wsLoading && (() => {
                    const q = wsSearch.toLowerCase();
                    const filtered = wsProjects.filter(wp =>
                      wp.name?.toLowerCase().includes(q) ||
                      wp.id?.toLowerCase().includes(q) ||
                      wp.fortnoxProjectNumber?.toLowerCase().includes(q)
                    );
                    if (wsProjects.length > 0 && filtered.length === 0) {
                      return <p className="text-sm text-gray-400 italic">Inga resultat</p>;
                    }
                    return filtered.map(wp => (
                      <div key={wp.id} onClick={() => linkToExisting(wp)}
                        className="flex items-center justify-between px-3 py-2 rounded hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0">
                        <span className="text-sm font-medium">{wp.name}</span>
                        {wp.fortnoxProjectNumber && <span className="text-xs text-gray-400">#{wp.fortnoxProjectNumber}</span>}
                      </div>
                    ));
                  })()}
                  <button onClick={createInWorkspace}
                    className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                    ➕ Skapa nytt projekt i Workspace
                  </button>
                </div>
              )}
            </div>

            {/* Invoices */}
            <div className="grid grid-cols-2 gap-6">
              {project.customerInvoices?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-white/70 uppercase mb-3 tracking-wider">Kundfakturor</h4>
                  <div className="overflow-x-auto rounded border border-white/10">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40">
                          <th className="text-left px-2 py-2">Nr</th>
                          <th className="text-left px-2 py-2">Datum</th>
                          <th className="text-right px-2 py-2">Belopp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.customerInvoices.map((inv, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/[0.05] cursor-pointer" onClick={() => onInvoiceClick(inv, 'customer', project)}>
                            <td className="px-2 py-1.5 font-mono text-white/60">{inv.invoiceNumber}</td>
                            <td className="px-2 py-1.5 text-white/60">{inv.invoiceDate}</td>
                            <td className="px-2 py-1.5 text-right text-white/70">{inv.total?.toLocaleString('sv-SE')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {project.supplierInvoices?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-white/70 uppercase mb-3 tracking-wider">Leverantörsfakturor</h4>
                  <div className="overflow-x-auto rounded border border-white/10">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40">
                          <th className="text-left px-2 py-2">Nr</th>
                          <th className="text-left px-2 py-2">Leverantör</th>
                          <th className="text-left px-2 py-2">Datum</th>
                          <th className="text-left px-2 py-2">Förfallodatum</th>
                          <th className="text-right px-2 py-2">Belopp</th>
                          <th className="text-left px-2 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.supplierInvoices.map((inv, i) => {
                          const today = new Date().toISOString().split('T')[0];
                          const isPaid = inv.balance === 0;
                          const isOverdue = inv.balance > 0 && inv.dueDate && inv.dueDate < today;
                          return (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.05] cursor-pointer" onClick={() => onInvoiceClick(inv, 'supplier', project)}>
                              <td className="px-2 py-1.5 font-mono text-white/60">{inv.invoiceNumber}</td>
                              <td className="px-2 py-1.5 text-white/80">{inv.supplierName || '–'}</td>
                              <td className="px-2 py-1.5 text-white/60">{inv.invoiceDate || '–'}</td>
                              <td className="px-2 py-1.5 text-white/60">{inv.dueDate || '–'}</td>
                              <td className="px-2 py-1.5 text-right text-white/70">{inv.total?.toLocaleString('sv-SE')}</td>
                              <td className="px-2 py-1.5">
                                {isPaid
                                  ? <span className="text-green-400 text-xs">Betald</span>
                                  : isOverdue
                                    ? <span className="text-red-400 text-xs">Förfallen</span>
                                    : <span className="text-orange-400 text-xs">Obetald</span>
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Tidslogg */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Tidslogg ({totalHours}h totalt)</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLoggaTid(true)}
                  className="text-xs border-white/20 text-white/60 bg-white/5 hover:bg-white/10 hover:text-white h-7 px-2 gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Logga tid
                </Button>
              </div>
              {timeEntries.length > 0 ? (
                <div className="overflow-x-auto rounded border border-white/10">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40">
                        <th className="text-left px-2 py-2">Datum</th>
                        <th className="text-left px-2 py-2">Rapportör</th>
                        <th className="text-right px-2 py-2">Timmar</th>
                        <th className="text-left px-2 py-2">Beskrivning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeEntries.map((t, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.05]">
                          <td className="px-2 py-1.5 text-white/70 font-mono">{t.date}</td>
                          <td className="px-2 py-1.5 text-white/60">{t.reporter || '–'}</td>
                          <td className="px-2 py-1.5 text-right text-white/70 font-semibold">{t.hours}</td>
                          <td className="px-2 py-1.5 text-white/60 max-w-[300px] truncate">{t.description || '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-white/30 italic py-4">Ingen tidslogg registrerad</p>
              )}
            </div>

            {/* Körjournal */}
            <div>
              <h4 className="text-xs font-semibold text-white/70 uppercase mb-3 tracking-wider">
                Körjournal ({drivingEntries.length} resor, {totalKm.toLocaleString('sv-SE')} km totalt)
              </h4>
              {drivingEntries.length > 0 ? (
                <div className="overflow-x-auto rounded border border-white/10">
      <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40">
                        <th className="text-left px-2 py-2">Datum</th>
                        <th className="text-left px-2 py-2">Starttid</th>
                        <th className="text-left px-2 py-2">Stopptid</th>
                        <th className="text-left px-2 py-2">Körtid</th>
                        <th className="text-left px-2 py-2">Förare</th>
                        <th className="text-left px-2 py-2">Från (adress)</th>
                        <th className="text-left px-2 py-2">Till (adress)</th>
                        <th className="text-right px-2 py-2">Km</th>
                        <th className="text-left px-2 py-2">Syfte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drivingEntries.map((d, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.05]">
                          <td className="px-2 py-1.5 text-white/70 font-mono">{d.date}</td>
                          <td className="px-2 py-1.5 text-white/60 font-mono">{d.startTime ? d.startTime.slice(11, 16) : '–'}</td>
                          <td className="px-2 py-1.5 text-white/60 font-mono">{d.endTime ? d.endTime.slice(11, 16) : '–'}</td>
                          <td className="px-2 py-1.5 text-blue-400 font-medium">{formatDuration(d.startTime, d.endTime)}</td>
                          <td className="px-2 py-1.5 text-white/60">{d.driverName || '–'}</td>
                          <td className="px-2 py-1.5 text-white/60 max-w-[180px] truncate">{d.fromAddress || d.fromLocation || '–'}</td>
                          <td className="px-2 py-1.5 text-white/60 max-w-[180px] truncate">{d.toAddress || d.toLocation || '–'}</td>
                          <td className="px-2 py-1.5 text-right text-white/70 font-semibold">{d.distanceKm || '–'}</td>
                          <td className="px-2 py-1.5 text-white/60 max-w-[150px] truncate">{d.purpose || d.description || '–'}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-white/20 bg-white/[0.05] font-semibold">
                        <td colSpan={3} className="px-2 py-2 text-white/40 text-xs">Totalt</td>
                        <td colSpan={5} className="px-2 py-2 text-blue-400 font-mono text-sm">
                          {(() => {
                            const totalMin = drivingEntries.reduce((sum, d) => {
                              if (!d.startTime || !d.endTime) return sum;
                              const diff = new Date(d.endTime) - new Date(d.startTime);
                              return diff > 0 ? sum + Math.floor(diff / 60000) : sum;
                            }, 0);
                            const h = Math.floor(totalMin / 60);
                            const m = totalMin % 60;
                            const durationStr = totalMin === 0 ? '–' : (h > 0 ? `${h}h ${m}min` : `${m}min`);
                            return `${durationStr} | ${totalKm.toLocaleString('sv-SE')} km`;
                          })()}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-white/30 italic py-4">Ingen körjournal registrerad</p>
              )}
            </div>

            {/* Workspace Summering */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-700 pb-2 mb-4">WORKSPACE SUMMERING</h4>
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Total timmar', value: `${totalHours} h` },
                  { label: 'Total km körda', value: `${totalKm.toLocaleString('sv-SE')} km` },
                  { label: 'Antal resor', value: drivingEntries.length },
                  { label: 'Genomsnittlig resa', value: drivingEntries.length > 0 ? `${(totalKm / drivingEntries.length).toFixed(1)} km` : '0 km' },
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-4 text-center">
                    <div className="text-xs text-gray-400 uppercase mb-2">{stat.label}</div>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resekostnader */}
            <div>
              <h4 className="text-xs font-semibold text-white/70 uppercase mb-3 tracking-wider">Resekostnader ({totalExpenseCost.toLocaleString('sv-SE')} kr totalt)</h4>
              {expenses.length > 0 ? (
                <div className="overflow-x-auto rounded border border-white/10">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40">
                        <th className="text-left px-2 py-2">Datum</th>
                        <th className="text-left px-2 py-2">Förare</th>
                        <th className="text-left px-2 py-2">Fordon</th>
                        <th className="text-right px-2 py-2">Km</th>
                        <th className="text-right px-2 py-2">Kostnad kr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.05]">
                          <td className="px-2 py-1.5 text-white/70 font-mono">{e.date}</td>
                          <td className="px-2 py-1.5 text-white/60">{e.driverName || '–'}</td>
                          <td className="px-2 py-1.5 text-white/60">{e.vehicleReg || '–'}</td>
                          <td className="px-2 py-1.5 text-right text-white/70">{e.distanceKm || '–'}</td>
                          <td className="px-2 py-1.5 text-right text-white/70 font-semibold">{e.costSEK?.toLocaleString('sv-SE') || '–'}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-white/20 bg-white/[0.05] font-semibold">
                        <td colSpan={4} className="px-2 py-2 text-white/40 text-xs">Totalt</td>
                        <td className="px-2 py-2 text-right text-white">{totalExpenseCost.toLocaleString('sv-SE')} kr</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-white/30 italic py-4">Inga resekostnader registrerade</p>
              )}
            </div>

            {/* Full report button */}
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => { window.location.href = '/ProjectReport?projectNumber=' + project.projectNumber; }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-blue-200 font-medium transition-all text-sm"
              >
                📄 Öppna fullständig rapport
              </button>
            </div>

          </div>
        </td>
      </tr>

      {showLoggaTid && (
        <LoggaTidModal
          projectNumber={project.projectNumber}
          projectName={project.projectName}
          onClose={() => setShowLoggaTid(false)}
          onSuccess={handleLoggaTidSuccess}
        />
      )}
    </>
  );
}