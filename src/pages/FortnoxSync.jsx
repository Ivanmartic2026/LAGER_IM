import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, XCircle, Loader2, Settings, Package, ShoppingCart, Users } from "lucide-react";
import { toast } from "sonner";

export default function FortnoxSyncPage() {
  const [articles, setArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticles, setSelectedArticles] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [mode, setMode] = useState('manual'); // 'manual' or 'suppliers'
  const [syncingArticleId, setSyncingArticleId] = useState(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.Article.list();
      setArticles(data.sort((a, b) => (a.sku || '').localeCompare(b.sku || '')));
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Kunde inte hämta artiklar');
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article =>
    !searchTerm || 
    article.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleArticle = (id) => {
    const newSet = new Set(selectedArticles);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedArticles(newSet);
  };

  const toggleAllArticles = () => {
    if (selectedArticles.size === filteredArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(filteredArticles.map(a => a.id)));
    }
  };

  const handleSyncSelected = async () => {
    if (selectedArticles.size === 0) {
      toast.error('Välj minst en artikel');
      return;
    }

    setConfirmDialog({
      type: 'articles',
      count: selectedArticles.size,
      label: 'artiklar'
    });
  };

  const executeSync = async (type) => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const articlesToSync = type === 'articles' 
        ? articles.filter(a => selectedArticles.has(a.id))
        : [];

      const result = await base44.functions.invoke('fortnoxSyncV2', {
        syncType: type,
        articles: articlesToSync
      });

      if (result.data.success) {
        setSyncResult(result.data);
        toast.success(`${result.data.succeeded} artiklar synkade framgångsrikt!`);
        
        // Markera artiklar som synkade
        if (type === 'articles') {
          for (const articleId of selectedArticles) {
            await base44.entities.Article.update(articleId, { fortnox_synced: true });
          }
          await fetchArticles();
          setSelectedArticles(new Set());
        }
      } else {
        setSyncResult(result.data);
        toast.error(`Synkronisering misslyckades: ${result.data.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Synkronisering misslyckades');
      setSyncResult({
        success: false,
        error: error.message,
        succeeded: 0,
        failed: selectedArticles.size
      });
    } finally {
      setSyncing(false);
      setConfirmDialog(null);
    }
  };

  const toggleAutoSync = async (articleId, currentValue) => {
    try {
      await base44.entities.Article.update(articleId, { 
        fortnox_synced: !currentValue 
      });
      await fetchArticles();
      toast.success(currentValue ? 'Auto-synk inaktiverad' : 'Auto-synk aktiverad');
    } catch (error) {
      console.error('Error updating article:', error);
      toast.error('Kunde inte uppdatera artikel');
    }
  };

  const handleSyncSingleArticle = (article) => {
    setConfirmDialog({
      type: 'singleArticle',
      article: article,
      count: 1,
      label: 'artikel'
    });
  };

  const executeSingleSync = async () => {
    if (!confirmDialog?.article) return;
    
    setSyncingArticleId(confirmDialog.article.id);
    try {
      const result = await base44.functions.invoke('fortnoxSyncV2', {
        syncType: 'articles',
        articles: [confirmDialog.article]
      });

      if (result.data.success) {
        await base44.entities.Article.update(confirmDialog.article.id, { fortnox_synced: true });
        await fetchArticles();
        toast.success('Artikel synkad framgångsrikt!');
      } else {
        toast.error(`Synkronisering misslyckades: ${result.data.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Synkronisering misslyckades');
    } finally {
      setSyncingArticleId(null);
      setConfirmDialog(null);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-800 flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Fortnox Synkronisering</h1>
              <p className="text-sm text-white/50">Synka artiklar mellan appen och Fortnox</p>
            </div>
          </div>
        </motion.div>

        {/* Mode Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex gap-2"
        >
          <button
            onClick={() => setMode('manual')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Synka Artiklar
          </button>
          <button
            onClick={() => setMode('suppliers')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'suppliers'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Synka Leverantörer
          </button>
          <button
            onClick={() => setMode('purchaseOrders')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'purchaseOrders'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4 inline mr-2" />
            Synka Inköpsorder
          </button>
        </motion.div>

        {/* Manual Article Sync Mode */}
        {mode === 'manual' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Search and Controls */}
            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="Sök på SKU, namn eller leverantör..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-slate-800 border-slate-700 text-white"
                />
                <Button
                  onClick={toggleAllArticles}
                  variant="outline"
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white whitespace-nowrap"
                >
                  {selectedArticles.size === filteredArticles.length && filteredArticles.length > 0
                    ? 'Avmarkera alla'
                    : 'Välj alla'}
                </Button>
                <Button
                  onClick={handleSyncSelected}
                  disabled={selectedArticles.size === 0 || syncing}
                  className="bg-blue-600 hover:bg-blue-500 text-white whitespace-nowrap"
                >
                  Skicka {selectedArticles.size > 0 ? `${selectedArticles.size} ` : ''}till Fortnox
                </Button>
              </div>

              {/* Articles Table */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="p-3 text-left">
                          <Checkbox
                            checked={selectedArticles.size === filteredArticles.length && filteredArticles.length > 0}
                            onChange={toggleAllArticles}
                          />
                        </th>
                        <th className="p-3 text-left text-white/70">SKU</th>
                        <th className="p-3 text-left text-white/70">Artikelnamn</th>
                        <th className="p-3 text-left text-white/70">Leverantör</th>
                        <th className="p-3 text-left text-white/70">Lager-saldo</th>
                        <th className="p-3 text-left text-white/70">Status</th>
                        <th className="p-3 text-left text-white/70">Auto-synk</th>
                        <th className="p-3 text-left text-white/70">Åtgärder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArticles.map((article) => (
                        <tr key={article.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-3">
                            <Checkbox
                              checked={selectedArticles.has(article.id)}
                              onChange={() => toggleArticle(article.id)}
                            />
                          </td>
                          <td className="p-3 text-white font-mono">{article.sku || '-'}</td>
                          <td className="p-3 text-white/80">{article.name}</td>
                          <td className="p-3 text-white/80">{article.supplier_name || '-'}</td>
                          <td className="p-3 text-white/80">{article.stock_qty || 0} st</td>
                          <td className="p-3">
                            {article.fortnox_synced ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                                <CheckCircle2 className="w-3 h-3" /> Synkad
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-500/20 text-slate-400 text-xs">
                                Ej synkad
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => toggleAutoSync(article.id, article.fortnox_synced)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                                article.fortnox_synced
                                  ? 'bg-blue-600/30 text-blue-300 hover:bg-blue-600/50'
                                  : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 cursor-not-allowed'
                              } ${!article.fortnox_synced ? 'opacity-50' : ''}`}
                              disabled={!article.fortnox_synced}
                            >
                              {article.fortnox_synced ? 'Aktiv' : 'Inaktiv'}
                            </button>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleSyncSingleArticle(article)}
                              disabled={syncingArticleId === article.id || article.fortnox_synced}
                              className={`px-3 py-1 rounded text-xs font-medium transition-all whitespace-nowrap ${
                                article.fortnox_synced
                                  ? 'bg-slate-700/30 text-slate-400 cursor-not-allowed opacity-50'
                                  : 'bg-blue-600/30 text-blue-300 hover:bg-blue-600/50'
                              }`}
                            >
                              {syncingArticleId === article.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                                  Synkar...
                                </>
                              ) : (
                                <>Synka →</>
                              )}
                            </button>
                          </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sync Result */}
            {syncResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl backdrop-blur-xl border ${
                  syncResult.success
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  {syncResult.success ? (
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-2 ${syncResult.success ? 'text-green-400' : 'text-red-400'}`}>
                      {syncResult.success ? 'Synkronisering slutförd' : 'Synkronisering misslyckades'}
                    </h3>
                    <div className="space-y-1 text-sm text-white/70">
                      {syncResult.succeeded > 0 && (
                        <p>✓ {syncResult.succeeded} artiklar synkade framgångsrikt</p>
                      )}
                      {syncResult.failed > 0 && (
                        <p>✗ {syncResult.failed} artiklar misslyckades</p>
                      )}
                      {syncResult.error && (
                        <p className="text-red-400">{syncResult.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Suppliers/Orders Modes */}
        {(mode === 'suppliers' || mode === 'purchaseOrders') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
          >
            <p className="text-white/70 mb-4">
              {mode === 'suppliers' 
                ? 'Synka alla leverantörer till Fortnox'
                : 'Synka alla inköpsorder till Fortnox'}
            </p>
            <Button
              onClick={() => setConfirmDialog({
                type: mode,
                count: mode === 'suppliers' ? 'alla' : 'alla',
                label: mode === 'suppliers' ? 'leverantörer' : 'inköpsorder'
              })}
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Synkar...
                </>
              ) : (
                `Synka ${mode === 'suppliers' ? 'Leverantörer' : 'Inköpsorder'}`
              )}
            </Button>
          </motion.div>
        )}

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
        >
          <div className="flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white mb-2">Så fungerar synkroniseringen</h3>
              <ul className="text-sm text-white/50 space-y-1 list-disc list-inside">
                <li><strong>Läge 1:</strong> Välj artiklar manuellt och synka dem. De markeras då som "Synkad".</li>
                <li><strong>Läge 2:</strong> Synkade artiklar får auto-synk aktiverat automatiskt och uppdateras till Fortnox när stock, pris eller andra viktiga fält ändras.</li>
                <li>Du kan stänga av auto-synk per artikel via toggle-knappen.</li>
                <li>Leverantörer och inköpsorder synkas manuellt via separata knappar.</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Bekräfta synkronisering</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-white/70">
              Vill du synka {confirmDialog?.count} {confirmDialog?.label} till Fortnox?
            </p>
            {confirmDialog?.article && (
              <p className="text-sm text-white/50 mt-2">{confirmDialog.article.sku} - {confirmDialog.article.name}</p>
            )}
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              disabled={syncing || syncingArticleId}
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
            >
              Avbryt
            </Button>
            <Button
              onClick={() => confirmDialog?.type === 'singleArticle' ? executeSingleSync() : executeSync(confirmDialog?.type)}
              disabled={syncing || syncingArticleId}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {syncing || syncingArticleId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Synkar...
                </>
              ) : (
                'Ja, synka'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}