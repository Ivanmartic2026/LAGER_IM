/**
 * NoMatchDecisionModal — visas när scanAndProcess returnerar needs_user_decision=true
 * Tre val: ny artikel+batch, ny batch för befintlig artikel, avbryt/manuell granskning
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { Search, Plus, BookOpen, X, Package, Layers, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function NoMatchDecisionModal({
  imageUrl,
  extractedSummary = {},
  barcodeValues = [],
  onDecision,   // (decision, extra) => void
  onClose
}) {
  const [view, setView] = useState('choose'); // choose | new_article_form | pick_article
  const [articleSearch, setArticleSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [newArticleName, setNewArticleName] = useState(extractedSummary.article_name || '');
  const [newArticleSku, setNewArticleSku] = useState(extractedSummary.article_sku || '');
  const [newStorageType, setNewStorageType] = useState('company_owned');

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

  const barcodeDisplay = barcodeValues.map(bv => `[${bv.type || 'code'}] ${bv.raw_value}`).join('\n');
  const ocrDisplay = extractedSummary.batch_number || extractedSummary.article_name || '(ingen OCR-text)';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
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
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
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
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Barcode / Data Matrix</p>
                <p className="text-white text-xs font-mono break-all whitespace-pre-line">{barcodeDisplay}</p>
              </div>
            )}
            {extractedSummary.supplier_name && (
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Leverantör</p>
                <p className="text-white text-xs">{extractedSummary.supplier_name}</p>
              </div>
            )}
          </div>
        </div>

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

              <button
                onClick={() => onDecision('manual_review', {})}
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
                onClick={() => {
                  if (!newArticleName.trim()) { toast.error('Artikelnamn krävs'); return; }
                  onDecision('new_article_and_batch', {
                    article_data: { name: newArticleName, sku: newArticleSku, storage_type: newStorageType }
                  });
                }}
                className="w-full bg-signal hover:bg-signal-hover uppercase tracking-wider"
              >
                <Plus className="w-4 h-4 mr-2" /> Skapa artikel + batch
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
                    onClick={() => onDecision('new_batch_for_article', { article_id: art.id })}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-left"
                  >
                    <Package className="w-5 h-5 text-zinc-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{art.name}</p>
                      {art.sku && <p className="text-zinc-500 text-xs">{art.sku}</p>}
                    </div>
                  </button>
                ))}
                {articleSearch.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="text-zinc-500 text-sm text-center py-4">Inga artiklar hittades</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}