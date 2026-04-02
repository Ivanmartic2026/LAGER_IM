import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierFetch, supplierUploadFile } from '@/lib/supplierApi';
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedType, setSelectedType] = useState('other');
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['supplier-po-documents', purchaseOrder.id],
    queryFn: async () => {
      const res = await supplierFetch('supplierGetDocuments', { action: 'list', token: poToken });
      return res?.documents || [];
    },
    enabled: !!poToken,
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId) => {
      await supplierFetch('supplierGetDocuments', {
        action: 'delete',
        token: poToken,
        document_id: documentId,
      });
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
    setUploadProgress(0);
    try {
      // Simulate progress for file upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 30, 90));
      }, 200);

      // Upload file directly
      const uploadRes = await supplierUploadFile(file, poToken);
      clearInterval(progressInterval);
      setUploadProgress(95);

      const file_url = uploadRes?.file_url;
      if (!file_url) throw new Error('Upload failed');

      const docDef = DOC_TYPES.find(d => d.value === selectedType);
      await supplierFetch('supplierGetDocuments', {
        action: 'create',
        token: poToken,
        document_type: selectedType,
        document_phase: docDef?.phase || 'production',
        file_url,
        file_name: file.name,
      });

      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ['supplier-po-documents', purchaseOrder.id] });
      toast.success('Document uploaded!');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  return (
    <div className="space-y-5">
      {/* Upload area */}
      <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 bg-blue-50">
        <div className="flex flex-col items-center gap-3 mb-4">
          <Upload className="w-8 h-8 text-blue-500" />
          <p className="text-sm text-blue-700 text-center font-medium">Select document type and upload a file</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            disabled={uploading}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {DOC_TYPES.map(dt => (
              <option key={dt.value} value={dt.value}>{dt.label}</option>
            ))}
          </select>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation shadow-sm"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload File</>
            )}
          </button>
        </div>

        {uploading && (
          <div className="mt-4 space-y-2">
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 font-medium text-center">{Math.round(uploadProgress)}%</p>
          </div>
        )}
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
         <p className="text-sm font-semibold text-slate-700">{documents.length} file{documents.length !== 1 ? 's' : ''} uploaded</p>
          {documents.map((doc) => {
            const docLabel = DOC_TYPES.find(d => d.value === doc.document_type)?.label || doc.document_type;
            return (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                <FileText className="w-4 h-4 flex-shrink-0 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name || docLabel}</p>
                  <p className="text-xs text-slate-500">{docLabel}{doc.created_date ? ` · ${format(new Date(doc.created_date), 'd MMM')}` : ''}</p>
                </div>
                {doc.is_approved ? (
                   <span className="text-xs text-green-700 font-semibold flex-shrink-0 bg-green-100 px-2 py-1 rounded">✓ Approved</span>
                 ) : (
                   <span className="text-xs text-amber-700 font-semibold flex-shrink-0 bg-amber-100 px-2 py-1 rounded">Pending</span>
                 )}
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 flex-shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </a>
                {!doc.is_approved && (
                   <button
                     onClick={() => { if (confirm('Delete this document?')) deleteMutation.mutate(doc.id); }}
                     className="text-slate-400 hover:text-red-600 flex-shrink-0"
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
        ⚠️ Do not ship until all documents have been uploaded and approved by IMvision.
      </div>
    </div>
  );
}