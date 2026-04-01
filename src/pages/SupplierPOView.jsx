import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Package, FileText, CheckCircle2, Clock, Upload, ExternalLink, ChevronRight, Building2, CalendarCheck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import SupplierPOConfirmation from "@/components/supplier/SupplierPOConfirmation";
import SupplierDocumentUploadHub from "@/components/supplier/SupplierDocumentUploadHub";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const STEPS = [
  { key: 'confirm', label: 'Bekräfta order', icon: CheckCircle2, step: 1 },
  { key: 'requirements', label: 'Dokument krävs', icon: FileText, step: 2 },
  { key: 'upload', label: 'Ladda upp dokument', icon: Upload, step: 3 },
];

const STATUS_CONFIG = {
  draft: { label: 'Utkast', color: 'bg-slate-900 text-slate-100 border-slate-700', icon: '📝' },
  sent: { label: 'Skickad', color: 'bg-blue-900 text-blue-100 border-blue-700', icon: '📬' },
  confirmed: { label: 'Bekräftad', color: 'bg-green-900 text-green-100 border-green-700', icon: '✓' },
  waiting_for_supplier_documentation: { label: 'Väntar på dokumentation', color: 'bg-amber-900 text-amber-100 border-amber-700', icon: '⏳' },
  in_production: { label: 'I produktion', color: 'bg-purple-900 text-purple-100 border-purple-700', icon: '⚙️' },
  shipped: { label: 'Skickad', color: 'bg-cyan-900 text-cyan-100 border-cyan-700', icon: '🚚' },
  ready_for_reception: { label: 'Klar för mottagning', color: 'bg-indigo-900 text-indigo-100 border-indigo-700', icon: '📦' },
  received: { label: 'Mottagen', color: 'bg-emerald-900 text-emerald-100 border-emerald-700', icon: '✅' },
  cancelled: { label: 'Avbruten', color: 'bg-red-900 text-red-100 border-red-700', icon: '✕' }
};

export default function SupplierPOView() {
  const urlParams = new URLSearchParams(window.location.search);
  const poToken = urlParams.get('token');
  const editMode = urlParams.get('edit') === 'true';
  const [activeTab, setActiveTab] = useState('confirm');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-po', poToken],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSupplierPO', { token: poToken });
      return response.data;
    },
    enabled: !!poToken
  });

  const purchaseOrder = data?.purchaseOrder || null;
  const items = data?.items || [];

  if (!poToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Ogiltig länk</h1>
          <p className="text-slate-600 text-sm">Denna länk saknar en obligatorisk token. Använd länken från ditt email.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600">Laddar din inköpsorder...</p>
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Order hittades inte</h1>
          <p className="text-slate-600 text-sm">Kontrollera att länken är korrekt eller kontakta din IMvision-representant.</p>
        </div>
      </div>
    );
  }

  const currentStatus = STATUS_CONFIG[purchaseOrder.status] || STATUS_CONFIG.draft;
  const isConfirmed = purchaseOrder.status !== 'draft' && purchaseOrder.status !== 'sent';

  if (editMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white/90 backdrop-blur z-10 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Redigera order</h2>
          <button
            onClick={() => window.location.href = `?token=${poToken}`}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
            <SupplierPOConfirmation purchaseOrder={purchaseOrder} items={items} poToken={poToken} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              Inköpsordrar
            </h1>
          </div>

          {/* Status Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { key: 'all', label: 'Alla', count: 1, bgColor: 'bg-white border-slate-200', textColor: 'text-slate-700' },
              { key: 'confirmed', label: 'Bekräftade', count: isConfirmed ? 1 : 0, bgColor: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
              { key: 'pending', label: 'Väntar', count: isConfirmed ? 0 : 1, bgColor: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700' },
            ].map(({ key, label, count, bgColor, textColor }) => (
              <motion.button
                key={key}
                whileHover={{ y: -2 }}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  "p-5 rounded-2xl border transition-all duration-200 text-left shadow-sm",
                  (statusFilter === key)
                    ? "bg-blue-50 border-blue-300 shadow-md"
                    : bgColor + " hover:shadow-md hover:border-slate-300"
                )}
              >
                <p className={cn("text-3xl font-bold tracking-tight mb-1", textColor)}>{count}</p>
                <p className="text-sm text-slate-600">{label}</p>
              </motion.button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Sök leverantör eller order..."
              className="pl-10 h-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* PO Details Card */}

        {/* PO Card */}
        <motion.div
          whileHover={{ scale: 1.005 }}
          className="p-5 rounded-2xl border bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer shadow-sm"
          onClick={() => window.location.href = `?token=${poToken}&edit=true`}
        >
          <div className="flex flex-col gap-4">
            {/* Header Row */}
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-3 flex-wrap min-w-0 flex-1">
                <h2 className="font-bold text-lg text-slate-900">
                  {purchaseOrder.po_number || `PO-${purchaseOrder.id.slice(0, 8)}`}
                </h2>
                <span className={cn("text-xs font-bold px-2 py-1 rounded-lg", currentStatus.color)}>
                  {currentStatus.label}
                </span>
              </div>
            </div>

            {/* Details Row: Supplier, ETA, Items */}
            <div className="flex items-end justify-between gap-4">
              <div className="grid grid-cols-3 gap-6 text-sm flex-1">
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-xs">Leverantör</span>
                  <span className="text-slate-900 font-medium">{purchaseOrder.supplier_name}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-xs">ETA</span>
                  <span className="text-slate-900 font-medium">
                    {purchaseOrder.expected_delivery_date ? format(new Date(purchaseOrder.expected_delivery_date), 'd MMM', { locale: sv }) : '—'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-xs">Artiklar</span>
                  <span className="text-slate-900 font-medium">{items.length} st</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Step Navigation */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Step Header */}
          <div className="flex border-b border-slate-200">
            {STEPS.map((step, i) => {
              const isActive = activeTab === step.key;
              const isDone = (step.key === 'confirm' && isConfirmed) ||
                             (step.key === 'requirements');
              return (
                <button
                  key={step.key}
                  onClick={() => setActiveTab(step.key)}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-1 px-2 py-3 text-xs font-medium transition-colors relative min-h-[64px] touch-manipulation",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-50 active:bg-slate-100"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                    isActive ? "bg-blue-100 text-blue-700" : isDone ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
                  )}>
                    {isDone && !isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.step}
                  </div>
                  <span className="text-[10px] sm:text-xs leading-tight text-center px-1">{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="p-4 sm:p-6">
            {activeTab === 'confirm' && (
              <SupplierPOConfirmation purchaseOrder={purchaseOrder} items={items} poToken={poToken} />
            )}
            {activeTab === 'requirements' && (
              <RequirementsSection onContinue={() => setActiveTab('upload')} />
            )}
            {activeTab === 'upload' && (
              <SupplierDocumentUploadHub purchaseOrder={purchaseOrder} poToken={poToken} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-6">
          <p className="text-xs text-slate-500">IMvision leverantörsportal · Säker länk</p>
          <p className="text-xs text-slate-400 mt-0.5">För support: kontakta din IMvision-representant</p>
        </div>
      </div>
    </div>
  );
}

function RequirementsSection({ onContinue }) {
  const docs = [
    { doc: 'QC Report + Photos/Video', note: 'Full quality check must be performed before shipment', icon: '📋', phase: 'Production' },
    { doc: 'Test Protocol', note: 'Complete test results per batch', icon: '🔬', phase: 'Production' },
    { doc: 'Commercial Invoice', note: 'Must match PO exactly — item, quantity, price, currency', icon: '🧾', phase: 'Shipment' },
    { doc: 'Packing List', note: 'Item by item, including carton dimensions and gross weight', icon: '📦', phase: 'Shipment' },
    { doc: 'Bill of Lading or Airway Bill', note: 'Required before or at shipment', icon: '🚢', phase: 'Shipment' },
    { doc: 'HS Code Declaration', note: 'Correct HS codes for all product categories', icon: '📑', phase: 'Shipment' },
    { doc: 'RCFGX / Nova Card files', note: 'Configuration files per batch (if applicable)', icon: '💾', phase: 'Production' },
    { doc: 'CE / RoHS Certificates', note: 'As required per product', icon: '✅', phase: 'Certification' },
  ];

  const phases = ['Production', 'Shipment', 'Certification'];

  return (
    <div className="space-y-5">
      <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
        <h3 className="font-semibold text-blue-400 mb-1 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Dokument krävda från leverantör
        </h3>
        <p className="text-sm text-blue-300">Alla dokument måste laddas upp i fliken <strong>Ladda upp dokument</strong>. All information måste matcha inköpsordern exakt.</p>
      </div>

      {phases.map(phase => {
        const phaseDocs = docs.filter(d => d.phase === phase);
        return (
          <div key={phase}>
            <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-white/20" />
              {phase}
              <div className="h-px flex-1 bg-white/20" />
            </h4>
            <div className="space-y-2">
              {phaseDocs.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3.5 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-lg flex-shrink-0 leading-none mt-0.5">{item.icon}</span>
                  <div>
                    <div className="font-semibold text-white text-sm">{item.doc}</div>
                    <div className="text-xs text-white/50 mt-0.5">{item.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl text-sm text-amber-300">
        ⚠️ <strong>Skicka inte leveransen</strong> innan alla dokument har laddats upp och godkänts av IMvision.
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        Fortsätt till dokumentuppladdning
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}