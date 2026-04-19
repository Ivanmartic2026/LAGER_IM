import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';

export default function MigrationCenter() {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState([]);
  const [migrationRun, setMigrationRun] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);

  const runMigration = async () => {
    setIsRunning(true);
    setError(null);
    setSteps([]);

    try {
      const response = await base44.functions.invoke('runFullMigration', {});
      const result = response.data;

      setSteps(result.steps || []);
      setMigrationRun(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStartMigration = () => {
    setShowConfirm(false);
    runMigration();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🔧 Migration Center</h1>
          <p className="text-slate-400">Unified Scanning Architecture Migration</p>
        </div>

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-yellow-300 font-semibold mb-1">⚠️ Admin Only</h3>
              <p className="text-yellow-200 text-sm">
                Denna migrering kräver admin-behörighet och påverkar ALL batch- och artikel-data i systemet.
              </p>
            </div>
          </div>
        </div>

        {/* Migration Steps Info */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Migrerings-steg</h2>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold min-w-fit">1.</span>
              <span>Migrera Article.batch_number → Batch-entity</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold min-w-fit">2.</span>
              <span>Sammanslå batch-dubletter (samma batch_number, olika artikel)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold min-w-fit">3.</span>
              <span>Länka RepairLog → Batch</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold min-w-fit">4.</span>
              <span>Konvertera ReceivingRecord.image_urls → LabelScan</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold min-w-fit">5.</span>
              <span>Länka SiteReportImage → Batch via artikel</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold min-w-fit">6.</span>
              <span>Fyll ProductionRecord.serial_number</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold min-w-fit">7.</span>
              <span>Ta bort TEST-* batches</span>
            </div>
          </div>
        </div>

        {/* Run Button */}
        <div className="mb-6">
          {!isRunning && !migrationRun && (
            <Button
              onClick={() => setShowConfirm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-semibold"
            >
              Starta migrering
            </Button>
          )}

          {isRunning && (
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span>Migreringen är igång...</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-300 font-semibold mb-1">Fel vid migrering</h3>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {migrationRun && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Migrering slutförd
              </h2>
              <p className="text-slate-400">
                Körda: {migrationRun.total_steps} steg på {migrationRun.duration_ms}ms
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {steps.map((step, idx) => (
                <div key={idx} className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">{idx + 1}. {step.name}</h3>
                      <pre className="text-xs text-slate-300 mt-1 bg-slate-900 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(step.result, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => window.location.reload()}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg"
              >
                Uppdatera sida
              </Button>
              <Button
                onClick={() => {
                  setMigrationRun(null);
                  setSteps([]);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Kör igen
              </Button>
            </div>
          </div>
        )}

        {/* Migration History */}
        {!migrationRun && (
          <MigrationHistory />
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Bekräfta migrering</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Denna operation kommer att:
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Migrera 369 artiklar till Batch-entity</li>
                <li>Sammanslå batch-dubletter (kan ta flera minuter)</li>
                <li>Uppdatera alla kopplingar (PO, RepairLog, SiteReport, etc)</li>
                <li>Ta bort TEST-* batches</li>
              </ul>
              <p className="mt-3 font-semibold text-yellow-300">Ingen data raderas förutom test-batches.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600">
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStartMigration}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Starta migrering
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MigrationHistory() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await base44.entities.MigrationRun.list('-created_date', 10);
        setRuns(result || []);
      } catch (e) {
        console.error('Failed to fetch migration history:', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Inga migrerings-körningar ännu</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Migrerings-historik</h2>
      <div className="space-y-3">
        {runs.map((run) => (
          <div key={run.id} className="bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">
                  {run.status === 'completed' ? '✓' : '⚠️'} {new Date(run.run_date).toLocaleString('sv-SE')}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Av: {run.ran_by} | Steg: {Object.keys(run.steps_json || {}).length}
                </p>
              </div>
              <span className={`px-3 py-1 rounded text-xs font-semibold ${
                run.status === 'completed'
                  ? 'bg-green-500/20 text-green-300'
                  : run.status === 'running'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-red-500/20 text-red-300'
              }`}>
                {run.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}