import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, Plus, Search, Pencil, Trash2, 
  Mail, Phone, MapPin, Globe, Clock, UserCircle, Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SupplierForm from "@/components/suppliers/SupplierForm";

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [importingSupplierData, setImportingSupplierData] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef(null);
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date'),
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const createSupplierMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Leverantör skapad');
      setShowForm(false);
      setEditingSupplier(null);
    }
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Leverantör uppdaterad');
      setShowForm(false);
      setEditingSupplier(null);
    }
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Leverantör raderad');
    }
  });

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const handleDelete = async (supplier) => {
    const articlesWithSupplier = articles.filter(a => a.supplier_id === supplier.id);
    if (articlesWithSupplier.length > 0) {
      if (!confirm(`${articlesWithSupplier.length} artiklar är kopplade till denna leverantör. Vill du fortsätta?`)) {
        return;
      }
    }
    deleteSupplierMutation.mutate(supplier.id);
  };

  const handleSave = async (data) => {
    if (editingSupplier) {
      await updateSupplierMutation.mutateAsync({ id: editingSupplier.id, data });
    } else {
      await createSupplierMutation.mutateAsync(data);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const loadingToast = toast.loading(`Läser in ${file.name}...`);

    try {
      toast.loading('Laddar upp fil...', { id: loadingToast });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      toast.loading('Analyserar leverantörsdata...', { id: loadingToast });
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analysera detta dokument (PDF eller bild) och extrahera all information om en leverantör.

Leta efter följande information:
- Företagsnamn
- Kontaktperson
- E-postadress
- Telefonnummer
- Adress
- Webbsida
- Standard leveranstid (i dagar)
- Övriga anteckningar

Returnera all information du hittar.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            contact_person: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            address: { type: "string" },
            website: { type: "string" },
            standard_delivery_days: { type: "number" },
            notes: { type: "string" }
          }
        }
      });

      if (result && result.name) {
        toast.success('Leverantörsdata extraherad!', { id: loadingToast });
        setImportingSupplierData(result);
        setEditingSupplier(null);
        setShowForm(true);
      } else {
        toast.error('Kunde inte hitta leverantörsdata i filen', { id: loadingToast });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Kunde inte läsa filen: ' + error.message, { id: loadingToast });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getArticleCount = (supplierId) => {
    return articles.filter(a => a.supplier_id === supplierId).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Leverantörer</h1>
            <p className="text-slate-400">Hantera leverantörer och kontaktinformation</p>
          </div>

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleImportFile}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              variant="outline"
              className="bg-slate-800/50 border-slate-700 hover:bg-slate-700"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-blue-400 rounded-full animate-spin mr-2" />
                  Läser in...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importera
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setEditingSupplier(null);
                setImportingSupplierData(null);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ny leverantör
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök leverantör..."
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Suppliers Grid */}
        {isLoading ? (
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Inga leverantörer
            </h3>
            <p className="text-slate-400">
              {searchQuery ? 'Inga leverantörer matchar din sökning' : 'Lägg till din första leverantör'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {filteredSuppliers.map((supplier) => (
                <motion.div
                  key={supplier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    "p-6 rounded-2xl border transition-all",
                    supplier.is_active
                      ? "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
                      : "bg-slate-800/30 border-slate-700/30 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-white">
                            {supplier.name}
                          </h3>
                          {!supplier.is_active && (
                            <Badge variant="outline" className="bg-slate-700/50 text-slate-400 border-slate-600">
                              Inaktiv
                            </Badge>
                          )}
                          {getArticleCount(supplier.id) > 0 && (
                            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {getArticleCount(supplier.id)} artiklar
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-400 mt-3">
                          {supplier.contact_person && (
                            <div className="flex items-center gap-2">
                              <UserCircle className="w-4 h-4" />
                              <span>{supplier.contact_person}</span>
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <a href={`mailto:${supplier.email}`} className="hover:text-blue-400">
                                {supplier.email}
                              </a>
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <a href={`tel:${supplier.phone}`} className="hover:text-blue-400">
                                {supplier.phone}
                              </a>
                            </div>
                          )}
                          {supplier.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4" />
                              <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                                Webbsida
                              </a>
                            </div>
                          )}
                          {supplier.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{supplier.address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{supplier.standard_delivery_days || 7} dagars leverans</span>
                          </div>
                        </div>

                        {supplier.notes && (
                          <p className="text-sm text-slate-400 mt-3 line-clamp-2">
                            {supplier.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(supplier)}
                        className="text-slate-400 hover:text-white hover:bg-slate-800"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(supplier)}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-950/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <SupplierForm
            supplier={editingSupplier || importingSupplierData}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingSupplier(null);
              setImportingSupplierData(null);
            }}
            isSaving={createSupplierMutation.isPending || updateSupplierMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}