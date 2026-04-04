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
  const [linkResult, setLinkResult] = useState(null); // null | 'linked' | 'created' | 'error'
  const [linkedName, setLinkedName] = useState('');
  const [syncStatus, setSyncStatus] = useState(null);
  const [linkedWsProjectId, setLinkedWsProjectId] = useState('');
  const queryClient = useQueryClient();

  // Fetch time entries
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['projectTime', project.projectNumber],
    queryFn: () => base44.entities.ProjectTime.filter({ projectNumber: project.projectNumber }),
  });

  // Fetch driving expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['projectExpenses', project.projectNumber],
    queryFn: () => base44.entities.ProjectExpense.filter({ projectNumber: project.projectNumber }),
  });

  const totalHours = timeEntries.reduce((sum, t) => sum + (t.hours || 0), 0);
  const totalExpenseCost = expenses.reduce((sum, e) => sum + (e.costSEK || 0), 0);

  const handleLoggaTidSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['projectTime', project.projectNumber] });
    queryClient.invalidateQueries({ queryKey: ['projectFinancials'] });
    setShowLoggaTid(false);
  };


  const openLinkModal = async () => {
    setShowLinkModal(true);
    setWsLoading(true);
    setLinkResult(null);
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
    } catch(e) { setSyncStatus('error'); }
  };

  const linkToExisting = async (wp) => {
    try {
      await fetch('https://medarbetarappen-7890a865.base44.app/functions/linkProjectToLager', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ workspaceProjectId: wp.id, fortnoxProjectNumber: project.projectNumber, name: wp.name })
      });
      setLinkedName(wp.name);
      setLinkResult('linked');
      setLinkedWsProjectId(wp.id);
      setShowLinkModal(false);
      fetch('https://medarbetarappen-7890a865.base44.app/functions/syncProjectToLager', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ fortnoxProjectNumber: project.projectNumber, wsProjectId: wp.id })
      });
    } catch(e) { setLinkResult('error'); }
  };

  const createInWorkspace = async () => {
    try {
      const res = await fetch('https://medarbetarappen-7890a865.base44.app/functions/createProjectFromLager', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ fortnoxProjectNumber: project.projectNumber, name: project.description || project.projectNumber, description: project.description || '' })
      });
      const data = await res.json();
      setLinkedName(project.description || project.projectNumber);
      setLinkResult('created');
      setShowLinkModal(false);
      fetch('https://medarbetarappen-7890a865.base44.app/functions/syncProjectToLager', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ fortnoxProjectNumber: project.projectNumber, wsProjectId: data.id })
      });
    } catch(e) { setLinkResult('error'); }
  };

  return (
    <>
      <tr className="bg-white/[0.02] border-b border-white/5">
        <td colSpan={11} className="px-3 py-4">
          <div className="space-y-6">
    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-600">IM Workspace:</span>
        {!linkResult && (
          <button onClick={openLinkModal} className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            🔗 Länka projekt till Workspace
          </button>
        )}
        {linkResult === 'linked' && <span className="text-sm text-green-600 font-medium">✓ Länkat till: {linkedName}</span>}
        {linkResult === 'created' && <span className="text-sm text-green-600 font-medium">✓ Skapat i Workspace: {linkedName}</span>}
        {(linkResult === 'linked' || linkResult === 'created') && (
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
        )}
        {linkResult === 'error' && (
          <><span className="text-sm text-red-500">Fel — försök igen</span>
          <button onClick={openLinkModal} className="text-sm text-blue-600 underline ml-2">Försök igen</button></>
        )}
      </div>
      {showLinkModal && (
        <div className="mt-3 border border-gray-200 rounded bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Välj ett Workspace-projekt att länka:</span>
            <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕ Stäng</button>
          </div>
          {wsLoading && <p className="text-sm text-gray-500">Hämtar projekt...</p>}
          {!wsLoading && wsProjects.length === 0 && <p className="text-sm text-gray-400 italic">Inga Workspace-projekt hittades</p>}
          {!wsLoading && wsProjects.map(wp => (
            <div key={wp.id} onClick={() => linkToExisting(wp)}
              className="flex items-center justify-between px-3 py-2 rounded hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0">
              <span className="text-sm font-medium">{wp.name}</span>
              {wp.fortnoxProjectNumber && <span className="text-xs text-gray-400">#{wp.fortnoxProjectNumber}</span>}
            </div>
          ))}
          <button onClick={createInWorkspace}
            className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700">
            ➕ Skapa nytt projekt i Workspace
          </button>
        </div>
      )}
    </div>
            {/* Invoices section - kept for reference but can be hidden if not needed */}
            <div className="grid grid-cols-2 gap-6">
              {/* Customer invoices */}
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

              {/* Supplier invoices */}
              {project.supplierInvoices?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-white/70 uppercase mb-3 tracking-wider">Leverantörsfakturor</h4>
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
                        {project.supplierInvoices.map((inv, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/[0.05] cursor-pointer" onClick={() => onInvoiceClick(inv, 'supplier', project)}>
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
            </div>

            {/* Tidslogg section */}
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

            {/* Resekostnader section */}
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