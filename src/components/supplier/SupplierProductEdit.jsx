import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, X, Upload } from "lucide-react";

export default function SupplierProductEdit({ article, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    name: article.name || "",
    supplier_price: article.supplier_price || "",
    supplier_product_code: article.supplier_product_code || "",
    notes: article.notes || "",
    cfg_file_url: article.cfg_file_url || ""
  });
  const [isUploadingFile, setIsUploadingFile] = useState(false);

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
    
    const updateData = {
      ...formData,
      supplier_price: formData.supplier_price ? parseFloat(formData.supplier_price) : undefined
    };
    
    onSave(updateData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redigera Produkt</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Produktnamn</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Produktkod</label>
            <Input
              value={formData.supplier_product_code}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier_product_code: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Pris (kr)</label>
            <Input
              type="number"
              step="0.01"
              value={formData.supplier_price}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier_price: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">CFG-fil</label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".cfg,.txt,.json"
                onChange={handleFileUpload}
                disabled={isUploadingFile}
                className="flex-1"
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
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Anteckningar</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={isSaving || isUploadingFile}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Sparar...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Spara ändringar
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}