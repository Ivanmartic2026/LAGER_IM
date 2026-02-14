import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertCircle, Download, X, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function SupplierDocumentUpload() {
  const [token, setToken] = useState("");
  const [po, setPO] = useState(null);
  const [error, setError] = useState(null);
  const [uploadType, setUploadType] = useState("packing_list");
  const [notes, setNotes] = useState("");
  const [itemBatches, setItemBatches] = useState({}); // {itemId: [{batch_no, quantity, prod_date, evidence_file}, ...]}
  const [currentTab, setCurrentTab] = useState("batch"); // batch or documents

  const queryClient = useQueryClient();

  // Get token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      setToken(t);
      fetchPOByToken(t);
    } else {
      setError("Ingen giltig länk");
    }
  }, []);

  const fetchPOByToken = async (t) => {
    try {
      const orders = await base44.entities.PurchaseOrder.list();
      const foundPO = orders.find(p => p.supplier_portal_token === t);
      
      if (!foundPO) {
        setError("Inköpsorder hittades inte eller länken är ogiltig");
        return;
      }

      setPO(foundPO);
    } catch (err) {
      setError("Kunde inte hämta inköpsorder");
    }
  };

  const { data: purchaseOrderItems = [] } = useQuery({
    queryKey: ['purchaseOrderItems', po?.id],
    queryFn: () => po ? base44.entities.PurchaseOrderItem.list() : Promise.resolve([]),
    enabled: !!po
  });

  const { data: supplierDocuments = [] } = useQuery({
    queryKey: ['supplierDocuments', po?.id],
    queryFn: () => po ? base44.entities.SupplierDocument.list() : Promise.resolve([]),
    enabled: !!po
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type, notes }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.SupplierDocument.create({
        purchase_order_id: po.id,
        document_type: type,
        file_url,
        file_name: file.name,
        notes,
        upload_date: new Date().toISOString(),
        uploaded_by: "supplier"
      });

      return file;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierDocuments', po?.id] });
      setUploadType("packing_list");
      setNotes("");
      toast.success("Dokument uppladdad!");
    },
    onError: (error) => {
      toast.error("Kunde inte ladda upp dokument: " + error.message);
    }
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadMutation.mutate({
      file,
      type: uploadType,
      notes
    });
  };

  const documentTypeLabels = {
    packing_list: "Packlista",
    qc_document: "QC/Testprotokoll",
    certificate_ce: "CE-certifikat",
    certificate_rohs: "RoHS-certifikat",
    certificate_other: "Annat certifikat",
    batch_image: "Batchbild",
    other: "Annat dokument"
  };

  const poItems = purchaseOrderItems.filter(item => item.purchase_order_id === po?.id);
  const poDocuments = supplierDocuments.filter(doc => doc.purchase_order_id === po?.id);

  // Initialize batch state for items
  useEffect(() => {
    if (poItems.length > 0) {
      const newState = {};
      poItems.forEach(item => {
        if (!itemBatches[item.id]) {
          newState[item.id] = item.supplier_batch_numbers || [];
        }
      });
      if (Object.keys(newState).length > 0) {
        setItemBatches(prev => ({ ...prev, ...newState }));
      }
    }
  }, [poItems]);

  // Validate all items have correct batch quantities
  const validateBatches = () => {
    for (const item of poItems) {
      const batches = itemBatches[item.id] || [];
      if (batches.length === 0) {
        toast.error(`${item.article_name} saknar batchinformation`);
        return false;
      }
      const totalQty = batches.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
      const confirmedQty = item.quantity_confirmed || item.quantity_ordered || 0;
      if (Math.abs(totalQty - confirmedQty) > 0.01) {
        toast.error(`${item.article_name}: Summa batchkvantiteter (${totalQty}) matchar inte bekräftat antal (${confirmedQty})`);
        return false;
      }
      // Check that each batch has evidence
      for (const batch of batches) {
        if (!batch.evidence_file) {
          toast.error(`${item.article_name} - Batch ${batch.batch_no}: Behöver bevis (foto/dokument)`);
          return false;
        }
      }
    }
    return true;
  };

  const submitAllBatches = async () => {
    if (!validateBatches()) return;

    const loadingToastId = toast.loading("Sparar batchinformation...");

    try {
      for (const item of poItems) {
        const batches = itemBatches[item.id] || [];
        await base44.entities.PurchaseOrderItem.update(item.id, {
          supplier_batch_numbers: batches.map(b => ({
            batch_no: b.batch_no,
            quantity: parseFloat(b.quantity),
            production_date: b.prod_date || null,
            comment: b.comment || null
          }))
        });
      }

      toast.success("Batchinformation sparad!", { id: loadingToastId });
      setCurrentTab("documents");
    } catch (error) {
      toast.error("Kunde inte spara batchinformation: " + error.message, { id: loadingToastId });
    }
  };

  const addBatchToItem = (itemId) => {
    setItemBatches(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), { batch_no: '', quantity: '', prod_date: '', comment: '', evidence_file: null }]
    }));
  };

  const updateBatch = (itemId, batchIdx, field, value) => {
    setItemBatches(prev => {
      const newBatches = [...(prev[itemId] || [])];
      newBatches[batchIdx] = { ...newBatches[batchIdx], [field]: value };
      return { ...prev, [itemId]: newBatches };
    });
  };

  const removeBatch = (itemId, batchIdx) => {
    setItemBatches(prev => {
      const newBatches = (prev[itemId] || []).filter((_, i) => i !== batchIdx);
      return { ...prev, [itemId]: newBatches };
    });
  };

  const uploadBatchEvidence = async (itemId, batchIdx, file) => {
    if (!file) return;

    const uploadToastId = toast.loading("Laddar upp bevis...");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateBatch(itemId, batchIdx, 'evidence_file', file_url);
      toast.success("Bevis uppladdad!", { id: uploadToastId });
    } catch (error) {
      toast.error("Kunde inte ladda upp bevis", { id: uploadToastId });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Fel</h1>
          <p className="text-white/50">{error}</p>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white/50 mt-4">Laddar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Ladda upp dokumentation
          </h1>
          <p className="text-white/50">
            Inköpsorder {po.po_number || `PO-${po.id.slice(0, 8)}`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Upload Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white/5 border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Ladda upp dokument</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Dokumenttyp
                  </label>
                  <Select value={uploadType} onValueChange={setUploadType}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10">
                      <SelectItem value="packing_list">Packlista</SelectItem>
                      <SelectItem value="qc_document">QC/Testprotokoll</SelectItem>
                      <SelectItem value="certificate_ce">CE-certifikat</SelectItem>
                      <SelectItem value="certificate_rohs">RoHS-certifikat</SelectItem>
                      <SelectItem value="certificate_other">Annat certifikat</SelectItem>
                      <SelectItem value="batch_image">Batchbild</SelectItem>
                      <SelectItem value="other">Annat dokument</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Anteckningar (valfritt)
                  </label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="t.ex. Batch #12345, Produktionsdatum: 2024-01-15"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Fil
                  </label>
                  <label className="block border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-white/40 transition-colors">
                    <Upload className="w-8 h-8 text-white/50 mx-auto mb-2" />
                    <p className="text-white/70 font-medium">Klicka för att välja fil</p>
                    <p className="text-xs text-white/40 mt-1">PDF, JPG, PNG eller Excel</p>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploadMutation.isPending}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                    />
                  </label>
                </div>

                {uploadMutation.isPending && (
                  <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
                    <p className="text-sm text-blue-400">Laddar upp...</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Info & Progress */}
          <div className="space-y-6">
            {/* Order Info */}
            <Card className="bg-white/5 border-white/10 p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Orderdetaljer</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-white/40">Leverantör</p>
                  <p className="text-white font-medium">{po.supplier_name}</p>
                </div>
                {po.expected_delivery_date && (
                  <div>
                    <p className="text-white/40">Förväntat leveransdatum</p>
                    <p className="text-white font-medium">
                      {format(new Date(po.expected_delivery_date), "d MMM yyyy", { locale: sv })}
                    </p>
                  </div>
                )}
                {po.invoice_number && (
                  <div>
                    <p className="text-white/40">Fakturanummer</p>
                    <p className="text-white font-medium">{po.invoice_number}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Uploaded Documents */}
            <Card className="bg-white/5 border-white/10 p-4">
              <h3 className="text-sm font-semibold text-white mb-3">
                Uppladdade dokument ({poDocuments.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {poDocuments.length === 0 ? (
                  <p className="text-sm text-white/40">Inga dokument ännu</p>
                ) : (
                  poDocuments.map((doc) => (
                    <div key={doc.id} className="bg-white/5 rounded p-2 border border-white/10 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-white truncate font-medium">
                          {documentTypeLabels[doc.document_type]}
                        </p>
                        <p className="text-xs text-white/40 truncate">{doc.file_name}</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Required Items */}
            <Card className="bg-white/5 border-white/10 p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Artiklar</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {poItems.length === 0 ? (
                  <p className="text-sm text-white/40">Inga artiklar</p>
                ) : (
                  poItems.map((item) => (
                    <div key={item.id} className="bg-white/5 rounded p-2 border border-white/10">
                      <p className="text-xs text-white font-medium truncate">
                        {item.article_name}
                      </p>
                      <p className="text-xs text-white/50">
                        {item.quantity_ordered} st
                      </p>
                      {item.supplier_batch_numbers && item.supplier_batch_numbers.length > 0 && (
                        <Badge className="mt-1 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          <CheckCircle2 className="w-2 h-2 mr-1" />
                          Batch angiven
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}