import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Plus, FileUp } from "lucide-react";

export default function SupplierProductUpload({ supplierId }) {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    supplier_product_code: "",
    supplier_price: "",
    stock_qty: "",
    notes: "",
    cfg_file_url: ""
  });
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const queryClient = useQueryClient();

  const createArticleMutation = useMutation({
    mutationFn: (data) => base44.entities.Article.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-articles'] });
      toast.success("Produkt skapad!");
      setFormData({
        name: "",
        sku: "",
        supplier_product_code: "",
        supplier_price: "",
        stock_qty: "",
        notes: "",
        cfg_file_url: ""
      });
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, cfg_file_url: file_url }));
      toast.success("CFG-fil uppladdad");
    } catch (error) {
      toast.error("Kunde inte ladda upp fil");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const articleData = {
      ...formData,
      supplier_id: supplierId,
      supplier_price: formData.supplier_price ? parseFloat(formData.supplier_price) : undefined,
      stock_qty: formData.stock_qty ? parseInt(formData.stock_qty) : 0,
      storage_type: "company_owned",
      status: "active"
    };

    createArticleMutation.mutate(articleData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Lägg till ny produkt
        </CardTitle>
        <CardDescription>
          Fyll i produktinformation och ladda upp eventuell CFG-fil
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Produktnamn *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="LED Panel 1200x600"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                SKU / Artikelnummer
              </label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="ART-12345"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Leverantörens produktkod
              </label>
              <Input
                value={formData.supplier_product_code}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_product_code: e.target.value }))}
                placeholder="SUP-ABC-123"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Pris (kr)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.supplier_price}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_price: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Lagersaldo
              </label>
              <Input
                type="number"
                value={formData.stock_qty}
                onChange={(e) => setFormData(prev => ({ ...prev, stock_qty: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              CFG-fil (valfritt)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="file"
                accept=".cfg,.txt,.json"
                onChange={handleFileUpload}
                disabled={isUploadingFile}
                className="flex-1 text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                id="cfg-file-upload"
              />
              {formData.cfg_file_url && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(formData.cfg_file_url, '_blank')}
                >
                  Visa
                </Button>
              )}
            </div>
            {isUploadingFile && (
              <p className="text-sm text-slate-500 mt-2">Laddar upp...</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Anteckningar
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Ytterligare information om produkten..."
              rows={4}
            />
          </div>

          <Button
            type="submit"
            disabled={createArticleMutation.isPending || isUploadingFile}
            className="w-full"
          >
            {createArticleMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Skapar produkt...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Lägg till produkt
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}