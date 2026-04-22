/**
 * NoMatchDecisionModal — visas när scanAndProcess returnerar needs_user_decision=true
 * Tre val: ny artikel+batch, ny batch för befintlig artikel, avbryt/manuell granskning
 * Stöder patternSuggestion för AI-inferred leverantörsförslag
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { Search, Plus, BookOpen, X, Package, Layers, AlertTriangle, Cpu, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function NoMatchDecisionModal({
  imageUrl,
  extractedSummary = {},
  barcodeValues = [],
  labelScanId,
  patternSuggestion = null, // { supplier_name, supplier_id, category, series, explanation, rule_ids }
  activeContext = null,      // current scan context (e.g. "inventory_count", "stock_adjustment")
  onCreated,   // (result) => void — called after article/batch created
  onCancel,    // () => void — called on manual_review or close
  // Legacy compat
  onDecision,
  onClose
}) {
  const [view, setView] = useState('choose');
  const [articleSearch, setArticleSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newArticleName, setNewArticleName] = useState(extractedSummary.article_name || '');
  const [newArticleSku, setNewArticleSku] = useState(extractedSummary.article_sku || '');
  const [newStorageType] = useState('company_owned');
  const [visualMatches, setVisualMatches] = useState([]);
  const [loadingVisual, setLoadingVisual] = useState(false);

  const handleClose = onCancel || onClose || (() => {});
  const handleDecision = onDecision || (() => {});

  // Determine if visual search is relevant: no SKU and no batch_number found
  const noTextMatch = !extractedSummary.batch_number && !extractedSummary.article_sku;

  // Load visual candidates when view switches to visual_match
  useEffect(() => {
    if (view !== 'visual_match') return;
    setLoadingVisual(true);
    base44.entities.Article.list('-updated_date', 50)
      .then(all => {
        // Only show articles that have images
        const withImages = all.filter(a => a.image_urls?.length > 0).slice(0, 20);
        setVisualMatches(withImages);
      })
      .catch(() => setVisualMatches([]))
      .finally(() => setLoadingVisual(false));
  }, [view]);

  const handleSearchArticle = async (q) => {
    setArticleSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const all = await base44.entities.Article.list('-updated_date', 100);
      const filtered = all.filter(a =>
        (a.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (a.sku || '').toLowerCase().includes(q.toLowerCase())
      ).slice(0, 10);
      setSearchResults(filtered);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateNewArticleAndBatch = async () => {
    if (!newArticleName.trim()) { toast.error('Artikelnamn krävs'); return; }
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const batchNum = (extractedSummary.batch_number || '').toUpperCase().replace(/\s+/g, '').trim();
      const allIdentifiers = [batchNum, newArticleSku].filter(Boolean);
      // Also add barcode values
      for (const bv of barcodeValues) {
        if (bv.raw_value) allIdentifiers.push(bv.raw_value);
        if (bv.canonical_core) allIdentifiers.push(bv.canonical_core);
      }
      const uniqueAliases = [...new Set(allIdentifiers.filter(Boolean))];

      const article = await base44.entities.Article.create({
        name: newArticleName,
        sku: newArticleSku || undefined,
        storage_type: newStorageType,
        supplier_id: patternSuggestion?.supplier_id || undefined,
        supplier_name: patternSuggestion?.supplier_name || extractedSummary.supplier_name || undefined,
        category: patternSuggestion?.category || undefined,
        series: patternSuggestion?.series || undefined,
        ai_extracted_data: extractedSummary,
        status: 'pending_verification'
      });

      let batch = null;
      if (batchNum) {
        batch = await base44.entities.Batch.create({
          article_id: article.id,
          batch_number: batchNum,
          raw_batch_number: extractedSummary.batch_number || batchNum,
          aliases: uniqueAliases,
          article_sku: article.sku,
          article_name: article.name,
          supplier_id: patternSuggestion?.supplier_id || undefined,
          supplier_name: patternSuggestion?.supplier_name || extractedSummary.supplier_name || undefined,
          status: 'pending_verification',
          source_context: 'article_creation'
        });

        // Write BatchEvent
        await base44.entities.BatchEvent.create({
          batch_id: batch.id,
          event_type: 'created',
          actor: me.email,
          timestamp: new Date().toISOString(),
          payload: { label_scan_id: labelScanId, identifiers: uniqueAliases, pattern_suggestion: patternSuggestion },
          source_entity: 'LabelScan',
          source_id: labelScanId
        });
      }

      // Update LabelScan
      if (labelScanId) {
        await base44.entities.LabelScan.update(labelScanId, {
          batch_id: batch?.id || null,
          status: 'completed',
          match_results: { article_match_id: article.id, batch_match_id: batch?.id || null }
        }).catch(() => {});
      }

      if (onCreated) onCreated({ article, batch });
      else handleDecision('new_article_and_batch', { article, batch });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLinkToArticle = async (article) => {
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const batchNum = (extractedSummary.batch_number || '').toUpperCase().replace(/\s+/g, '').trim();
      const allIdentifiers = [batchNum].filter(Boolean);
      for (const bv of barcodeValues) {
        if (bv.raw_value) allIdentifiers.push(bv.raw_value);
        if (bv.canonical_core) allIdentifiers.push(bv.canonical_core);
      }
      const uniqueAliases = [...new Set(allIdentifiers.filter(Boolean))];

      const batch = await base44.entities.Batch.create({
        article_id: article.id,
        batch_number: batchNum || `SCAN-${Date.now()}`,
        raw_batch_number: extractedSummary.batch_number || batchNum,
        aliases: uniqueAliases,
        article_sku: article.sku,
        article_name: article.name,
        supplier_id: article.supplier_id || patternSuggestion?.supplier_id || undefined,
        supplier_name: article.supplier_name || patternSuggestion?.supplier_name || undefined,
        status: 'pending_verification',
        source_context: 'article_creation'
      });

      await base44.entities.BatchEvent.create({
        batch_id: batch.id,
        event_type: 'created',
        actor: me.email,
        timestamp: new Date().toISOString(),
        payload: { label_scan_id: labelScanId, linked_to_existing_article: article.id, identifiers: uniqueAliases },
        source_entity: 'LabelScan',
        source_id: labelScanId
      });

      if (labelScanId) {
        await base44.entities.LabelScan.update(labelScanId, {
          batch_id: batch.id,
          status: 'completed',
          match_results: { article_match_id: article.id, batch_match_id: batch.id }
        }).catch(() => {});
      }

      if (onCreated) onCreated({ article, batch });
      else handleDecision('new_batch_for_article', { article, batch });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleManualReview = () => {
    if (onCancel) onCancel();
    else handleDecision('manual_review', {});
  };

  const handleVisualMatch = async (article) => {
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const batch = await base44.entities.Batch.create({
        article_id: article.id,
        batch_number: `VISUAL-${Date.now()}`,
        raw_batch_number: null,
        aliases: [],
        article_sku: article.sku,
        article_name: article.name,
        supplier_id: article.supplier_id || undefined,
        supplier_name: article.supplier_name || undefined,
        status: 'pending_verification',
        source_context: 'article_creation'
      });

      await base44.entities.BatchEvent.create({
        batch_id: batch.id,
        event_type: 'created',
        actor: me.email,
        timestamp: new Date().toISOString(),
        payload: { label_scan_id: labelScanId, match_method: 'visual_manual' },
        source_entity: 'LabelScan',
        source_id: labelScanId
      });

      if (labelScanId) {
        await base44.entities.LabelScan.update(labelScanId, {
          batch_id: batch.id,
          status: 'completed',
          match_results: {
            article_match_id: article.id,
            batch_match_id: batch.id,
            article_match_method: 'visual_manual',
            image_search_attempted: true
          }
        }).catch(() => {});
      }

      toast.success(`Kopplad till ${article.name}`);
      if (onCreated) onCreated({ article, batch });
      else handleDecision('visual_match', { article, batch });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const barcodeDisplay = barcodeValues.map(bv => `[${bv.type || 'code'}] ${bv.raw_value}`).join('\n');
  const ocrDisplay = extractedSummary.batch_number || extractedSummary.article_name || '(ingen OCR-text)';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-white font-brand text-base uppercase tracking-wide">Ingen match hittades</h2>
              <p className="text-zinc-400 text-xs mt-0.5">Ska detta läggas till som…</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-zinc-500 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan summary */}
        <div className="p-4 border-b border-zinc-800 grid grid-cols-2 gap-3">
          {imageUrl && (
            <img src={imageUrl} alt="Scannad etikett" className="w-full h-32 object-contain rounded-lg bg-zinc-800 border border-zinc-700" />
          )}
          <div className="space-y-2">
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider">OCR batch/artikel</p>
              <p className="text-white text-xs font-mono break-all">{ocrDisplay}</p>
            </div>
            {barcodeDisplay && (
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Barcode</p>
                <p className="text-white text-xs font-mono break-all whitespace-pre-line">{barcodeDisplay}</p>
              </div>
            )}
          </div>
        </div>

        {/* Pattern suggestion banner */}
        {patternSuggestion?.explanation && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-signal/10 border border-signal/20 flex items-start gap-2">
            <Cpu className="w-4 h-4 text-signal mt-0.5 shrink-0" />
            <p className="text-signal text-xs leading-relaxed">{patternSuggestion.explanation}</p>
          </div>
        )}

        {/* Choose view */}
        <AnimatePresence mode="wait">
          {view === 'choose' && (
            <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-3">
              <button
                onClick={() => setView('new_article_form')}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-signal/40 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-signal/20 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-signal" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Ny artikel + ny batch</p>
                  <p className="text-zinc-400 text-xs mt-0.5">Första gången denna produkt scannas</p>
                </div>
              </button>

              <button
                onClick={() => setView('pick_article')}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-blue-500/40 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Ny batch för befintlig artikel</p>
                  <p className="text-zinc-400 text-xs mt-0.5">Artikeln finns — denna batch är ny</p>
                </div>
              </button>

              {/* Context-specific extra options */}
              {activeContext === 'inventory_count' && (
                <button
                  onClick={() => {
                    if (onCreated) onCreated({ context_action: 'unexpected_item_in_count' });
                    else handleDecision('unexpected_inventory_item', {});
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-green-500/30 text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                    <Search className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Registrera som oväntad artikel i inventering</p>
                    <p className="text-zinc-400 text-xs mt-0.5">Lägg till som avvikelse i pågående inventering</p>
                  </div>
                </button>
              )}

              {activeContext === 'stock_adjustment' && (
                <button
                  onClick={() => setView('pick_article')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-yellow-500/30 text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                    <Search className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Ingen match — öppna artikelsök manuellt</p>
                    <p className="text-zinc-400 text-xs mt-0.5">Sök och välj artikel för saldojustering</p>
                  </div>
                </button>
              )}

              {/* Visual match option — shown when no text identifiers were found */}
              {noTextMatch && (
                <button
                  onClick={() => setView('visual_match')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-purple-500/30 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Visuell matchning</p>
                    <p className="text-zinc-400 text-xs mt-0.5">Ingen text hittades — jämför visuellt med kända artiklar</p>
                  </div>
                </button>
              )}

              <button
                onClick={handleManualReview}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Avbryt / granska manuellt</p>
                  <p className="text-zinc-400 text-xs mt-0.5">LabelScan sparas, inget skapas</p>
                </div>
              </button>
            </motion.div>
          )}

          {view === 'new_article_form' && (
            <motion.div key="new_article" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-4">
              <button onClick={() => setView('choose')} className="text-zinc-400 text-sm flex items-center gap-1 hover:text-white">
                ← Tillbaka
              </button>
              <h3 className="text-white font-medium">Ny artikel + ny batch</h3>

              {patternSuggestion?.supplier_name && (
                <div className="p-3 rounded-lg bg-signal/5 border border-signal/20 text-xs text-zinc-300">
                  <span className="text-signal font-semibold">AI-förslag: </span>
                  Leverantör <span className="text-white">{patternSuggestion.supplier_name}</span>
                  {patternSuggestion.category && <>, kategori <span className="text-white">{patternSuggestion.category}</span></>}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label className="text-zinc-400 text-xs">Artikelnamn *</Label>
                  <Input
                    value={newArticleName}
                    onChange={e => setNewArticleName(e.target.value)}
                    placeholder="T.ex. LED-modul P2.6 Indoor"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">SKU / Artikelnummer</Label>
                  <Input
                    value={newArticleSku}
                    onChange={e => setNewArticleSku(e.target.value)}
                    placeholder="T.ex. LED-P26-IND"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">Batch (från scanning)</Label>
                  <Input
                    value={extractedSummary.batch_number || ''}
                    readOnly
                    className="bg-zinc-700 border-zinc-600 text-zinc-300 mt-1"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateNewArticleAndBatch}
                disabled={saving}
                className="w-full bg-signal hover:bg-signal-hover uppercase tracking-wider"
              >
                {saving ? 'Skapar...' : <><Plus className="w-4 h-4 mr-2" /> Skapa artikel + batch</>}
              </Button>
            </motion.div>
          )}

          {view === 'pick_article' && (
            <motion.div key="pick_article" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-4">
              <button onClick={() => setView('choose')} className="text-zinc-400 text-sm flex items-center gap-1 hover:text-white">
                ← Tillbaka
              </button>
              <h3 className="text-white font-medium">Välj befintlig artikel</h3>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                <Input
                  value={articleSearch}
                  onChange={e => handleSearchArticle(e.target.value)}
                  placeholder="Sök på namn eller SKU…"
                  className="bg-zinc-800 border-zinc-700 text-white pl-9"
                />
              </div>
              {searching && <p className="text-zinc-500 text-xs text-center">Söker…</p>}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map(art => (
                  <button
                    key={art.id}
                    onClick={() => handleLinkToArticle(art)}
                    disabled={saving}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-left disabled:opacity-50"
                  >
                    <Package className="w-5 h-5 text-zinc-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{art.name}</p>
                      {art.sku && <p className="text-zinc-500 text-xs">{art.sku}</p>}
                    </div>
                    {saving && <span className="text-zinc-500 text-xs ml-auto">Sparar…</span>}
                  </button>
                ))}
                {articleSearch.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="text-zinc-500 text-sm text-center py-4">Inga artiklar hittades</p>
                )}
              </div>
            </motion.div>
          )}

          {view === 'visual_match' && (
            <motion.div key="visual_match" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-4">
              <button onClick={() => setView('choose')} className="text-zinc-400 text-sm flex items-center gap-1 hover:text-white">
                ← Tillbaka
              </button>
              <div>
                <h3 className="text-white font-medium">Visuell matchning</h3>
                <p className="text-zinc-400 text-xs mt-1">Välj den artikel som ser likadan ut som den scannede etiketten</p>
              </div>
              {loadingVisual && <p className="text-zinc-500 text-xs text-center py-4">Laddar artiklar…</p>}
              {!loadingVisual && visualMatches.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-4">Inga artiklar med bilder hittades</p>
              )}
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {visualMatches.map(art => (
                  <button
                    key={art.id}
                    onClick={() => handleVisualMatch(art)}
                    disabled={saving}
                    className="flex flex-col rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-purple-500/40 overflow-hidden text-left disabled:opacity-50 transition-all"
                  >
                    <img
                      src={art.image_urls[0]}
                      alt={art.name}
                      className="w-full h-24 object-cover bg-zinc-900"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div className="p-2">
                      <p className="text-white text-xs font-medium truncate">{art.name}</p>
                      {art.sku && <p className="text-zinc-500 text-[10px]">{art.sku}</p>}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-zinc-600 text-[10px] text-center">Matchning sparas med metod: visual_manual • image_search_attempted: true</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}