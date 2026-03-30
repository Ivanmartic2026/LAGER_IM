import React, { useRef, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Upload, FileText, ExternalLink, CheckCircle2, Trash2, Loader2, CloudUpload, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const DOC_TYPES = [
  { value: 'quality_report',     label: 'QC Report',                phase: 'production' },
  { value: 'test_protocol',      label: 'Test Protocol',            phase: 'production' },
  { value: 'qc_photos',          label: 'QC Photos / Videos',       phase: 'production' },
  { value: 'rcfgx_file',         label: 'RCFGX File',               phase: 'production' },
  { value: 'nova_card_file',     label: 'Nova Card File',           phase: 'production' },
  { value: 'commercial_invoice', label: 'Commercial Invoice',       phase: 'ready_for_shipment' },
  { value: 'packing_list',       label: 'Packing List',             phase: 'ready_for_shipment' },
  { value: 'customs_document',   label: 'HS Code Declaration',      phase: 'ready_for_shipment' },
  { value: 'ce_certificate',     label: 'CE Certificate',           phase: 'ready_for_shipment' },
  { value: 'rohs_certificate',   label: 'RoHS Certificate',         phase: 'ready_for_shipment' },
  { value: 'bill_of_lading',     label: 'Bill of Lading (B/L)',     phase: 'in_transit' },
  { value: 'airway_bill',        label: 'Airway Bill (AWB)',        phase: 'in_transit' },
  { value: 'other',              label: 'Other Document',           phase: 'production' },
];

const DOC_LABEL_MAP = Object.fromEntries(DOC_TYPES.map(d => [d.value, d.label]));

const PHASE_LABELS = {
  production: '📦 Production',
  ready_for_shipment: '🚢 Ready for Shipment',
  in_transit: '✈️ In Transit',
};

export default function SupplierDocumentUploadHub({ purchaseOrder, poToken }) {
  const [selectedType, setSelectedType] = useState('');
  const [isDragging, setIsDragging] = useState(false);
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

  const uploadMutation = useMutation({
    mutationFn: async ({ file, docType }) => {
      const docDef = DOC_TYPES.find(d => d.value === docType);
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
      toast.success('Document uploaded successfully!');
    },
    onError: (err) => {
      toast.error('Upload failed: ' + err.message);
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

  const doUpload = useCallback((file) => {
    if (!selectedType) {
      toast.error('Please select a document type first');
      return;
    }
    uploadMutation.mutate({ file, docType: selectedType });
  }, [selectedType, uploadMutation]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    doUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const isUploading = uploadMutation.isPending;
  const approvedCount = documents.filter(d => d.is_approved).length;

  // Group documents by phase
  const docsByPhase = {
    production: documents.filter(d => d.document_phase === 'production'),
    ready_for_shipment: documents.filter(d => d.document_phase === 'ready_for_shipment'),
    in_transit: documents.filter(d => d.document_phase === 'in_transit'),
  };

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      {documents.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none" stroke="#22c55e" strokeWidth="3"
                  strokeDasharray={`${(approvedCount / documents.length) * 94.2} 94.2`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                {Math.round((approvedCount / documents.length) * 100)}%
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{approvedCount} of {documents.length} documents approved</p>
              <p className="text-xs text-gray-500">IMvision reviews each document after upload</p>
            </div>
          </div>
          {approvedCount === documents.length && documents.length > 0 && (
            <div className="flex items-center gap-1.5 text-green-700 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              All approved!
            </div>
          )}
        </div>
      )}

      {/* Upload area */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-700">1. Select document type</div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          disabled={isUploading}
        >
          <option value="">Choose document type...</option>
          {Object.entries(PHASE_LABELS).map(([phase, phaseLabel]) => (
            <optgroup key={phase} label={phaseLabel}>
              {DOC_TYPES.filter(d => d.phase === phase).map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <div className="text-sm font-semibold text-gray-700">2. Upload file</div>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => selectedType && !isUploading && fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer touch-manipulation",
            isDragging && selectedType
              ? "border-blue-500 bg-blue-50 scale-[1.01]"
              : selectedType
              ? "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
              : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-blue-600">Uploading document...</p>
              <p className="text-xs text-gray-400">Please wait, do not close this page</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                isDragging ? "bg-blue-100" : "bg-gray-100"
              )}>
                <CloudUpload className={cn("w-6 h-6", isDragging ? "text-blue-500" : "text-gray-400")} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  {isDragging ? 'Drop file here' : 'Drag & drop or click to browse'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">PDF, images, Excel, ZIP — any file type accepted</p>
              </div>
              {!selectedType && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Select a document type above first
                </div>
              )}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Uploaded documents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Uploaded Documents
          </h3>
          {documents.length > 0 && (
            <span className="text-xs text-gray-400">{documents.length} file{documents.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">No documents uploaded yet</p>
            <p className="text-xs text-gray-300 mt-0.5">Select a type and upload your first document above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(PHASE_LABELS).map(([phase, phaseLabel]) => {
              const phaseDocs = docsByPhase[phase];
              if (phaseDocs.length === 0) return null;
              return (
                <div key={phase}>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{phaseLabel}</div>
                  <div className="space-y-2">
                    {phaseDocs.map((doc) => (
                      <div key={doc.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 transition-all">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                          doc.is_approved ? "bg-green-100" : "bg-blue-50"
                        )}>
                          <FileText className={cn("w-4 h-4", doc.is_approved ? "text-green-600" : "text-blue-500")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 break-words">
                            {doc.file_name || DOC_LABEL_MAP[doc.document_type] || doc.document_type}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-gray-400">
                            <span>{DOC_LABEL_MAP[doc.document_type] || doc.document_type}</span>
                            {doc.created_date && <span>· {format(new Date(doc.created_date), 'd MMM yyyy')}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {doc.is_approved ? (
                              <span className="flex items-center gap-1 text-xs text-green-700 font-semibold px-2 py-0.5 bg-green-50 rounded-full border border-green-200">
                                <CheckCircle2 className="w-3 h-3" /> Approved
                              </span>
                            ) : (
                              <span className="text-xs text-amber-700 px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200">
                                Pending review
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all touch-manipulation"
                            title="View document"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          {!doc.is_approved && (
                            <button
                              onClick={() => { if (confirm('Remove this document?')) deleteMutation.mutate(doc.id); }}
                              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all touch-manipulation"
                              title="Remove document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}