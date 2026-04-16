import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, XCircle, Loader2, Settings, Package, ShoppingCart, Users, Download, Link2, Unlink2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import SynkaKunderTab from "@/components/fortnox/SynkaKunderTab";
import SupplierSyncPanel from "@/components/fortnox/SupplierSyncPanel";
import PurchaseOrderSyncPanel from "@/components/fortnox/PurchaseOrderSyncPanel";

function FortnoxConnectionPanel({ onConnected }) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState('');
  const [savingCode, setSavingCode] = useState(false);

  useEffect(() => {
    checkConnection();
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state === 'fortnox_connect') {
      handleAutoSaveCode(code);
    }
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const configs = await base44.entities.FortnoxConfig.list();
      const connected = configs.length > 0 && configs[0].refresh_token;
      setIsConnected(connected);
      if (onConnected) onConnected(connected);
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = () => {
    const authUrl = 'https://apps.fortnox.se/oauth-v1/auth?client_id=mp08u6gAFPz2&redirect_uri=https%3A%2F%2Flager-ai-7d26cc74.base44.app%2FFortnoxSync&scope=companyinformation%20article%20project%20invoice%20supplierinvoice%20supplier%20customer%20wareflow_read%20wareflow_write&state=fortnox_connect&access_type=offline&response_type=code';
    window.open(authUrl, '_blank');
  };

  const handleAutoSaveCode = async (code) => {
    try {
      const result = await base44.functions.invoke('fortnoxExchangeCode', { code });
      if (result.data.success) {
        toast.success('Anslutning sparad!');
        await checkConnection();
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.reload();
      } else {
        toast.error(`Fel: ${result.data.error}`);
      }
    } catch (error) {
      console.error('Error saving code:', error);
      toast.error('Kunde inte spara anslutning');
    }
  };

  const handleSaveCode = async () => {
    if (!codeInput.trim()) {
      toast.error('Ange en kod');
      return;
    }
    setSavingCode(true);
    try {
      const result = await base44.functions.invoke('fortnoxExchangeCode', { code: codeInput.trim() });
      if (result.data.success) {
        toast.success('Anslutning sparad!');
        setCodeInput('');
        await checkConnection();
      } else {
        toast.error(`Fel: ${result.data.error}`);
      }
    } catch (error) {
      console.error('Error saving code:', error);
      toast.error('Kunde inte spara anslutning');
    } finally {
      setSavingCode(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const configs = await base44.entities.FortnoxConfig.list();
      if (configs.length > 0) {
        await base44.entities.FortnoxConfig.delete(configs[0].id);
        toast.success('Anslutning borttagen');
        setIsConnected(false);
        if (onConnected) onConnected(false);
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Kunde inte ta bort anslutning');
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-green-500/10 backdrop-blur-xl border border-green-500/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-green-400">Ansluten till Fortnox</p>
              <p className="text-sm text-green-400/70">Du kan nu importera artiklar från Fortnox</p>
            </div>
          </div>
          <Button
            onClick={handleDisconnect}
            variant="outline"
            className="bg-red-600/20 border-red-500/30 hover:bg-red-600/30 text-red-400"
          >
            <Unlink2 className="w-4 h-4 mr-2" />
            Koppla från
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-amber-500/10 backdrop-blur-xl border border-amber-500/20 space-y-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-amber-400">Appen är inte ansluten till Fortnox</p>
          <p className="text-sm text-amber-400/70 mt-1">Klicka på knappen nedan för att auktorisera.</p>
        </div>
      </div>

      <Button
        onClick={handleAuthorize}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
      >
        <Link2 className="w-4 h-4 mr-2" />
        Anslut till Fortnox
      </Button>

      <div className="border-t border-amber-500/20 pt-4 space-y-3">
        <p className="text-sm text-amber-400/80">
          Klistra in koden från webbadressen (<span className="font-mono">code=XXXX</span>) här:
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Klistra in kod här..."
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSaveCode()}
            className="bg-slate-800 border-slate-700 text-white"
          />
          <Button
            onClick={handleSaveCode}
            disabled={savingCode || !codeInput.trim()}
            className="bg-green-600 hover:bg-green-500 text-white whitespace-nowrap"
          >
            {savingCode ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              'Spara anslutning'
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function FortnoxConnectionPanelInline() {
  const [fortnoxConnected, setFortnoxConnected] = useState(null);
  const [pastedCode, setPastedCode] = useState('');
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setConnectionLoading(true);
        const configs = await base44.entities.FortnoxConfig.list();
        setFortnoxConnected(configs.length > 0 && configs[0].refresh_token ? true : false);
      } catch (error) {
        console.error('Error checking connection:', error);
        setFortnoxConnected(false);
      } finally {
        setConnectionLoading(false);
      }
    };

    checkConnection();

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state === 'fortnox_connect') {
      base44.functions.invoke('fortnoxExchangeCode', { code }).then(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
        checkConnection();
      }).catch((err) => {
        console.error('Auto-save code error:', err);
      });
    }
  }, []);

  const handleAuthorize = () => {
    window.open('https://apps.fortnox.se/oauth-v1/auth?client_id=mp08u6gAFPz2&redirect_uri=https%3A%2F%2Flager-ai-7d26cc74.base44.app%2FFortnoxSync&scope=companyinformation%20article%20project%20invoice%20supplierinvoice%20supplier%20customer%20wareflow_read%20wareflow_write&state=fortnox_connect&access_type=offline&response_type=code', '_blank');
  };

  const handleSaveCode = async () => {
    if (!pastedCode.trim()) {
      toast.error('Ange en kod');
      return;
    }
    setConnectionLoading(true);
    try {
      const result = await base44.functions.invoke('fortnoxExchangeCode', { code: pastedCode.trim() });
      if (result.data.success) {
        toast.success('Anslutning sparad!');
        setPastedCode('');
        setFortnoxConnected(true);
      } else {
        toast.error(`Fel: ${result.data.error}`);
      }
    } catch (error) {
      console.error('Error saving code:', error);
      toast.error('Kunde inte spara anslutning');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const configs = await base44.entities.FortnoxConfig.list();
      await Promise.all(configs.map(c => base44.entities.FortnoxConfig.delete(c.id)));
      setFortnoxConnected(false);
      setConfirmDisconnect(false);
      toast.success('Anslutning borttagen');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Kunde inte koppla från');
    } finally {
      setDisconnecting(false);
    }
  };

  if (connectionLoading) {
    return (
      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (fortnoxConnected) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-green-500/10 backdrop-blur-xl border border-green-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <p className="font-semibold text-green-400">Ansluten till Fortnox</p>
            </div>
            <Button
              onClick={() => setConfirmDisconnect(true)}
              variant="outline"
              className="bg-red-600/20 border-red-500/30 hover:bg-red-600/30 text-red-400"
            >
              <Unlink2 className="w-4 h-4 mr-2" />
              Koppla från
            </Button>
          </div>
        </motion.div>

        <Dialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-white">Koppla från Fortnox?</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-white/70">Detta tar bort den sparade anslutningen. Du kan återansluta med nya OAuth-behörigheter efteråt.</p>
            </div>
            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmDisconnect(false)}
                disabled={disconnecting}
                className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                {disconnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Kopplar från...</> : 'Ja, koppla från'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-amber-500/10 backdrop-blur-xl border border-amber-500/20 space-y-4"
    >
      <div>
        <p className="font-semibold text-amber-400">Fortnox ar inte anslutet</p>
        <p className="text-sm text-amber-400/70 mt-1">Du behover ansluta for att synka artiklar.</p>
      </div>

      <Button
        onClick={handleAuthorize}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
      >
        <Link2 className="w-4 h-4 mr-2" />
        Anslut till Fortnox
      </Button>

      <div className="border-t border-amber-500/20 pt-4 space-y-3">
        <p className="text-sm text-amber-400/80">Klistra in koden fran URL:en (code=XXXX) har:</p>
        <div className="flex gap-2">
          <Input
            placeholder="Klistra in kod har..."
            value={pastedCode}
            onChange={(e) => setPastedCode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSaveCode()}
            className="bg-slate-800 border-slate-700 text-white"
          />
          <Button
            onClick={handleSaveCode}
            disabled={connectionLoading || !pastedCode.trim()}
            className="bg-green-600 hover:bg-green-500 text-white whitespace-nowrap"
          >
            {connectionLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              'Spara anslutning'
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function FortnoxSyncPage() {
  const [articles, setArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticles, setSelectedArticles] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [mode, setMode] = useState('manual'); // 'manual', 'suppliers', 'purchaseOrders', 'fortnoxImport', 'customers'
  const [syncingArticleId, setSyncingArticleId] = useState(null);
  const [fortnoxArticles, setFortnoxArticles] = useState([]);
  const [fortnoxLoading, setFortnoxLoading] = useState(false);
  const [fortnoxSearchTerm, setFortnoxSearchTerm] = useState('');
  const [selectedFortnoxArticles, setSelectedFortnoxArticles] = useState(new Set());
  const [importingArticles, setImportingArticles] = useState(new Set());

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

       const successMessage = type === 'articles' 
         ? `${result.data.synced} artiklar synkade framgångsrikt!`
         : type === 'suppliers'
         ? `${result.data.synced} leverantörer synkade framgångsrikt!`
         : `${result.data.synced} inköpsorder synkade framgångsrikt!`;

       toast.success(successMessage);

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
       toast.error(`Synkronisering misslyckades: ${result.data.error || result.data.errors?.[0]}`);
     }
   } catch (error) {
     console.error('Sync error:', error);
     const errorMsg = error.response?.data?.error || error.message || 'Okänt fel';
     toast.error(`Synkronisering misslyckades: ${errorMsg}`);
     setSyncResult({
       success: false,
       error: errorMsg,
       synced: 0,
       errors: [errorMsg]
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
      const errorMsg = error.response?.data?.error || error.message || 'Okänt fel';
      toast.error(`Synkronisering misslyckades: ${errorMsg}`);
    } finally {
      setSyncingArticleId(null);
      setConfirmDialog(null);
    }
  };

  const fetchFortnoxArticles = async () => {
    setFortnoxLoading(true);
    try {
      const result = await base44.functions.invoke('fetchFortnoxArticles', {});
      if (result.data.success) {
        const fortnoxArts = result.data.articles || [];
        const localSkus = new Set(articles.map(a => a.sku?.toLowerCase()));
        
        const enrichedFortnoxArticles = fortnoxArts.map(art => ({
          ...art,
          existsInLagerAI: localSkus.has(art.ArticleNumber?.toLowerCase())
        }));
        
        setFortnoxArticles(enrichedFortnoxArticles);
      } else {
        toast.error(`Kunde inte hämta Fortnox-artiklar: ${result.data.error}`);
      }
    } catch (error) {
      console.error('Error fetching Fortnox articles:', error);
      toast.error('Kunde inte hämta Fortnox-artiklar');
    } finally {
      setFortnoxLoading(false);
    }
  };

  const importFortnoxArticle = async (fortnoxArticle) => {
    setImportingArticles(prev => new Set([...prev, fortnoxArticle.ArticleNumber]));
    try {
      await base44.entities.Article.create({
        sku: fortnoxArticle.ArticleNumber,
        name: fortnoxArticle.Description || fortnoxArticle.ArticleNumber,
        unit_cost: fortnoxArticle.PurchasePrice || 0,
        storage_type: 'company_owned',
        status: 'active'
      });
      
      await fetchArticles();
      setFortnoxArticles(prev => 
        prev.map(a => 
          a.ArticleNumber === fortnoxArticle.ArticleNumber 
            ? { ...a, existsInLagerAI: true }
            : a
        )
      );
      setSelectedFortnoxArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fortnoxArticle.ArticleNumber);
        return newSet;
      });
      toast.success(`${fortnoxArticle.ArticleNumber} importerad!`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Kunde inte importera artikel');
    } finally {
      setImportingArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fortnoxArticle.ArticleNumber);
        return newSet;
      });
    }
  };

  const importSelectedFortnoxArticles = async () => {
    if (selectedFortnoxArticles.size === 0) {
      toast.error('Välj minst en artikel att importera');
      return;
    }

    setImportingArticles(selectedFortnoxArticles);
    try {
      const articlesToImport = fortnoxArticles
        .filter(a => selectedFortnoxArticles.has(a.ArticleNumber) && !a.existsInLagerAI)
        .map(a => ({
          sku: a.ArticleNumber,
          name: a.Description || a.ArticleNumber,
          unit_cost: a.PurchasePrice || 0,
          storage_type: 'company_owned',
          status: 'active'
        }));

      await Promise.all(articlesToImport.map(art => base44.entities.Article.create(art)));
      
      await fetchArticles();
      setFortnoxArticles(prev =>
        prev.map(a =>
          selectedFortnoxArticles.has(a.ArticleNumber)
            ? { ...a, existsInLagerAI: true }
            : a
        )
      );
      setSelectedFortnoxArticles(new Set());
      toast.success(`${articlesToImport.length} artiklar importerade!`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Kunde inte importera artiklar');
    } finally {
      setImportingArticles(new Set());
    }
  };

  const filteredFortnoxArticles = fortnoxArticles.filter(article =>
    !fortnoxSearchTerm ||
    article.ArticleNumber?.toLowerCase().includes(fortnoxSearchTerm.toLowerCase()) ||
    article.Description?.toLowerCase().includes(fortnoxSearchTerm.toLowerCase())
  );

  const missingFromLagerAI = filteredFortnoxArticles.filter(a => !a.existsInLagerAI);

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="mb-8"
         >
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-800 flex items-center justify-center">
                 <Settings className="w-6 h-6 text-blue-300" />
               </div>
               <div>
                 <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Fortnox Synkronisering</h1>
                 <p className="text-sm text-white/50">Synka artiklar mellan appen och Fortnox</p>
               </div>
             </div>
             <div className="group relative">
               <Button
                 onClick={() => window.open('https://apps.fortnox.se/oauth-v1/auth?client_id=mp08u6gAFPz2&redirect_uri=https%3A%2F%2Flager-ai-7d26cc74.base44.app%2FFortnoxSync&scope=companyinformation+article+project+invoice+supplierinvoice+supplier+customer+wareflow_read+wareflow_write&state=fortnox_connect&access_type=offline&response_type=code', '_blank')}
                 variant="outline"
                 size="sm"
                 className="bg-white/5 border-white/20 hover:bg-white/10 text-white/70 hover:text-white"
               >
                 <RefreshCw className="w-4 h-4 mr-2" />
                 Återanslut Fortnox
               </Button>
               <div className="absolute bottom-full right-0 mb-2 px-2 py-1 rounded text-xs text-white bg-black/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                 Klicka för att uppdatera Fortnox-behörigheter
               </div>
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
          <button
            onClick={() => setMode('fortnoxImport')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'fortnoxImport'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            Fortnox → Lager AI
          </button>
          <button
            onClick={() => setMode('customers')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'customers'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Synka Kunder
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
                <div className="overflow-x-auto -mx-6">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="p-3 text-left pl-6">
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
                      {syncResult.synced > 0 && (
                        <p>✓ {syncResult.synced} artiklar synkade framgångsrikt</p>
                      )}
                      {syncResult.errors && syncResult.errors.length > 0 && (
                        <p className="text-red-400">{syncResult.errors.join(', ')}</p>
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

        {/* Fortnox Import Mode */}
        {mode === 'fortnoxImport' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Connection Panel */}
            <FortnoxConnectionPanelInline />

            {/* Search and Controls */}
            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="Sök artikelnummer eller beskrivning..."
                  value={fortnoxSearchTerm}
                  onChange={(e) => setFortnoxSearchTerm(e.target.value)}
                  className="flex-1 bg-slate-800 border-slate-700 text-white"
                />
                <Button
                  onClick={fetchFortnoxArticles}
                  disabled={fortnoxLoading}
                  variant="outline"
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white whitespace-nowrap"
                >
                  {fortnoxLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Laddar...
                    </>
                  ) : (
                    'Uppdatera från Fortnox'
                  )}
                </Button>
                <Button
                  onClick={importSelectedFortnoxArticles}
                  disabled={selectedFortnoxArticles.size === 0 || fortnoxLoading || importingArticles.size > 0}
                  className="bg-blue-600 hover:bg-blue-500 text-white whitespace-nowrap"
                >
                  Importera {selectedFortnoxArticles.size > 0 ? `${selectedFortnoxArticles.size} ` : ''}valda
                </Button>
              </div>

              {/* Fortnox Articles Table */}
              {fortnoxLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
              ) : fortnoxArticles.length === 0 ? (
                <div className="text-center py-12 text-white/50">
                  Klicka "Uppdatera från Fortnox" för att hämta artiklar
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="p-3 text-left pl-6">
                          <Checkbox
                            checked={selectedFortnoxArticles.size === missingFromLagerAI.length && missingFromLagerAI.length > 0}
                            onChange={() => {
                              if (selectedFortnoxArticles.size === missingFromLagerAI.length && missingFromLagerAI.length > 0) {
                                setSelectedFortnoxArticles(new Set());
                              } else {
                                setSelectedFortnoxArticles(new Set(missingFromLagerAI.map(a => a.ArticleNumber)));
                              }
                            }}
                          />
                        </th>
                        <th className="p-3 text-left text-white/70">Artikelnummer</th>
                        <th className="p-3 text-left text-white/70">Beskrivning</th>
                        <th className="p-3 text-left text-white/70">Pris</th>
                        <th className="p-3 text-left text-white/70">Status</th>
                        <th className="p-3 text-left text-white/70">Åtgärder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFortnoxArticles.map((article) => (
                        <tr key={article.ArticleNumber} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-3">
                            {!article.existsInLagerAI && (
                              <Checkbox
                                checked={selectedFortnoxArticles.has(article.ArticleNumber)}
                                onChange={() => {
                                  const newSet = new Set(selectedFortnoxArticles);
                                  if (newSet.has(article.ArticleNumber)) {
                                    newSet.delete(article.ArticleNumber);
                                  } else {
                                    newSet.add(article.ArticleNumber);
                                  }
                                  setSelectedFortnoxArticles(newSet);
                                }}
                              />
                            )}
                          </td>
                          <td className="p-3 text-white font-mono">{article.ArticleNumber}</td>
                          <td className="p-3 text-white/80">{article.Description}</td>
                          <td className="p-3 text-white/80">{article.PurchasePrice || 0} SEK</td>
                          <td className="p-3">
                            {article.existsInLagerAI ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                                <CheckCircle2 className="w-3 h-3" /> Finns i Lager AI
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                                Saknas i Lager AI
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {!article.existsInLagerAI && (
                              <button
                                onClick={() => importFortnoxArticle(article)}
                                disabled={importingArticles.has(article.ArticleNumber)}
                                className="px-3 py-1 rounded text-xs font-medium transition-all bg-blue-600/30 text-blue-300 hover:bg-blue-600/50"
                              >
                                {importingArticles.has(article.ArticleNumber) ? (
                                  <>
                                    <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                                    Importerar...
                                  </>
                                ) : (
                                  'Importera'
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {fortnoxArticles.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-slate-800/50 text-sm text-white/70">
                  Totalt: {fortnoxArticles.length} artiklar i Fortnox • Saknas i Lager AI: {missingFromLagerAI.length}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Suppliers Mode */}
        {mode === 'suppliers' && (
          <SupplierSyncPanel />
        )}

        {/* Purchase Orders Mode */}
        {mode === 'purchaseOrders' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <PurchaseOrderSyncPanel />
          </motion.div>
        )}

        {/* Customers Mode */}
        {mode === 'customers' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SynkaKunderTab />
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