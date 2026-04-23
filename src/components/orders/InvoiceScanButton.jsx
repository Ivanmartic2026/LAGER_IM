import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Zap, X, CheckCircle2, FileText, Package, Calendar, Hash, Plus, Pencil, Trash2, Save, ScanLine, Brain, Sparkles, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const SCAN_STEPS = [
  { icon: ScanLine, label: 'Läser in faktura...', color: 'text-blue-400' },
  { icon: Search, label: 'Analyserar innehåll...', color: 'text-purple-400' },
  { icon: Brain, label: 'Extraherar artiklar...', color: 'text-pink-400' },
  { icon: Sparkles, label: 'Färdigställer data...', color: 'text-emerald-400' },
];

function AILoadingOverlay() {
  const [step, setStep] = useState(0);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(prev => (prev + 1) % SCAN_STEPS.length);
    }, 900);
    // Generate random particles
    setParticles(Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    })));
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = SCAN_STEPS[step].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
    >
      {/* Floating particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-purple-400/30"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [-10, 10, -10], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      <div className="flex flex-col items-center gap-8 relative">
        {/* Pulsing ring */}
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="w-28 h-28 rounded-full flex items-center justify-center relative"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.3))', border: '1px solid rgba(139,92,246,0.5)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            {/* Spinning border arc */}
            <div className="absolute inset-0 rounded-full" style={{
              background: 'conic-gradient(from 0deg, transparent 70%, rgba(139,92,246,0.8) 100%)',
              borderRadius: '50%',
            }} />
          </motion.div>
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CurrentIcon className={`w-10 h-10 ${SCAN_STEPS[step].color}`} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Step label */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`text-lg font-semibold ${SCAN_STEPS[step].color}`}
            >
              {SCAN_STEPS[step].label}
            </motion.p>
          </AnimatePresence>
          <p className="text-white/40 text-sm mt-1">AI analyserar fakturan</p>
        </div>

        {/* Step dots */}
        <div className="flex gap-2">
          {SCAN_STEPS.map((s, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{ width: i === step ? 20 : 6, height: 6, background: i === step ? '#8b5cf6' : 'rgba(255,255,255,0.2)' }}
              animate={{ width: i === step ? 20 : 6 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function InvoiceScanButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({});
  const [loadingSupplierData, setLoadingSupplierData] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const uploadedFileUrl = useRef(null);

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date'),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const toastId = toast.loading('Analyserar faktura med AI...');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `Analysera denna faktura/följesedel noggrant och extrahera all relevant information.
        
        Hitta:
        - Fakturanummer (invoice_number)
        - Leverantörens namn (supplier_name)
        - Datum (invoice_date i format YYYY-MM-DD)
        - Totalt belopp (total_amount som nummer)
        - Valuta (currency, t.ex. SEK, EUR, USD)
        - Ordernummer om det finns (po_number)
        - Lista med artiklar/produkter (items): namn, artikelnummer, antal, enhetspris
        
        Returnera strukturerad JSON.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            invoice_number: { type: "string" },
            supplier_name: { type: "string" },
            invoice_date: { type: "string" },
            total_amount: { type: "number" },
            currency: { type: "string" },
            po_number: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  article_number: { type: "string" },
                  quantity: { type: "number" },
                  unit_price: { type: "number" }
                }
              }
            }
          }
        }
      });

      toast.success('Faktura analyserad!', { id: toastId });
      setResult({ ...extracted, file_url, items: extracted.items || [] });
      uploadedFileUrl.current = file_url;
    } catch (error) {
      console.error('Invoice scan error:', error);
      const errorMsg = error.message.includes('Unsupported file type') 
        ? 'Filformat stöds inte. Använd PDF, JPG, PNG eller XLSX.' 
        : 'Kunde inte analysera fakturan: ' + error.message;
      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateField = (field, value) => {
    setResult(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (index, field, value) => {
    setResult(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const removeItem = (index) => {
    setResult(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const addItem = () => {
    setResult(prev => ({
      ...prev,
      items: [...prev.items, { name: '', article_number: '', quantity: 1, unit_price: 0 }]
    }));
    setEditingItemIndex(result.items.length);
  };

  const handleExtractSupplierData = async () => {
    if (!uploadedFileUrl.current || !result.supplier_name) {
      toast.error('Faktura krävs för att extrahera leverantörsdata');
      return;
    }

    setLoadingSupplierData(true);
    try {
      const response = await base44.functions.invoke('parseImage', {
        image_url: uploadedFileUrl.current,
        prompt: `Extract supplier contact information from this invoice. Return a JSON object with these fields (use empty string if not found): 
        - contact_person: Name of contact person
        - email: Email address
        - phone: Phone number
        - address: Physical address
        - website: Website URL
        Look for the supplier/sender information, not the recipient. Supplier name is: "${result.supplier_name}"`
      });

      if (response.data && typeof response.data === 'object') {
        setNewSupplierData(prev => ({
          name: result.supplier_name,
          contact_person: response.data.contact_person || prev.contact_person || '',
          email: response.data.email || prev.email || '',
          phone: response.data.phone || prev.phone || '',
          address: response.data.address || prev.address || '',
          website: response.data.website || prev.website || ''
        }));
        toast.success('Leverantördata extraherad från fakturan');
      }
    } catch (error) {
      toast.error('Kunde inte extrahera leverantördata: ' + error.message);
    } finally {
      setLoadingSupplierData(false);
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierData.name) {
      toast.error('Leverantörnamn är obligatoriskt');
      return;
    }
    
    setIsSaving(true);
    try {
      const created = await base44.entities.Supplier.create(newSupplierData);
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setResult(prev => ({ ...prev, supplier_name: created.name }));
      setCreatingSupplier(false);
      setNewSupplierData({});
      toast.success(`Leverantör "${created.name}" skapad!`);
    } catch (error) {
      toast.error('Kunde inte skapa leverantör: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateOrder = async () => {
    setIsSaving(true);
    try {
      // Find or create supplier
      let supplierId = null;
      if (result.supplier_name) {
        const existingSupplier = suppliers.find(s =>
          s.name.toLowerCase() === result.supplier_name.toLowerCase()
        );
        if (existingSupplier) {
          supplierId = existingSupplier.id;
        } else {
          // Check if supplier was just created
          const updatedSuppliers = await base44.entities.Supplier.list();
          const newlyCreated = updatedSuppliers.find(s =>
            s.name.toLowerCase() === result.supplier_name.toLowerCase()
          );
          if (newlyCreated) {
            supplierId = newlyCreated.id;
          }
        }
      }

      // Create the purchase order
      const po = await base44.entities.PurchaseOrder.create({
        supplier_name: result.supplier_name || 'Okänd leverantör',
        supplier_id: supplierId || undefined,
        po_number: result.po_number || result.invoice_number || '',
        invoice_number: result.invoice_number || '',
        invoice_amount: result.total_amount || 0,
        invoice_currency: (['SEK','EUR','USD','GBP','NOK','DKK'].includes((result.currency || '').toUpperCase()) ? result.currency.toUpperCase() : 'USD'),
        invoice_file_url: result.file_url,
        order_date: result.invoice_date || new Date().toISOString().split('T')[0],
        status: 'draft',
        notes: `Skapad från faktura ${result.invoice_number || ''}`.trim(),
      });

      // Create PO items - search for matching article or create with placeholder
      if (result.items && result.items.length > 0) {
        for (const item of result.items) {
          if (!item.name) continue;

          // Try to find matching article by name or article_number
          let articleId = null;
          try {
            const allArticles = await base44.entities.Article.list();
            const match = allArticles.find(a =>
              (item.article_number && a.sku?.toLowerCase() === item.article_number.toLowerCase()) ||
              (item.article_number && a.batch_number?.toLowerCase() === item.article_number.toLowerCase()) ||
              a.name?.toLowerCase().includes(item.name.toLowerCase().slice(0, 20))
            );
            if (match) {
              articleId = match.id;
              // Update invoice reference if not set
              if (!match.source_invoice_url) {
                await base44.entities.Article.update(articleId, {
                  source_invoice_url: result.file_url,
                  source_invoice_number: result.invoice_number || '',
                  source_purchase_order_id: po.id,
                });
              }
            }
          } catch {}

          // If no article found, create a placeholder article
          if (!articleId) {
            const newArticle = await base44.entities.Article.create({
              name: item.name,
              sku: item.article_number || '',
              storage_type: 'company_owned',
              status: 'pending_verification',
              stock_qty: 0,
              source_invoice_url: result.file_url,
              source_invoice_number: result.invoice_number || '',
              source_purchase_order_id: po.id,
            });
            articleId = newArticle.id;
          }

          await base44.entities.PurchaseOrderItem.create({
            purchase_order_id: po.id,
            article_id: articleId,
            article_name: item.name,
            quantity_ordered: item.quantity || 1,
            unit_price: item.unit_price || 0,
            status: 'pending',
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrderItems'] });
      toast.success(`Inköpsorder skapad: ${po.po_number || po.supplier_name}!`);
      setResult(null);
    } catch (error) {
      toast.error('Kunde inte skapa inköpsorder: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkToOrder = async (po) => {
    setIsSaving(true);
    try {
      await base44.entities.PurchaseOrder.update(po.id, {
        invoice_number: result.invoice_number || po.invoice_number,
        invoice_amount: result.total_amount || po.invoice_amount,
        invoice_currency: (['SEK','EUR','USD','GBP','NOK','DKK'].includes((result.currency || '').toUpperCase()) ? result.currency.toUpperCase() : (po.invoice_currency || 'SEK')),
        invoice_file_url: result.file_url,
      });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success(`Faktura kopplad till ${po.po_number || po.supplier_name}!`);
      setResult(null);
    } catch (error) {
      toast.error('Kunde inte koppla faktura: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const matchingPOs = purchaseOrders.filter(po => {
    if (result?.po_number && po.po_number?.toLowerCase().includes(result.po_number.toLowerCase())) return true;
    if (result?.supplier_name && po.supplier_name?.toLowerCase().includes(result.supplier_name.toLowerCase())) return true;
    return false;
  });

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/50 transition-all duration-300"
      >
        <Zap className="w-4 h-4 mr-2" />
        {isLoading ? 'Analyserar...' : 'Skanna faktura'}
      </Button>

      <AnimatePresence>
        {isLoading && <AILoadingOverlay />}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-slate-900 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Faktura analyserad</h3>
                    <p className="text-xs text-white/50">Redigera och skapa inköpsorder</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setResult(null)} className="text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-5 space-y-4">
                {/* Supplier check - show warning if not found */}
                {result.supplier_name && !suppliers.find(s => s.name.toLowerCase() === result.supplier_name.toLowerCase()) && !creatingSupplier && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-sm text-yellow-300 font-medium mb-2">⚠️ Leverantören "{result.supplier_name}" finns inte</p>
                    <Button 
                      size="sm" 
                      onClick={() => setCreatingSupplier(true)}
                      className="bg-yellow-600 hover:bg-yellow-500 text-white h-7 text-xs w-full"
                    >
                      Lägg upp leverantören
                    </Button>
                  </div>
                )}

                {/* New supplier form */}
                 {creatingSupplier && (
                   <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-2">
                     <Input
                       value={newSupplierData.name || ''}
                       onChange={(e) => setNewSupplierData(prev => ({ ...prev, name: e.target.value }))}
                       placeholder="Leverantörnamn"
                       className="h-8 text-sm bg-white/10 border-white/20 text-white"
                     />
                     <Input
                       value={newSupplierData.contact_person || ''}
                       onChange={(e) => setNewSupplierData(prev => ({ ...prev, contact_person: e.target.value }))}
                       placeholder="Kontaktperson"
                       className="h-8 text-sm bg-white/10 border-white/20 text-white"
                     />
                     <Input
                       value={newSupplierData.email || ''}
                       onChange={(e) => setNewSupplierData(prev => ({ ...prev, email: e.target.value }))}
                       placeholder="E-postadress"
                       className="h-8 text-sm bg-white/10 border-white/20 text-white"
                     />
                     <Input
                       value={newSupplierData.phone || ''}
                       onChange={(e) => setNewSupplierData(prev => ({ ...prev, phone: e.target.value }))}
                       placeholder="Telefonnummer"
                       className="h-8 text-sm bg-white/10 border-white/20 text-white"
                     />
                     <Input
                       value={newSupplierData.address || ''}
                       onChange={(e) => setNewSupplierData(prev => ({ ...prev, address: e.target.value }))}
                       placeholder="Adress"
                       className="h-8 text-sm bg-white/10 border-white/20 text-white"
                     />
                     <Input
                       value={newSupplierData.website || ''}
                       onChange={(e) => setNewSupplierData(prev => ({ ...prev, website: e.target.value }))}
                       placeholder="Webbsida (valfritt)"
                       className="h-8 text-sm bg-white/10 border-white/20 text-white"
                     />
                     <Button 
                       size="sm" 
                       onClick={handleExtractSupplierData}
                       disabled={loadingSupplierData}
                       variant="ghost"
                       className="w-full h-7 text-blue-300 hover:text-blue-200 text-xs"
                     >
                       {loadingSupplierData ? 'Extraherar...' : '✨ Extrahera från faktura'}
                     </Button>
                     <div className="flex gap-2 pt-1">
                       <Button 
                         size="sm" 
                         variant="ghost"
                         onClick={() => {
                           setCreatingSupplier(false);
                           setNewSupplierData({});
                         }}
                         className="flex-1 h-7 text-white/50 hover:text-white"
                       >
                         Avbryt
                       </Button>
                       <Button 
                         size="sm" 
                         onClick={handleCreateSupplier}
                         disabled={isSaving}
                         className="flex-1 bg-blue-600 hover:bg-blue-500 h-7"
                       >
                         {isSaving ? 'Sparar...' : 'Skapa'}
                       </Button>
                     </div>
                   </div>
                 )}

                {/* Editable fields */}
                <div className="space-y-2">
                  {[
                    { key: 'supplier_name', label: 'Leverantör', IconComp: Package },
                    { key: 'invoice_number', label: 'Fakturanummer', IconComp: Hash },
                    { key: 'invoice_date', label: 'Datum', IconComp: Calendar },
                  ].map(({ key, label, IconComp }) => (
                    <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 group">
                      <IconComp className="w-4 h-4 text-white/40 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/40">{label}</div>
                        {editingField === key ? (
                          <Input
                            value={result[key] || ''}
                            onChange={(e) => updateField(key, e.target.value)}
                            onBlur={() => setEditingField(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                            autoFocus
                            className="h-7 text-sm bg-white/10 border-white/20 text-white mt-0.5 p-1"
                          />
                        ) : (
                          <div className="text-sm font-medium text-white truncate">{result[key] || '—'}</div>
                        )}
                      </div>
                      <button onClick={() => setEditingField(editingField === key ? null : key)} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Amount + currency */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 group">
                    <Zap className="w-4 h-4 text-white/40 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/40">Belopp</div>
                      {editingField === 'amount' ? (
                        <div className="flex gap-2 mt-0.5">
                          <Input
                            type="number"
                            value={result.total_amount || ''}
                            onChange={(e) => updateField('total_amount', parseFloat(e.target.value) || 0)}
                            className="h-7 text-sm bg-white/10 border-white/20 text-white p-1 flex-1"
                          />
                          <Input
                            value={result.currency || ''}
                            onChange={(e) => updateField('currency', e.target.value)}
                            onBlur={() => setEditingField(null)}
                            className="h-7 text-sm bg-white/10 border-white/20 text-white p-1 w-20"
                            placeholder="USD"
                          />
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-white">
                          {result.total_amount ? `${result.total_amount.toLocaleString('sv-SE')} ${result.currency || 'USD'}` : '—'}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setEditingField(editingField === 'amount' ? null : 'amount')} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                      Artiklar ({result.items.length})
                    </p>
                    <button onClick={addItem} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Lägg till
                    </button>
                  </div>
                  <div className="space-y-2">
                    {result.items.map((item, i) => (
                      <div key={i} className="rounded-lg bg-white/5 border border-white/5 overflow-hidden">
                        {editingItemIndex === i ? (
                          <div className="p-3 space-y-2">
                            <Input
                              value={item.name || ''}
                              onChange={(e) => updateItem(i, 'name', e.target.value)}
                              placeholder="Artikelnamn"
                              className="h-8 text-sm bg-white/10 border-white/20 text-white"
                            />
                            <div className="flex gap-2">
                              <Input
                                value={item.article_number || ''}
                                onChange={(e) => updateItem(i, 'article_number', e.target.value)}
                                placeholder="Art.nr"
                                className="h-8 text-sm bg-white/10 border-white/20 text-white flex-1"
                              />
                              <Input
                                type="number"
                                value={item.quantity || ''}
                                onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 0)}
                                placeholder="Antal"
                                className="h-8 text-sm bg-white/10 border-white/20 text-white w-20"
                              />
                              <Input
                                type="number"
                                value={item.unit_price || ''}
                                onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                                placeholder="Pris"
                                className="h-8 text-sm bg-white/10 border-white/20 text-white w-24"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300 h-7 px-2">
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Ta bort
                              </Button>
                              <Button size="sm" onClick={() => setEditingItemIndex(null)} className="bg-blue-600 hover:bg-blue-500 h-7 px-3">
                                <Save className="w-3.5 h-3.5 mr-1" /> Klar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-2.5 text-sm group">
                            <div className="flex-1 min-w-0 pr-2">
                              <span className="text-white">{item.name || '—'}</span>
                              {item.article_number && item.article_number !== 'N/A' && (
                                <span className="text-white/40 ml-2 text-xs">#{item.article_number}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-white/60 text-xs">
                                {item.quantity} st{item.unit_price ? ` · ${item.unit_price} ${result.currency || 'USD'}` : ''}
                              </span>
                              <button onClick={() => setEditingItemIndex(i)} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  {/* Create new PO */}
                  <Button
                    onClick={handleCreateOrder}
                    disabled={isSaving}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    {isSaving ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Skapar...</>
                    ) : (
                      <><Plus className="w-4 h-4 mr-2" />Skapa ny inköpsorder</>
                    )}
                  </Button>

                  {/* Link to existing PO */}
                  {matchingPOs.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 text-center mb-2">eller koppla till befintlig order</p>
                      <div className="space-y-2">
                        {matchingPOs.map(po => (
                          <button
                            key={po.id}
                            onClick={() => handleLinkToOrder(po)}
                            disabled={isSaving}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all text-left"
                          >
                            <div>
                              <div className="text-sm font-medium text-white">{po.po_number || `PO #${po.id.slice(0, 8)}`}</div>
                              <div className="text-xs text-white/50">{po.supplier_name}</div>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-blue-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}