import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileText, ExternalLink, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const PHASES = [
  {
    key: 'production',
    label: 'Production',
    emoji: '🏭',
    description: 'QC reports, test protocols, production photos, batch documents, RCFGX & Nova Card files',
    color: 'amber',
    docTypes: [
      { value: 'quality_report', label: 'QC Report' },
      { value: 'test_protocol', label: 'Test Protocol' },
      { value: 'qc_photos', label: 'QC Photos / Videos' },
      { value: 'rcfgx_file', label: 'RCFGX File' },
      { value: 'nova_card_file', label: 'Nova Card File' },
      { value: 'other', label: 'Other Production Document' },
    ]
  },
  {
    key: 'ready_for_shipment',
    label: 'Ready for Shipment',
    emoji: '📦',
    description: 'Commercial Invoice, Packing List, HS Code, Certificates',
    color: 'blue',
    docTypes: [
      { value: 'commercial_invoice', label: 'Commercial Invoice' },
      { value: 'packing_list', label: 'Packing List' },
      { value: 'customs_document', label: 'HS Code Declaration' },
      { value: 'ce_certificate', label: 'CE Certificate' },
      { value: 'rohs_certificate', label: 'RoHS Certificate' },
      { value: 'other_certificate', label: 'Other Certificate' },
      { value: 'other', label: 'Other' },
    ]
  },
  {
    key: 'in_transit',
    label: 'In Transit',
    emoji: '🚢',
    description: 'Bill of Lading (B/L), Airway Bill (AWB), tracking information',
    color: 'violet',
    docTypes: [
      { value: 'bill_of_lading', label: 'Bill of Lading (B/L)' },
      { value: 'airway_bill', label: 'Airway Bill (AWB)' },
      { value: 'other', label: 'Other Shipping Document' },
    ]
  },
];

const DOC_TYPE_LABELS = {
  quality_report: 'QC Report',
  test_protocol: 'Test Protocol',
  packing_list: 'Packing List',
  commercial_invoice: 'Commercial Invoice',
  customs_document: 'HS Code Declaration',
  ce_certificate: 'CE Certificate',
  rohs_certificate: 'RoHS Certificate',
  other_certificate: 'Other Certificate',
  qc_photos: 'QC Photos / Videos',
  bill_of_lading: 'Bill of Lading (B/L)',
  airway_bill: 'Airway Bill (AWB)',
  rcfgx_file: 'RCFGX File',
  nova_card_file: 'Nova Card File',
  other: 'Other',
};

const COLORS = {
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-200', btn: 'bg-amber-600 hover:bg-amber-500' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700 border-blue-200', btn: 'bg-blue-600 hover:bg-blue-500' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700 border-violet-200', btn: 'bg-violet-600 hover:bg-violet-500' },
};

export default function SupplierDocumentUploadHub({ purchaseOrder }) {
  const [selectedDocType, setSelectedDocType] = useState({});
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['supplier-po-documents', purchaseOrder.id],
    queryFn: () => base44.entities.ArticleDocument.filter({ purchase_order_id: purchaseOrder.id }),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, phase, docType }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.ArticleDocument.create({
        purchase_order_id: purchaseOrder.id,
        document_type: docType,
        document_phase: phase,
        file_url,
        file_name: file.name,
        uploaded_by_supplier: true,
        is_approved: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-po-documents', purchaseOrder.id] });
      toast.success('Document uploaded successfully!');
    },
    onError: () => toast.error('Upload failed. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ArticleDocument.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['supplier-po-documents', purchaseOrder.id] }),
  });

  const handleFileUpload = async (e, phase) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const docType = selectedDocType[phase] || 'other';
    await uploadMutation.mutateAsync({ file, phase, docType });
    e.target.value = '';
  };

  const totalDocs = documents.length;
  const approvedDocs = documents.filter(d => d.is_approved).length;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="font-semibold text-blue-900 mb-1">Upload Documents</h3>
        <p className="text-sm text-blue-700">
          Upload all required documents before shipment. All information must match the Purchase Order. IMvision will review and approve your documents.
        </p>
      </div>

      {totalDocs > 0 && (
        <div className="flex items-center gap-4 p-4 bg-gray-100 rounded-xl">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{totalDocs}</div>
            <div className="text-xs text-gray-500">Uploaded</div>
          </div>
          <div className="w-px h-10 bg-gray-300" />
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{approvedDocs}</div>
            <div className="text-xs text-gray-500">Approved</div>
          </div>
          {approvedDocs < totalDocs && (
            <>
              <div className="w-px h-10 bg-gray-300" />
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{totalDocs - approvedDocs}</div>
                <div className="text-xs text-gray-500">Pending Review</div>
              </div>
            </>
          )}
        </div>
      )}

      {PHASES.map((phase) => {
        const phaseDocs = documents.filter(d => d.document_phase === phase.key);
        const c = COLORS[phase.color];
        const isUploading = uploadMutation.isPending;
        const inputId = `sup-upload-${phase.key}`;

        return (
          <div key={phase.key} className={cn('rounded-xl border-2 p-5', c.bg, c.border)}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{phase.emoji}</span>
                  <h3 className={cn('font-bold text-lg', c.text)}>{phase.label}</h3>
                  {phaseDocs.length > 0 && (
                    <Badge className={cn('text-xs border', c.badge)}>
                      {phaseDocs.length} {phaseDocs.length === 1 ? 'document' : 'documents'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">{phase.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <select
                value={selectedDocType[phase.key] || ''}
                onChange={(e) => setSelectedDocType(prev => ({ ...prev, [phase.key]: e.target.value }))}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500"
              >
                <option value="">Select document type...</option>
                {phase.docTypes.map(dt => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
              <input
                id={inputId}
                type="file"
                className="hidden"
                onChange={(e) => handleFileUpload(e, phase.key)}
                disabled={isUploading}
                accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.docx,.doc,.mp4,.mov"
              />
              <label
                htmlFor={inputId}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all',
                  c.btn,
                  isUploading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload
              </label>
            </div>

            {phaseDocs.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No documents uploaded for this phase yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {phaseDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200 shadow-sm">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {doc.file_name || DOC_TYPE_LABELS[doc.document_type]}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{DOC_TYPE_LABELS[doc.document_type]}</span>
                        {doc.created_date && (
                          <span className="text-xs text-gray-400">· {format(new Date(doc.created_date), 'd MMM yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.is_approved ? (
                        <span className="flex items-center gap-1 text-xs text-green-700 font-medium px-2 py-1 bg-green-100 rounded-full border border-green-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 px-2 py-1 bg-amber-100 rounded-full border border-amber-200">Pending Review</span>
                      )}
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-all">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => { if (confirm('Remove this document?')) deleteMutation.mutate(doc.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}