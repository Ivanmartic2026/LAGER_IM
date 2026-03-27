import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, XCircle, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";

export default function FortnoxSyncPage() {
  const [credentials, setCredentials] = useState({
    clientId: 'C84gmzGW0STm',
    clientSecret: 'jCAiY13645iCfRljftcvAES3BZNL1W5Z'
  });
  
  const [editingCredentials, setEditingCredentials] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [counts, setCounts] = useState({ articles: 0, suppliers: 0, purchaseOrders: 0 });

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const [articles, suppliers, orders] = await Promise.all([
        base44.entities.Article.list(),
        base44.entities.Supplier.list(),
        base44.entities.PurchaseOrder.list()
      ]);
      setCounts({
        articles: articles.length,
        suppliers: suppliers.filter(s => s.is_active !== false).length,
        purchaseOrders: orders.length
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const handleSync = async (type) => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      const result = await base44.functions.invoke('fortnoxSync', {
        syncType: type,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret
      });
      
      setSyncResult(result.data);
      if (result.data.success) {
        toast.success(`${type === 'articles' ? 'Artiklar' : type === 'suppliers' ? 'Leverantörer' : 'Inköpsorder'} synkade framgångsrikt!`);
      } else {
        toast.error(`Synkronisering misslyckades: ${result.data.error}`);
      }
    } catch (error) {
      console.error(`Sync error for ${type}:`, error);
      toast.error('Synkronisering misslyckades');
      setSyncResult({
        success: false,
        error: error.message,
        type,
        succeeded: 0,
        failed: 0
      });
    } finally {
      setSyncing(false);
      setConfirmDialog(null);
    }
  };

  const openConfirmDialog = (type) => {
    const count = type === 'articles' ? counts.articles : type === 'suppliers' ? counts.suppliers : counts.purchaseOrders;
    const labels = {
      articles: 'Artiklar',
      suppliers: 'Leverantörer',
      purchaseOrders: 'Inköpsorder'
    };
    
    setConfirmDialog({
      type,
      count,
      label: labels[type]
    });
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        
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
              <p className="text-sm text-white/50">Synka data mellan appen och Fortnox</p>
            </div>
          </div>
        </motion.div>

        {/* Credentials Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Fortnox Inställningar</h2>
            <Button
              onClick={() => setEditingCredentials(!editingCredentials)}
              variant="outline"
              size="sm"
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
            >
              {editingCredentials ? 'Spara' : 'Redigera'}
            </Button>
          </div>

          {editingCredentials ? (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Client ID</Label>
                <Input
                  value={credentials.clientId}
                  onChange={(e) => setCredentials({...credentials, clientId: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Client Secret</Label>
                <Input
                  type="password"
                  value={credentials.clientSecret}
                  onChange={(e) => setCredentials({...credentials, clientSecret: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-slate-400">
              <p>Client ID är konfigurerad</p>
              <p>Client Secret är konfigurerad</p>
            </div>
          )}
        </motion.div>

        {/* Sync Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          <button
            onClick={() => openConfirmDialog('articles')}
            disabled={syncing}
            className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="mb-3 w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-400 font-semibold">📦</span>
            </div>
            <h3 className="text-white font-semibold mb-1">Synca Artiklar</h3>
            <p className="text-sm text-white/50">{counts.articles} artiklar</p>
          </button>

          <button
            onClick={() => openConfirmDialog('suppliers')}
            disabled={syncing}
            className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="mb-3 w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <span className="text-green-400 font-semibold">🏭</span>
            </div>
            <h3 className="text-white font-semibold mb-1">Synca Leverantörer</h3>
            <p className="text-sm text-white/50">{counts.suppliers} leverantörer</p>
          </button>

          <button
            onClick={() => openConfirmDialog('purchaseOrders')}
            disabled={syncing}
            className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="mb-3 w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <span className="text-purple-400 font-semibold">📋</span>
            </div>
            <h3 className="text-white font-semibold mb-1">Synca Inköpsorder</h3>
            <p className="text-sm text-white/50">{counts.purchaseOrders} order</p>
          </button>
        </motion.div>

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
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-500/20">
                {syncResult.success ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold mb-2 ${syncResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {syncResult.success ? 'Synkronisering slutförd' : 'Synkronisering misslyckades'}
                </h3>
                <div className="space-y-1 text-sm text-white/70">
                  {syncResult.succeeded > 0 && (
                    <p>✓ {syncResult.succeeded} items synkade framgångsrikt</p>
                  )}
                  {syncResult.failed > 0 && (
                    <p>✗ {syncResult.failed} items misslyckades</p>
                  )}
                  {syncResult.error && (
                    <p className="text-red-400">{syncResult.error}</p>
                  )}
                </div>
              </div>
            </div>
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
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Om Synkronisering</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Synkroniseringen använder Fortnox REST API med OAuth2 client credentials. 
                Du måste bekräfta varje synkronisering innan den körs. Synkade items uppdateras 
                baserat på deras SKU/artikel-nummer.
              </p>
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
              Vill du synka <span className="font-semibold text-white">{confirmDialog?.count}</span> {confirmDialog?.label?.toLowerCase()} till Fortnox?
            </p>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              disabled={syncing}
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
            >
              Avbryt
            </Button>
            <Button
              onClick={() => confirmDialog && handleSync(confirmDialog.type)}
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Synkar...
                </>
              ) : (
                'Ja, synca'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}