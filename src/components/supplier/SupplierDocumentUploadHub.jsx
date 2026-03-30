import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Upload, FileText, ExternalLink, CheckCircle2, Trash2, Loader2, Plus } from 'lucide-react';
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

export default function SupplierDocumentUploadHub({ purchaseOrder }) {
  const [selectedType, setSelectedType] = useState('');
  const [uploadingType, setUploadingType] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['supplier-po-documents', purchaseOrder.id],
    queryFn: () => base44.entities.ArticleDocument.filter({ purchase_order_id: purchaseOrder.id }),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, docType }) => {
      const docDef = DOC_TYPES.find(d => d.value === docType);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.ArticleDocument.create({
        purchase_order_id: purchaseOrder.id,
        document_type: docType,
        document_phase: docDef?.phase || 'production',
        file_url,
        file_name: file.name,
        uploaded_by_supplier: true,
        is_approved: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-po-documents', purchaseOrder.id] });
      toast.success('Document uploaded!');
      setUploadingType(null);
    },
    onError: () => {
      toast.error('Upload failed. Please try again.');
      setUploadingType(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ArticleDocument.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['supplier-po-documents', purchaseOrder.id] }),
  });

  const handleUploadClick = () => {
    if (!selectedType) {
      toast.error('Please select a document type first');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingType(selectedType);
    await uploadMutation.mutateAsync({ file, docType: selectedType });
    e.target.value = '';
  };

  const isUploading = uploadMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Upload control */}
      <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-xl space-y-3">
        <div className="font-semibold text-blue-900">Upload a Document</div>
        <p className="text-sm text-blue-700">Select the document type, then click Upload to choose your file.</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2.5 bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={isUploading}
          >
            <option value="">Select document type...</option>
            <optgroup label="📦 Production">
              {DOC_TYPES.filter(d => d.phase === 'production').map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </optgroup>
            <optgroup label="🚢 Ready for Shipment">
              {DOC_TYPES.filter(d => d.phase === 'ready_for_shipment').map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </optgroup>
            <optgroup label="✈️ In Transit">
              {DOC_TYPES.filter(d => d.phase === 'in_transit').map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </optgroup>
          </select>

          <button
            onClick={handleUploadClick}
            disabled={isUploading || !selectedType}
            className={cn(
              'flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all',
              selectedType && !isUploading
                ? 'bg-blue-600 hover:bg-blue-500 cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed'
            )}
          >
            {isUploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload File</>
            )}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.docx,.doc,.mp4,.mov,.rcfgx"
        />
      </div>

      {/* Uploaded files */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">
            Uploaded Documents
            {documents.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">({documents.length})</span>
            )}
          </h3>
          {documents.length > 0 && (
            <span className="text-sm text-green-700 font-medium">
              {documents.filter(d => d.is_approved).length}/{documents.length} approved
            </span>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200 shadow-sm">
                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {doc.file_name || DOC_LABEL_MAP[doc.document_type] || doc.document_type}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                    <span>{DOC_LABEL_MAP[doc.document_type] || doc.document_type}</span>
                    {doc.created_date && <span>· {format(new Date(doc.created_date), 'd MMM yyyy')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.is_approved ? (
                    <span className="flex items-center gap-1 text-xs text-green-700 font-medium px-2 py-1 bg-green-50 rounded-full border border-green-200">
                      <CheckCircle2 className="w-3 h-3" /> Approved
                    </span>
                  ) : (
                    <span className="text-xs text-amber-700 px-2 py-1 bg-amber-50 rounded-full border border-amber-200">
                      Pending
                    </span>
                  )}
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
                  >
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
    </div>
  );
}