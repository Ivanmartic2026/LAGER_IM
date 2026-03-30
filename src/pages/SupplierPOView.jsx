import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Package, FileText, CheckCircle2, Clock, Upload, ExternalLink, ChevronRight, Building2, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import SupplierPOConfirmation from "@/components/supplier/SupplierPOConfirmation";
import SupplierDocumentUploadHub from "@/components/supplier/SupplierDocumentUploadHub";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: 'confirm', label: 'Confirm Order', icon: CheckCircle2, step: 1 },
  { key: 'requirements', label: 'Documents Required', icon: FileText, step: 2 },
  { key: 'upload', label: 'Upload Documents', icon: Upload, step: 3 },
];

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-300' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  confirmed: { label: 'Confirmed ✓', color: 'bg-green-100 text-green-700 border-green-300' },
  waiting_for_supplier_documentation: { label: 'Awaiting Documentation', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  in_production: { label: 'In Production', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  shipped: { label: 'Shipped', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  ready_for_reception: { label: 'Ready for Reception', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  received: { label: 'Received', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-300' }
};

export default function SupplierPOView() {
  const urlParams = new URLSearchParams(window.location.search);
  const poToken = urlParams.get('token');
  const [activeTab, setActiveTab] = useState('confirm');

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-2xl shadow-sm border p-8">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-500 text-sm">This link is missing a required token. Please use the link provided in your email.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading your purchase order...</p>
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-2xl shadow-sm border p-8">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-500 text-sm">Please check that the link is correct or contact your IMvision representative.</p>
        </div>
      </div>
    );
  }

  const currentStatus = STATUS_CONFIG[purchaseOrder.status] || STATUS_CONFIG.draft;
  const isConfirmed = purchaseOrder.status !== 'draft' && purchaseOrder.status !== 'sent';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-gray-900">
                    {purchaseOrder.po_number || `PO-${purchaseOrder.id.slice(0, 8)}`}
                  </h1>
                  <Badge className={cn("border text-xs font-semibold", currentStatus.color)}>
                    {currentStatus.label}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {purchaseOrder.supplier_name}
                </p>
              </div>
            </div>
            {/* IMvision logo area */}
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">IMvision</p>
              <p className="text-xs text-gray-400">Supplier Portal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* PO Summary Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Order Summary</h2>
          </div>
          <div className="p-5">
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Order Date</div>
                <div className="font-semibold text-gray-900">
                  {purchaseOrder.order_date ? format(new Date(purchaseOrder.order_date), "d MMM yyyy") : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Expected ETA</div>
                <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {purchaseOrder.expected_delivery_date ? format(new Date(purchaseOrder.expected_delivery_date), "d MMM yyyy") : '—'}
                </div>
              </div>
              {purchaseOrder.confirmed_delivery_date && (
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Confirmed Date</div>
                  <div className="font-semibold text-green-700 flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5" />
                    {format(new Date(purchaseOrder.confirmed_delivery_date), "d MMM yyyy")}
                  </div>
                </div>
              )}
              {purchaseOrder.delivery_terms && (
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Delivery Terms</div>
                  <div className="font-semibold text-gray-900">{purchaseOrder.delivery_terms}</div>
                </div>
              )}
              {purchaseOrder.mode_of_transport && (
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Transport</div>
                  <div className="font-semibold text-gray-900 capitalize">{purchaseOrder.mode_of_transport.replace(/_/g, ' ')}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Items</div>
                <div className="font-semibold text-gray-900">{items.length} line item{items.length !== 1 ? 's' : ''}</div>
              </div>
            </div>

            {purchaseOrder.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Notes from IMvision</div>
                <div className="text-gray-700 bg-amber-50 border border-amber-200 p-3 rounded-xl text-sm leading-relaxed">{purchaseOrder.notes}</div>
              </div>
            )}

            {purchaseOrder.invoice_file_url && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <a
                  href={purchaseOrder.invoice_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  {purchaseOrder.invoice_number ? `Invoice ${purchaseOrder.invoice_number}` : 'View Invoice'}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Order Items
            </h2>
            <span className="text-xs text-gray-400 font-medium">{items.length} items</span>
          </div>
          <div className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <div key={item.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-5 text-center">{i + 1}</span>
                      <div className="font-semibold text-gray-900 text-sm">{item.article_name}</div>
                    </div>
                    {item.article_sku && (
                      <div className="text-xs text-gray-400 mt-0.5 ml-7">
                        Article no: <span className="font-mono text-gray-600">{item.article_sku}</span>
                      </div>
                    )}
                    {item.supplier_batch_numbers?.length > 0 && (
                      <div className="mt-1 ml-7 space-y-0.5">
                        {item.supplier_batch_numbers.map((b, bi) => (
                          <div key={bi} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-0.5 inline-block mr-1">
                            Batch: <span className="font-mono font-medium">{b.batch_no}</span> · {b.quantity} pcs
                            {b.production_date && ` · ${format(new Date(b.production_date), "d MMM yyyy")}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-right">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{item.quantity_ordered} <span className="text-xs font-normal text-gray-400">pcs</span></div>
                      {item.quantity_confirmed && item.quantity_confirmed !== item.quantity_ordered && (
                        <div className="text-xs text-green-600 font-medium">{item.quantity_confirmed} confirmed</div>
                      )}
                    </div>
                    {item.status === 'confirmed' && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Navigation */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Step Header */}
          <div className="flex border-b border-gray-200">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = activeTab === step.key;
              const isDone = (step.key === 'confirm' && isConfirmed) ||
                             (step.key === 'requirements');
              return (
                <button
                  key={step.key}
                  onClick={() => setActiveTab(step.key)}
                  className={cn(
                    "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-3.5 text-xs sm:text-sm font-medium transition-colors relative",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                    isActive ? "bg-white/20 text-white" : isDone ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
                  )}>
                    {isDone && !isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.step}
                  </div>
                  <span className="hidden sm:block">{step.label}</span>
                  <span className="block sm:hidden text-[10px] leading-tight text-center">
                    {step.label.split(' ').slice(0, 1).join(' ')}
                  </span>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className={cn("hidden sm:block absolute right-0 w-3.5 h-3.5 top-1/2 -translate-y-1/2", isActive ? "text-white/50" : "text-gray-300")} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="p-5 sm:p-6">
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
          <p className="text-xs text-gray-400">IMvision Supplier Portal · Secure link</p>
          <p className="text-xs text-gray-300 mt-0.5">For support: contact your IMvision representative</p>
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
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Required Documents from Supplier
        </h3>
        <p className="text-sm text-blue-700">All documents must be uploaded in the <strong>Upload Documents</strong> tab. All information must match the Purchase Order exactly.</p>
      </div>

      {phases.map(phase => {
        const phaseDocs = docs.filter(d => d.phase === phase);
        return (
          <div key={phase}>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-200" />
              {phase}
              <div className="h-px flex-1 bg-gray-200" />
            </h4>
            <div className="space-y-2">
              {phaseDocs.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-lg flex-shrink-0 leading-none mt-0.5">{item.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{item.doc}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        ⚠️ <strong>Do not dispatch shipment</strong> until all documents have been uploaded and approved by IMvision.
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        Continue to Upload Documents
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}