import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, Download, Trash2, Image } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

const documentTypes = [
  { value: 'packing_list', label: 'Packlista' },
  { value: 'commercial_invoice', label: 'Faktura' },
  { value: 'test_protocol', label: 'Testprotokoll' },
  { value: 'qc_document', label: 'QC-dokument' },
  { value: 'certificate_ce', label: 'CE-certifikat' },
  { value: 'certificate_rohs', label: 'RoHS-certifikat' },
  { value: 'certificate_ip', label: 'IP-klassning' },
  { value: 'certificate_other', label: 'Annat certifikat' },
  { value: 'manual', label: 'Manual' },
  { value: 'datasheet', label: 'Produktblad' },
  { value: 'batch_image', label: 'Batchbild' },
  { value: 'label_image', label: 'Etikettbild' },
  { value: 'other', label: 'Övrigt' }
];

export default function SupplierPODocuments({ purchaseOrder, supplierName, supplierEmail }) {
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('packing_list');
  const [notes, setNotes] = useState('');

  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['supplier-documents', purchaseOrder.id],
    queryFn: () => base44.entities.SupplierDocument.filter({ 
      purchase_order_id: purchaseOrder.id 
    })
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type, notes }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const existingDocs = documents.filter(d => d.document_type === type);
      const version = `v${existingDocs.length + 1}`;

      await base44.entities.SupplierDocument.create({
        purchase_order_id: purchaseOrder.id,
        document_type: type,
        file_url,
        file_name: file.name,
        version,
        upload_date: new Date().toISOString(),
        uploaded_by: supplierEmail,
        uploaded_by_name: supplierName,
        notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-documents'] });
      toast.success('Dokument uppladdat');
      setNotes('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SupplierDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-documents'] });
      toast.success('Dokument borttaget');
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadMutation.mutateAsync({ file, type: selectedType, notes });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const groupedDocs = documentTypes.map(type => ({
    ...type,
    docs: documents.filter(d => d.document_type === type.value).sort((a, b) => 
      new Date(b.upload_date) - new Date(a.upload_date)
    )
  })).filter(group => group.docs.length > 0 || group.value === selectedType);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ladda upp dokumentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Dokumenttyp</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Kommentarer (valfritt)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="T.ex. vilket batch detta gäller..."
              className="mt-2"
              rows={2}
            />
          </div>

          <div>
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              id="doc-upload"
              disabled={uploading}
            />
            <label htmlFor="doc-upload">
              <Button asChild disabled={uploading} className="w-full cursor-pointer">
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Laddar upp...' : 'Välj fil'}
                </span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Documents list */}
      <div className="space-y-4">
        {groupedDocs.map(group => (
          <Card key={group.value}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{group.label}</CardTitle>
                <Badge variant="outline">{group.docs.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.docs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Inga dokument uppladdade
                </p>
              ) : (
                group.docs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      {doc.file_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                        <Image className="w-4 h-4 text-blue-500" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{doc.file_name}</div>
                        <div className="text-xs text-slate-500">
                          {doc.version} • {format(new Date(doc.upload_date), "d MMM yyyy HH:mm", { locale: sv })}
                        </div>
                        {doc.notes && (
                          <div className="text-xs text-slate-600 mt-1">{doc.notes}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-slate-200 rounded"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                      </a>
                      <button
                        onClick={() => deleteMutation.mutate(doc.id)}
                        className="p-2 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}