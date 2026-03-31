import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { toast } from 'sonner';
import { Upload, FileText, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const DOC_TYPES = [
  { value: 'quality_report',     label: 'QC Report',                   phase: 'production' },
  { value: 'test_protocol',      label: 'Test Protocol',               phase: 'production' },
  { value: 'qc_photos',          label: 'QC Photos / Videos',          phase: 'production' },
  { value: 'rcfgx_file',         label: 'RCFGX / Nova Card Files',     phase: 'production' },
  { value: 'commercial_invoice', label: 'Commercial Invoice',          phase: 'ready_for_shipment' },
  { value: 'packing_list',       label: 'Packing List',                phase: 'ready_for_shipment' },
  { value: 'customs_document',   label: 'HS Code Declaration',         phase: 'ready_for_shipment' },
  { value: 'ce_certificate',     label: 'CE / RoHS Certificate',       phase: 'ready_for_shipment' },
  { value: 'bill_of_lading',     label: 'Bill of Lading / Airway Bill',phase: 'in_transit' },
  { value: 'other',              label: 'Other Document',              phase: 'production' },
];

export default function SupplierDocumentUploadHub({ purchaseOrder, poToken }) {
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('other');
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['supplier-po-documents', purchaseOrder.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('supplierGetDocuments', { action: 'list', token: poToken });
      return res.data?.documents || [];
    },
    enabled: !!poToken,
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId) => {
      const res = await base44.functions.invoke('supplierGetDocuments', {
        action: 'delete',
        token: poToken,
        document_id: documentId,
      });
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-po-documents', purchaseOrder.id] });
      toast.success('Document removed');
    },
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('token', poToken);

      const fnUrl = `https://api.base44.com/api/apps/${appParams.appId}/functions/supplierUploadFile`;
      const uploadRes = await fetch(fnUrl, { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      const file_url = uploadData?.file_url;
      if (!file_url) throw new Error(uploadData?.error || 'Upload failed');

      const docDef = DOC_TYPES.find(d => d.value === selectedType);
      const res = await base44.functions.invoke('supplierGetDocuments', {
        action: 'create',
        token: poToken,
        document_type: selectedType,
        document_phase: docDef?.phase || 'production',
        file_url,
        file_name: file.name,
      });
      if (res.data?.error) throw new Error(res.data.error);

      queryClient.invalidateQueries({ queryKey: ['supplier-po-documents', purchaseOrder.id] });
      toast.success('Document uploaded!');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Upload area */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50">
        <div className="flex flex-col items-center gap-3 mb-4">
          <Upload className="w-8 h-8 text-gray-400" />
          <p className="text-sm text-gray-600 text-center">Select document type and upload a file</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DOC_TYPES.map(dt => (
              <option key={dt.value} value={dt.value}>{dt.label}</option>
            ))}
          </select>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload File</>
            )}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Uploaded files */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">{documents.length} file{documents.length !== 1 ? 's' : ''} uploaded</p>
          {documents.map((doc) => {
            const docLabel = DOC_TYPES.find(d => d.value === doc.document_type)?.label || doc.document_type;
            return (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
                <FileText className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{doc.file_name || docLabel}</p>
                  <p className="text-xs text-gray-400">{docLabel}{doc.created_date ? ` · ${format(new Date(doc.created_date), 'd MMM')}` : ''}</p>
                </div>
                {doc.is_approved ? (
                  <span className="text-xs text-green-600 font-semibold flex-shrink-0">✓ Approved</span>
                ) : (
                  <span className="text-xs text-amber-600 flex-shrink-0">Pending</span>
                )}
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 flex-shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </a>
                {!doc.is_approved && (
                  <button
                    onClick={() => { if (confirm('Remove this document?')) deleteMutation.mutate(doc.id); }}
                    className="text-gray-300 hover:text-red-500 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        ⚠️ Do not dispatch shipment until all required documents have been uploaded and approved by IMvision.
      </div>
    </div>
  );
}