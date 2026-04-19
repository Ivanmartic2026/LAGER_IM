import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertCircle, Loader2, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function MigrationCenter() {
  const [currentStep, setCurrentStep] = useState(1);
  const [queueEntries, setQueueEntries] = useState([]);
  const [migrationRuns, setMigrationRuns] = useState([]);
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const entries = await base44.entities.MergeApprovalQueue.list();
      const runs = await base44.entities.MigrationRun.list('-created_date', 20);
      setQueueEntries(entries);
      setMigrationRuns(runs);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleFindDuplicates = async () => {
    try {
      const result = await base44.functions.invoke('findDuplicateCandidates', {});
      alert(`Hittade ${result.data.candidate_groups_found} dublettgrupper — ${result.data.queue_entries_created} köposter skapade`);
      await loadData();
      setCurrentStep(2);
    } catch (error) {
      alert('Fel: ' + error.message);
    }
  };

  const handleApproveMerge = async (queueId, winnerId) => {
    if (!window.confirm('Detta kommer att slå ihop poster. Kan rullas tillbaka. Fortsätta?')) return;
    try {
      const result = await base44.functions.invoke('approveMerge', { 
        queue_entry_id: queueId, 
        winner_id: winnerId 
      });
      alert(`Merge slutförd. ${result.data.references_updated} referenser uppdaterade.`);
      await loadData();
    } catch (error) {
      alert('Fel: ' + error.message);
    }
  };

  const handleRejectMerge = async (queueId) => {
    try {
      await base44.functions.invoke('rejectMerge', { queue_entry_id: queueId });
      alert('Markerad som "behålls separat"');
      await loadData();
    } catch (error) {
      alert('Fel: ' + error.message);
    }
  };

  const handleSkipMerge = async (queueId) => {
    try {
      await base44.functions.invoke('skipMerge', { queue_entry_id: queueId });
      alert('Hoppat över');
      await loadData();
    } catch (error) {
      alert('Fel: ' + error.message);
    }
  };

  const handleRollbackMerge = async (queueId) => {
    if (!window.confirm('Rulla tillbaka denna merge?')) return;
    try {
      const result = await base44.functions.invoke('rollbackMerge', { 
        queue_entry_id: queueId 
      });
      alert(`Rollback slutförd. ${result.data.records_restored} poster återställda.`);
      await loadData();
    } catch (error) {
      alert('Fel: ' + error.message);
    }
  };

  const handleStartMigration = async () => {
    setShowConfirm(false);
    setIsRunning(true);
    setProgress([]);

    try {
      const result = await base44.functions.invoke('runFullMigration', {});
      setProgress([
        { step: 'Migrering slutförd', status: 'success', details: result.data }
      ]);
      await loadData();
      setCurrentStep(4);
    } catch (error) {
      setProgress([
        { step: 'Migrering misslyckades', status: 'error', details: error.message }
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRollbackMigration = async (migrationRunId) => {
    if (!window.confirm('Rulla tillbaka denna migration? Alla ändringar reverseras.')) return;
    try {
      const result = await base44.functions.invoke('rollbackMigration', { 
        migration_run_id: migrationRunId 
      });
      alert(`Rollback slutförd. ${result.data.records_restored} poster återställda, ${result.data.records_deleted} poster raderade.`);
      await loadData();
    } catch (error) {
      alert('Fel: ' + error.message);
    }
  };

  const pendingCount = queueEntries.filter(e => e.status === 'pending_review').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🔧 Migration Center</h1>
          <p className="text-slate-400">Unified Scanning Architecture + Safety Patch</p>
        </div>

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-yellow-300 font-semibold mb-1">⚠️ Admin Only</h3>
              <p className="text-yellow-200 text-sm">
                Denna migrering påverkar ALL batch- och artikel-data. Alla ändringar kan rullas tillbaka.
              </p>
            </div>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          {[
            { num: 1, label: 'Förberedelse' },
            { num: 2, label: 'Granska dubletter' },
            { num: 3, label: 'Datamigration' },
            { num: 4, label: 'Historik' }
          ].map(s => (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${
                currentStep === s.num
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <div className="text-xs">Steg {s.num}</div>
              <div className="text-xs mt-1">{s.label}</div>
            </button>
          ))}
        </div>

        {/* Content */}
        {currentStep === 1 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-white">Steg 1: Förberedelse</h2>
            <p className="text-slate-400">
              Steg 1 söker efter dublett-kandidater (artiklar med samma batchnummer eller batcher med samma artikel+batchnummer-kombination).
            </p>
            <Button
              onClick={handleFindDuplicates}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base"
            >
              Hitta dublett-kandidater
            </Button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-white mb-2">Steg 2: Granska dubletter</h2>
              <p className="text-slate-400 text-sm">
                {pendingCount === 0 ? 'Inga väntande dublett-granskningar.' : `${pendingCount} dublett-grupper väntar på godkännande.`}
              </p>
            </div>

            {pendingCount > 0 && (
              <div className="space-y-3">
                {queueEntries.filter(e => e.status === 'pending_review').map(entry => (
                  <div key={entry.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{entry.candidate_entity} — {entry.similarity_key}</p>
                        <p className="text-slate-400 text-sm">{entry.candidate_ids.length} kandidater</p>
                      </div>
                      <button
                        onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        {expandedEntry === entry.id ? <ChevronUp /> : <ChevronDown />}
                      </button>
                    </div>

                    {expandedEntry === entry.id && (
                      <div className="bg-slate-900 rounded-lg p-4 text-xs space-y-3 max-h-64 overflow-y-auto">
                        <div>
                          <p className="text-slate-300 font-semibold mb-2">Coupling counts:</p>
                          {Object.entries(entry.coupling_counts || {}).map(([id, count]) => (
                            <p key={id} className="text-slate-400 ml-3">
                              {id.slice(0, 8)}: <span className="text-yellow-400">{count}</span> kopplingar
                            </p>
                          ))}
                        </div>

                        {Object.keys(entry.fields_diff || {}).length > 0 && (
                          <div>
                            <p className="text-slate-300 font-semibold mb-2">Fältskillnader:</p>
                            {Object.entries(entry.fields_diff).map(([field, values]) => (
                              <p key={field} className="text-yellow-400 ml-3">
                                <strong>{field}:</strong> {Object.entries(values).map(([id, v]) => 
                                  `${id.slice(0, 4)}=${JSON.stringify(v).slice(0, 20)}`
                                ).join(' vs ')}
                              </p>
                            ))}
                          </div>
                        )}

                        {entry.coupling_breakdown && (
                          <div>
                            <p className="text-slate-300 font-semibold mb-2">Breakdown:</p>
                            {Object.entries(entry.coupling_breakdown).map(([id, breakdown]) => (
                              <p key={id} className="text-slate-400 ml-3 text-xs">
                                {id.slice(0, 8)}: PO={breakdown.po_items} Recv={breakdown.receiving} Repairs={breakdown.repairs} Orders={breakdown.orders}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {entry.candidate_ids.map(id => (
                        <Button
                          key={id}
                          onClick={() => handleApproveMerge(entry.id, id)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                        >
                          ✓ {id.slice(0, 8)} vinnare
                        </Button>
                      ))}
                      <Button
                        onClick={() => handleRejectMerge(entry.id)}
                        variant="outline"
                        className="text-slate-300 border-slate-500 hover:bg-slate-700 text-xs px-3 py-1"
                      >
                        Behåll separat
                      </Button>
                      <Button
                        onClick={() => handleSkipMerge(entry.id)}
                        variant="ghost"
                        className="text-slate-400 hover:text-white text-xs px-3 py-1"
                      >
                        Hoppa över
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-white mb-4">Steg 3: Datamigration</h2>
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={isRunning}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base w-full"
              >
                {isRunning ? 'Kör migration...' : 'Starta migration'}
              </Button>
            </div>

            {progress.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Kör migration...
                    </>
                  ) : progress[0]?.status === 'success' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Migrering slutförd
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      Migrering misslyckades
                    </>
                  )}
                </h3>
                {progress.map((p, i) => (
                  <div key={i} className="text-sm text-slate-300 border-l-2 border-slate-600 pl-3">
                    {p.step}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-white mb-4">Steg 4: Migrerings-historik</h2>
              {migrationRuns.length === 0 ? (
                <p className="text-slate-400 text-sm">Inga migrerings-körningar än.</p>
              ) : (
                <div className="space-y-3">
                  {migrationRuns.map(run => (
                    <div key={run.id} className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{run.migration_name}</p>
                        <p className="text-slate-400 text-xs">{new Date(run.run_date).toLocaleString('sv-SE')}</p>
                        {run.rolled_back && <p className="text-red-400 text-xs">✓ Rulladbak</p>}
                      </div>
                      {run.rollback_available && !run.rolled_back && (
                        <Button
                          onClick={() => handleRollbackMigration(run.id)}
                          variant="outline"
                          className="text-red-400 border-red-700 hover:bg-red-900 text-xs"
                        >
                          Rulla tillbaka
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Merge approval queue history */}
            {queueEntries.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Merge-godkännande-historik</h2>
                <div className="space-y-2 text-sm">
                  {queueEntries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between bg-slate-700/30 p-3 rounded">
                      <div>
                        <p className="text-white">{entry.candidate_entity} — {entry.status}</p>
                        <p className="text-slate-400 text-xs">{entry.candidate_ids.length} kandidater</p>
                      </div>
                      {entry.status === 'approved_merge' && entry.merge_executed && (
                        <div className="flex gap-2">
                          <span className="text-green-400 text-xs">✓ Merged</span>
                          <Button
                            onClick={() => handleRollbackMerge(entry.id)}
                            variant="outline"
                            className="text-red-400 border-red-700 text-xs px-2 py-1 h-auto"
                          >
                            Rulla tillbaka
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Bekräfta datamigration</DialogTitle>
            <DialogDescription className="text-slate-400">
              Denna operation kommer att:
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Migrera Article.batch_number → Batch-entity</li>
                <li>Länka RepairLog, ReceivingRecord, ProductionRecord, SiteReport → Batch</li>
                <li>Konvertera legacy image_urls → LabelScan</li>
                <li>Ta bort TEST-* batches</li>
              </ul>
              <p className="mt-3 font-semibold text-yellow-300">Kan rullas tillbaka när som helst.</p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="bg-slate-700 text-white hover:bg-slate-600"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleStartMigration}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Starta migration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}