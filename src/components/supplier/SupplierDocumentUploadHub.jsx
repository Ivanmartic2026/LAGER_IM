import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Upload, FileText, ExternalLink, CheckCircle2, Trash2, Loader2, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CHECKLIST = [
  { value: 'quality_report',     label: 'QC Report',                phase: 'production',          icon: '📋' },
  { value: 'test_protocol',      label: 'Test Protocol',            phase: 'production',          icon: '🔬' },
  { value: 'qc_photos',          label: 'QC Photos / Videos',       phase: 'production',          icon: '📷' },
  { value: 'rcfgx_file',         label: 'RCFGX / Nova Card Files',  phase: 'production',          icon: '💾' },
  { value: 'commercial_invoice', label: 'Commercial Invoice',       phase: 'ready_for_shipment',  icon: '🧾' },
  { value: 'packing_list',       label: 'Packing List',             phase: 'ready_for_shipment',  icon: '📦' },
  { value: 'customs_document',   label: 'HS Code Declaration',      phase: 'ready_for_shipment',  icon: '📑' },
  { value: 'ce_certificate',     label: 'CE / RoHS Certificate',    phase: 'ready_for_shipment',  icon: '✅' },
  { value: 'bill_of_lading',     label: 'Bill of Lading / Airway Bill', phase: 'in_transit',      icon: '🚢' },
  { value: 'other',              label: 'Other Document',           phase: 'production',          icon: '📎' },
];

export default function SupplierDocumentUploadHub({ purchaseOrder, poToken }) {
  const [uploadingType, setUploadingType] = useState(null);
  const fileInputRef = useRef(null);
  const activeTypeRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['supplier-po-documents', purchaseOrder.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('supplierGetDocuments', { action: 'list', token: poToken });
      return res.data?.documents || [];
    },
    enabled: !!poToken,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, docType }) => {
      const docDef = CHECKLIST.find(d => d.value === docType);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('token', poToken);
      const uploadRes = await base44.functions.invoke('supplierUploadFile', formData);
      const file_url = uploadRes.data?.file_url;
      if (!file_url) throw new Error('Upload failed');

      const res = await base44.functions.invoke('supplierGetDocuments', {
        action: 'create',
        token: poToken,
        document_type: docType,
        document_phase: docDef?.phase || 'production',
        file_url,
        file_name: file.name,
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-po-documents', purchaseOrder.id] });
      toast.success('Document uploaded!');
      setUploadingType(null);
    },
    onError: (err) => {
      toast.error('Upload failed: ' + err.message);
      setUploadingType(null);
    },
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

  const handleUploadClick = (docType) => {
    activeTypeRef.current = docType;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeTypeRef.current) return;
    setUploadingType(activeTypeRef.current);
    uploadMutation.mutate({ file, docType: activeTypeRef.current });
    e.target.value = '';
  };

  // Map docType -> uploaded docs
  const docsByType = {};
  documents.forEach(doc => {
    if (!docsByType[doc.document_type]) docsByType[doc.document_type] = [];
    docsByType[doc.document_type].push(doc);
  });

  const uploadedCount = CHECKLIST.filter(item => docsByType[item.value]?.length > 0).length;

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-gray-700">Documents uploaded</span>
            <span className="text-sm font-bold text-gray-900">{uploadedCount} / {CHECKLIST.length}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${(uploadedCount / CHECKLIST.length) * 100}%` }}
            />
          </div>
        </div>
        {uploadedCount === CHECKLIST.length && (
          <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
        )}
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {CHECKLIST.map((item) => {
          const uploaded = docsByType[item.value] || [];
          const isUploading = uploadingType === item.value;
          const hasUploads = uploaded.length > 0;

          return (
            <div
              key={item.value}
              className={cn(
                "rounded-xl border transition-all",
                hasUploads ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
              )}
            >
              {/* Row header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all",
                  hasUploads ? "border-green-500 bg-green-500" : "border-gray-300 bg-white"
                )}>
                  {hasUploads && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <span className={cn(
                  "flex-1 text-sm font-medium",
                  hasUploads ? "text-green-800" : "text-gray-800"
                )}>
                  {item.label}
                </span>
                <button
                  onClick={() => handleUploadClick(item.value)}
                  disabled={isUploading}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all touch-manipulation",
                    isUploading
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : hasUploads
                      ? "bg-white border border-green-300 text-green-700 hover:bg-green-50"
                      : "bg-blue-600 text-white hover:bg-blue-500"
                  )}
                >
                  {isUploading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
                  ) : hasUploads ? (
                    <><Paperclip className="w-3.5 h-3.5" /> Add more</>
                  ) : (
                    <><Upload className="w-3.5 h-3.5" /> Upload</>
                  )}
                </button>
              </div>

              {/* Uploaded files for this type */}
              {uploaded.length > 0 && (
                <div className="border-t border-green-200 px-4 pb-3 pt-2 space-y-1.5">
                  {uploaded.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 text-xs text-green-800 bg-white border border-green-200 rounded-lg px-3 py-2">
                      <FileText className="w-3.5 h-3.5 flex-shrink-0 text-green-600" />
                      <span className="flex-1 truncate">{doc.file_name || doc.document_type}</span>
                      {doc.created_date && (
                        <span className="text-gray-400 flex-shrink-0">{format(new Date(doc.created_date), 'd MMM')}</span>
                      )}
                      {doc.is_approved ? (
                        <span className="text-green-600 font-semibold flex-shrink-0">✓ Approved</span>
                      ) : (
                        <span className="text-amber-600 flex-shrink-0">Pending</span>
                      )}
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-0.5 text-gray-400 hover:text-blue-600 flex-shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {!doc.is_approved && (
                        <button
                          onClick={() => { if (confirm('Remove this document?')) deleteMutation.mutate(doc.id); }}
                          className="p-0.5 text-gray-300 hover:text-red-500 flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        multiple={false}
      />

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        ⚠️ Do not dispatch shipment until all required documents have been uploaded and approved by IMvision.
      </div>
    </div>
  );
}