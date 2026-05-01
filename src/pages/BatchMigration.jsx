import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, CheckCircle2, Loader2, RefreshCw, RotateCcw,
  ChevronDown, ChevronUp, Play, Eye, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import BatchMigrationCategoryTable from '@/components/migration/BatchMigrationCategoryTable';
import BatchMigrationSummaryCards from '@/components/migration/BatchMigrationSummaryCards';

const CATEGORY_LABELS = {
  AUTO_PLACEHOLDER: { label: 'Auto-placeholder', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  JUNK: { label: 'Skräpdata', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  REAL: { label: 'Verkliga', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  TRUE_DUPLICATE: { label: 'Sanna dubletter', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  FALSE_DUPLICATE: { label: 'Falska dubletter', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

export default function BatchMigration() {
  const [preview, setPreview] = useState(null);
  const [previewRun, setPreviewRun] = useState(null);
  const [migrationRuns, setMigrationRuns] = useState([]);
  const [reviewedCategories, setReviewedCategories] = useState(new Set());
  const [loadingDryRun, setLoadingDryRun] = useState(false);
  const [loadingExecute, setLoadingExecute] = useState(false);
  const [loadingRollback, setLoadingRollback] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');
  const [executeResult, setExecuteResult] = useState(null);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const runs = await base44.entities.MigrationRun.list('-created_date', 20);
      const allBatchRuns = runs.filter(r => r.migration_name === 'migrateArticleBatchNumbersToBatchEntity');
      setMigrationRuns(allBatchRuns);
      const pRun = allBatchRuns.find(r => r.input_summary?.mode === 'preview');
      if (pRun) {
        setPreviewRun(pRun);
        setPreview(pRun.input_summary);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDryRun = async () => {
    setLoadingDryRun(true);
    setReviewedCategories(new Set());
    try {
      const res = await base44.functions.invoke('migrateArticleBatchNumbersToBatchEntity', { mode: 'dry_run' });
      setPreview(res.data.summary);
      await loadRuns();
      setActiveTab('preview');
    } catch (e) {
      alert('Fel vid dry-run: ' + (e.message || 'Okänt fel'));
    } finally {
      setLoadingDryRun(false);
    }
  };

  const handleExecute = async () => {
    if (!previewRun) { alert('Kör dry-run först'); return; }
    if (!window.confirm('Detta skriver data för ~341 artiklar. Bekräfta för att köra migration!')) return;
    setLoadingExecute(true);
    setExecuteResult(null);
    try {
      const res = await base44.functions.invoke('migrateArticleBatchNumbersToBatchEntity', {
        mode: 'execute',
        migration_run_id: previewRun.id
      });
      setExecuteResult(res.data);
      await loadRuns();
      setActiveTab('history');
    } catch (e) {
      alert('Fel vid körning: ' + (e.message || 'Okänt fel'));
    } finally {
      setLoadingExecute(false);
    }
  };

  const handleRollback = async (runId) => {
    if (!window.confirm('Rulla tillbaka ALL migration från denna körning? Artiklar återställs, Batch-poster raderas.')) return;
    setLoadingRollback(runId);
    try {
      const res = await base44.functions.invoke('rollbackMigration', { migration_run_id: runId });
      alert(`Rollback klar — ${res.data.records_restored} artiklar återställda, ${res.data.records_deleted} batches raderade.`);
      await loadRuns();
    } catch (e) {
      alert('Fel vid rollback: ' + (e.message || 'Okänt fel'));
    } finally {
      setLoadingRollback(null);
    }
  };

  const REQUIRED_CATEGORIES = ['REAL', 'AUTO_PLACEHOLDER', 'JUNK', 'TRUE_DUPLICATE', 'FALSE_DUPLICATE'];
  const allReviewed = preview && REQUIRED_CATEGORIES.every(c => reviewedCategories.has(c));
  const canExecute = allReviewed && previewRun && !migrationRuns.some(r => r.rollback_available && !r.rolled_back);

  const trueCount = preview?.true_duplicate_groups || 0;
  const falseCount = preview?.false_duplicate_groups || 0;
  const realCount = (preview?.real_singles_count || 0) + (preview?.true_duplicate_articles || 0) + (preview?.false_duplicate_articles || 0);

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-signal" />
              Batch Migration
            </h1>
            <p className="text-white/40 text-sm mt-1">LAGER-SPEC-2026-003 — Article.batch_number → Batch-entity</p>
          </div>
          <Button onClick={handleDryRun} disabled={loadingDryRun} variant="outline"
            className="border-white/20 text-white hover:bg-white/10 gap-2">
            {loadingDryRun ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Kör Dry-Run
          </Button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-yellow-300 font-semibold mb-1">Admin-only operation</p>
            <p className="text-yellow-200/70">Påverkar upp till 341 artiklar. Alla ändringar kan rullas tillbaka via snapshot.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
          {[
            { key: 'preview', label: 'Förhandsvisning', icon: Eye },
            { key: 'history', label: 'Historik', icon: Clock }
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === tab.key ? "bg-white/15 text-white" : "text-white/40 hover:text-white")}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            {!preview && (
              <div className="text-center py-16 text-white/30">
                <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Kör dry-run för att analysera data</p>
              </div>
            )}

            {preview && (
              <>
                {/* Summary cards */}
                <BatchMigrationSummaryCards preview={preview} />

                {/* Expected outcome */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Förväntat utfall</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-400">{previewRun?.output_summary?.expected_new_batches || 0}</p>
                      <p className="text-xs text-white/40">nya Batch-poster</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-400">{preview.junk_count || 0}</p>
                      <p className="text-xs text-white/40">artiklar rensas</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-400">{preview.false_duplicate_groups || 0}</p>
                      <p className="text-xs text-white/40">granskningskön</p>
                    </div>
                  </div>
                </div>

                {/* Category tables — must review each */}
                {[
                  {
                    key: 'REAL', label: 'REAL — Verkliga batchnummer', count: preview.real_singles_count,
                    articles: preview.articles_real, description: 'Skapar en Batch-post per artikel.'
                  },
                  {
                    key: 'AUTO_PLACEHOLDER', label: 'AUTO_PLACEHOLDER', count: preview.auto_placeholder_count,
                    articles: preview.articles_auto_placeholder, description: 'Skapar Batch med legacy_unmigrated=true och risk_flag low_ai_confidence.'
                  },
                  {
                    key: 'JUNK', label: 'JUNK — Skräpdata', count: preview.junk_count,
                    articles: preview.articles_junk, description: 'Ingen Batch skapas. batch_number sparas i legacy_batch_number och rensas.'
                  },
                  {
                    key: 'TRUE_DUPLICATE', label: 'TRUE_DUPLICATE — Sanna dubletter', count: trueCount,
                    groups: preview.true_duplicate_groups_detail, description: `${trueCount} grupp(er) — konsolideras till EN Batch per grupp med summerad kvantitet.`
                  },
                  {
                    key: 'FALSE_DUPLICATE', label: 'FALSE_DUPLICATE — Falska dubletter', count: falseCount,
                    groups: preview.false_duplicate_groups_detail, description: `${falseCount} grupp(er) — separata Batches + granskningskön.`
                  },
                ].map(cat => (
                  <div key={cat.key} className={cn("rounded-xl border transition-all",
                    reviewedCategories.has(cat.key) ? "border-green-500/40 bg-green-500/5" : "border-white/10 bg-white/5")}>
                    <button
                      className="w-full flex items-center justify-between p-4"
                      onClick={() => setExpandedCategory(expandedCategory === cat.key ? null : cat.key)}>
                      <div className="flex items-center gap-3">
                        {reviewedCategories.has(cat.key)
                          ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                          : <div className="w-5 h-5 rounded-full border-2 border-white/20" />}
                        <div className="text-left">
                          <p className="font-semibold text-white text-sm">{cat.label}</p>
                          <p className="text-white/40 text-xs">{cat.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("text-xs font-bold px-2 py-1 rounded-lg border", CATEGORY_LABELS[cat.key]?.color)}>
                          {cat.count} st
                        </span>
                        {expandedCategory === cat.key ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                      </div>
                    </button>

                    {expandedCategory === cat.key && (
                      <div className="px-4 pb-4 space-y-3">
                        <BatchMigrationCategoryTable articles={cat.articles} groups={cat.groups} categoryKey={cat.key} />
                        <Button size="sm" onClick={() => setReviewedCategories(prev => new Set([...prev, cat.key]))}
                          className="bg-green-600 hover:bg-green-500 text-white gap-2 mt-2">
                          <CheckCircle2 className="w-4 h-4" /> Markera som granskad
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Execute button */}
                <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                  {!allReviewed && (
                    <p className="text-amber-400 text-sm mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Granska alla {REQUIRED_CATEGORIES.length} kategorier för att låsa upp körning
                      ({reviewedCategories.size}/{REQUIRED_CATEGORIES.length} granskade)
                    </p>
                  )}
                  {migrationRuns.some(r => r.rollback_available && !r.rolled_back) && (
                    <p className="text-red-400 text-sm mb-3">
                      En körning är redan aktiv. Rulla tillbaka den innan du kör igen.
                    </p>
                  )}
                  <Button
                    onClick={handleExecute}
                    disabled={!canExecute || loadingExecute}
                    className={cn("w-full py-4 text-base font-bold gap-2 transition-all",
                      canExecute
                        ? "bg-signal hover:bg-signal-hover text-white shadow-lg shadow-signal/30"
                        : "bg-white/10 text-white/30 cursor-not-allowed")}>
                    {loadingExecute
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Kör migration...</>
                      : <><Play className="w-5 h-5" /> GODKÄNN OCH KÖR MIGRATION</>}
                  </Button>
                </div>

                {executeResult && (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                    <p className="text-green-300 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Migration slutförd
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                      <div><p className="text-white font-bold">{executeResult.batches_created}</p><p className="text-white/40">batches skapade</p></div>
                      <div><p className="text-white font-bold">{executeResult.articles_cleaned}</p><p className="text-white/40">artiklar rensade</p></div>
                      <div><p className="text-white font-bold">{executeResult.queue_entries}</p><p className="text-white/40">köposter</p></div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {migrationRuns.length === 0 && (
              <div className="text-center py-10 text-white/30">Inga körningar ännu.</div>
            )}
            {migrationRuns.map(run => {
              const isPreview = run.input_summary?.mode === 'preview';
              const out = run.output_summary || {};
              return (
                <div key={run.id} className={cn("p-4 rounded-xl border",
                  run.rolled_back ? "border-red-500/30 bg-red-500/5"
                    : isPreview ? "border-white/10 bg-white/5"
                    : "border-green-500/30 bg-green-500/5")}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold text-sm">
                          {isPreview ? '📋 Dry-Run Preview' : '✅ Körning'}
                        </span>
                        {run.rolled_back && <span className="text-xs text-red-400 border border-red-500/30 rounded px-2 py-0.5">Rulladbak</span>}
                      </div>
                      <p className="text-white/40 text-xs">
                        {run.run_date ? format(new Date(run.run_date), 'd MMM yyyy HH:mm', { locale: sv }) : '—'}
                        {run.ran_by && ` · ${run.ran_by}`}
                      </p>
                      {!isPreview && (
                        <div className="flex gap-4 mt-2 text-xs text-white/50">
                          <span>{out.batches_created ?? '—'} batches</span>
                          <span>{out.articles_cleaned ?? '—'} rensade</span>
                          <span>{out.queue_entries_created ?? '—'} köposter</span>
                          {out.error_count > 0 && <span className="text-red-400">{out.error_count} fel</span>}
                        </div>
                      )}
                    </div>
                    {run.rollback_available && !run.rolled_back && !isPreview && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRollback(run.id)}
                        disabled={loadingRollback === run.id}
                        className="border-red-500/40 text-red-400 hover:bg-red-500/10 gap-2">
                        {loadingRollback === run.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <RotateCcw className="w-3 h-3" />}
                        Rulla tillbaka
                      </Button>
                    )}
                  </div>
                  {run.errors?.filter(e => e.level !== 'info')?.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-xs text-red-400 cursor-pointer">
                        {run.errors.filter(e => e.level !== 'info').length} fel (klicka för att visa)
                      </summary>
                      <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                        {run.errors.filter(e => e.level !== 'info').map((e, i) => (
                          <p key={i} className="text-xs text-red-300 font-mono">{e.article_id} — {e.error}</p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}