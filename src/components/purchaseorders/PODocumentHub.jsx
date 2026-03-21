import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle2, Trash2, ExternalLink, Copy, Link2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { createPageUrl } from '@/utils';

const PHASES = [
  {
    key: 'production',
    label: 'Produktion',
    emoji: '🏭',
    color: 'amber',
    docTypes: [
      { value: 'quality_report', label: 'Kvalitetsrapport' },
      { value: 'test_protocol', label: 'Testprotokoll' },
      { value: 'qc_photos', label: 'QC-foton' },
      { value: 'other', label: 'Övrigt' },
    ]
  },
  {
    key: 'ready_for_shipment',
    label: 'Klar för leverans',
    emoji: '📦',
    color: 'blue',
    docTypes: [
      { value: 'packing_list', label: 'Packing List' },
      { value: 'commercial_invoice', label: 'Commercial Invoice' },
      { value: 'ce_certificate', label: 'CE-certifikat' },
      { value: 'rohs_certificate', label: 'RoHS-certifikat' },
      { value: 'other_certificate', label: 'Annat certifikat' },
      { value: 'qc_photos', label: 'QC-foton' },
      { value: 'other', label: 'Övrigt' },
    ]
  },
  {
    key: 'in_transit',
    label: 'Transport',
    emoji: '🚢',
    color: 'violet',
    docTypes: [
      { value: 'bill_of_lading', label: 'Bill of Lading' },
      { value: 'airway_bill', label: 'Airway Bill (AWB)' },
      { value: 'other', label: 'Övrigt' },
    ]
  },
  {
    key: 'arrived',
    label: 'Ankomst',
    emoji: '🛬',
    color: 'orange',
    docTypes: [
      { value: 'customs_document', label: 'Tullhandlingar' },
      { value: 'receiving_protocol', label: 'Mottagningsprotokoll' },
      { value: 'other', label: 'Övrigt' },
    ]
  },
  {
    key: 'stocked',
    label: 'I lager',
    emoji: '✅',
    color: 'emerald',
    docTypes: [
      { value: 'warranty_document', label: 'Garantidokument' },
      { value: 'receiving_protocol', label: 'Internt QC-protokoll' },
      { value: 'other', label: 'Övrigt' },
    ]
  }
];

const DOC_TYPE_LABELS = {
  quality_report: 'Kvalitetsrapport',
  test_protocol: 'Testprotokoll',
  packing_list: 'Packing List',
  commercial_invoice: 'Commercial Invoice',
  ce_certificate: 'CE-certifikat',
  rohs_certificate: 'RoHS-certifikat',
  other_certificate: 'Annat certifikat',
  qc_photos: 'QC-foton',
  bill_of_lading: 'Bill of Lading',
  airway_bill: 'Airway Bill (AWB)',
  customs_document: 'Tullhandlingar',
  warranty_document: 'Garantidokument',
  receiving_protocol: 'Mottagningsprotokoll',
  other: 'Övrigt',
};

const COLOR_CLASSES = {
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

export default function PODocumentHub({ purchaseOrder }) {
  const [uploadingPhase, setUploadingPhase] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState({});
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['po-documents', purchaseOrder.id],
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
        uploaded_by_supplier: false,
        is_approved: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-documents', purchaseOrder.id] });
      toast.success('Dokument uppladdat');
      setUploadingPhase(null);
    },
    onError: () => toast.error('Kunde inte ladda upp dokument'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approved }) => base44.entities.ArticleDocument.update(id, { is_approved: approved }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['po-documents', purchaseOrder.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ArticleDocument.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['po-documents', purchaseOrder.id] }),
  });

  const handleFileUpload = async (e, phase) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const docType = selectedDocType[phase] || 'other';
    await uploadMutation.mutateAsync({ file, phase, docType });
    e.target.value = '';
  };

  const copySupplierLink = () => {
    const token = purchaseOrder.supplier_portal_token;
    if (!token) {
      toast.error('Skapa en leverantörslänk först från inköpsordern');
      return;
    }
    const url = `${window.location.origin}${createPageUrl('SupplierPOView')}?po=${purchaseOrder.id}&token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Leverantörslänk kopierad! Dela med leverantören så kan de ladda upp dokument direkt.');
  };

  return (
    <div className="space-y-4">
      {/* Supplier link banner */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
        <div className="flex items-center gap-3 min-w-0">
          <Link2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-white font-medium text-sm">Leverantörsportal</p>
            <p className="text-purple-300 text-xs">Dela länken med leverantören så kan de ladda upp alla dokument direkt</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={copySupplierLink}
          className="bg-purple-600 hover:bg-purple-500 text-white flex-shrink-0"
        >
          <Copy className="w-4 h-4 mr-2" />
          Kopiera länk
        </Button>
      </div>

      {/* Phase columns */}
      <div className="space-y-3">
        {PHASES.map((phase) => {
          const phaseDocs = documents.filter(d => d.document_phase === phase.key);
          const colors = COLOR_CLASSES[phase.color];
          const isUploading = uploadingPhase === phase.key && uploadMutation.isPending;
          const inputId = `upload-${phase.key}`;

          return (
            <div key={phase.key} className={cn('rounded-xl border p-4', colors.bg, colors.border)}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{phase.emoji}</span>
                  <h3 className={cn('font-semibold text-sm', colors.text)}>{phase.label}</h3>
                  {phaseDocs.length > 0 && (
                    <Badge className={cn('text-xs border', colors.badge)}>
                      {phaseDocs.length} dok.
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Doc type selector */}
                  <select
                    value={selectedDocType[phase.key] || ''}
                    onChange={(e) => setSelectedDocType(prev => ({ ...prev, [phase.key]: e.target.value }))}
                    className="text-xs bg-black/30 border border-white/10 text-white rounded-lg px-2 py-1.5 outline-none"
                  >
                    <option value="">Välj typ...</option>
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
                  />
                  <label
                    htmlFor={inputId}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all',
                      'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    )}
                  >
                    {isUploading ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    Ladda upp
                  </label>
                </div>
              </div>

              {phaseDocs.length === 0 ? (
                <p className="text-xs text-white/30 italic">Inga dokument i denna fas ännu</p>
              ) : (
                <div className="space-y-2">
                  {phaseDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-black/20 border border-white/10"
                    >
                      <FileText className="w-4 h-4 text-white/40 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {doc.file_name || DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <span>{DOC_TYPE_LABELS[doc.document_type]}</span>
                          {doc.uploaded_by_supplier && (
                            <>
                              <span>·</span>
                              <span className="text-purple-400">Från leverantör</span>
                            </>
                          )}
                          {doc.created_date && (
                            <>
                              <span>·</span>
                              <span>{format(new Date(doc.created_date), 'd MMM', { locale: sv })}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => approveMutation.mutate({ id: doc.id, approved: !doc.is_approved })}
                          className={cn(
                            'p-1.5 rounded-lg transition-all',
                            doc.is_approved ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10'
                          )}
                          title={doc.is_approved ? 'Godkänt - klicka för att ångra' : 'Markera som godkänt'}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => {
                            if (confirm('Ta bort detta dokument?')) deleteMutation.mutate(doc.id);
                          }}
                          className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
    </div>
  );
}