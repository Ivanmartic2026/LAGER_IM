import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, FileText, CheckCircle2, Clock, Upload, ExternalLink, ShieldCheck, Layers } from "lucide-react";
import { format } from "date-fns";
import SupplierPOConfirmation from "@/components/supplier/SupplierPOConfirmation";
import SupplierDocumentUploadHub from "@/components/supplier/SupplierDocumentUploadHub";
import { cn } from "@/lib/utils";

const TABS = [
  { key: 'confirm', label: '1. Confirm Order', icon: CheckCircle2 },
  { key: 'documents', label: '2. Documents', icon: FileText },
  { key: 'quality', label: '3. Quality Check', icon: ShieldCheck },
  { key: 'batch', label: '4. Batch & Files', icon: Layers },
  { key: 'upload', label: '5. Upload Documents', icon: Upload },
];

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
  const supplier = data?.supplier || null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Purchase Order Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Please check that the link is correct or contact your IMvision representative.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-300' },
    sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700 border-green-300' },
    waiting_for_supplier_documentation: { label: 'Awaiting Documentation', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    in_production: { label: 'In Production', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    shipped: { label: 'Shipped', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
    ready_for_reception: { label: 'Ready for Reception', color: 'bg-amber-100 text-amber-700 border-amber-300' },
    received: { label: 'Received', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-300' }
  };

  const currentStatus = statusConfig[purchaseOrder.status] || statusConfig.draft;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top banner */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Purchase Order — {purchaseOrder.po_number || `#${purchaseOrder.id.slice(0, 8)}`}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{purchaseOrder.supplier_name}</p>
          </div>
          <Badge className={cn("border font-semibold", currentStatus.color)}>
            {currentStatus.label}
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* PO Info */}
        <Card>
          <CardContent className="pt-5">
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500 mb-1">Order Date</div>
                <div className="font-medium">
                  {purchaseOrder.order_date ? format(new Date(purchaseOrder.order_date), "d MMM yyyy") : '—'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Expected Delivery (ETA)</div>
                <div className="font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {purchaseOrder.expected_delivery_date ? format(new Date(purchaseOrder.expected_delivery_date), "d MMM yyyy") : '—'}
                </div>
              </div>
              {purchaseOrder.confirmed_delivery_date && (
                <div>
                  <div className="text-gray-500 mb-1">Confirmed Date</div>
                  <div className="font-medium flex items-center gap-1 text-green-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {format(new Date(purchaseOrder.confirmed_delivery_date), "d MMM yyyy")}
                  </div>
                </div>
              )}
              {purchaseOrder.delivery_terms && (
                <div>
                  <div className="text-gray-500 mb-1">Delivery Terms</div>
                  <div className="font-medium">{purchaseOrder.delivery_terms}</div>
                </div>
              )}
              {purchaseOrder.mode_of_transport && (
                <div>
                  <div className="text-gray-500 mb-1">Mode of Transport</div>
                  <div className="font-medium capitalize">{purchaseOrder.mode_of_transport.replace(/_/g, ' ')}</div>
                </div>
              )}
            </div>

            {purchaseOrder.notes && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-gray-500 text-sm mb-1">Notes</div>
                <div className="text-gray-700 bg-gray-50 p-3 rounded text-sm">{purchaseOrder.notes}</div>
              </div>
            )}

            {purchaseOrder.invoice_file_url && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-gray-500 text-sm mb-2">Original Invoice</div>
                <a
                  href={purchaseOrder.invoice_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  {purchaseOrder.invoice_number ? `Invoice ${purchaseOrder.invoice_number}` : 'View Original Invoice'}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4" />
              Order Items ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{item.article_name}</div>
                      <div className="text-gray-500 mt-0.5">
                        Ordered: <span className="font-medium">{item.quantity_ordered} pcs</span>
                        {item.quantity_confirmed && item.quantity_confirmed !== item.quantity_ordered && (
                          <span className="ml-2 text-green-700">· Confirmed: {item.quantity_confirmed} pcs</span>
                        )}
                      </div>
                      {item.supplier_batch_numbers?.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.supplier_batch_numbers.map((b, i) => (
                            <div key={i} className="text-xs text-gray-500">
                              Batch: <span className="font-mono font-medium">{b.batch_no}</span> · {b.quantity} pcs
                              {b.production_date && ` · Prod: ${format(new Date(b.production_date), "d MMM yyyy")}`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {item.status === 'confirmed' && (
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Confirmed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-200">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-700 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'confirm' && (
              <SupplierPOConfirmation purchaseOrder={purchaseOrder} items={items} />
            )}
            {activeTab === 'documents' && (
              <DocumentRequirementsSection />
            )}
            {activeTab === 'quality' && (
              <QualityCheckSection />
            )}
            {activeTab === 'batch' && (
              <BatchTraceabilitySection purchaseOrder={purchaseOrder} />
            )}
            {activeTab === 'upload' && (
              <SupplierDocumentUploadHub purchaseOrder={purchaseOrder} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentRequirementsSection() {
  const required = [
    { doc: 'Commercial Invoice', note: 'Must match PO exactly — item, quantity, price, currency' },
    { doc: 'Packing List', note: 'Item by item, including carton dimensions and gross weight' },
    { doc: 'Bill of Lading (B/L) or Airway Bill (AWB)', note: 'Required before or at shipment' },
    { doc: 'HS Code Declaration', note: 'Correct HS codes for all product categories' },
    { doc: 'Certificates (if applicable)', note: 'CE, RoHS, or other certificates as required' },
  ];

  return (
    <div className="space-y-5">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="font-semibold text-blue-900 mb-1">Required Documents Before Shipment</h3>
        <p className="text-sm text-blue-700">All documents must be uploaded before goods are shipped. All information must match the Purchase Order exactly.</p>
      </div>
      <div className="space-y-3">
        {required.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">{item.doc}</div>
              <div className="text-sm text-gray-500 mt-0.5">{item.note}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-medium">
        ⚠️ Shipment must not be dispatched until all documents have been uploaded and approved by IMvision.
      </div>
    </div>
  );
}

function QualityCheckSection() {
  const checks = [
    { title: 'Visual Inspection', items: ['Check product appearance and workmanship', 'Verify correct model, color, and labeling', 'No physical damage or defects'] },
    { title: 'Quantity Verification', items: ['Count must match the confirmed PO quantities', 'Verify packing list against physical goods', 'Report any discrepancies immediately'] },
    { title: 'Packaging Check', items: ['Outer cartons undamaged and properly sealed', 'Inner packaging adequate for transport', 'Correct labeling on all cartons'] },
    { title: 'Functional Test', items: ['Test product function as per specification', 'Verify all accessories included', 'Check firmware/software version if applicable'] },
  ];

  return (
    <div className="space-y-5">
      <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
        <h3 className="font-semibold text-green-900 mb-1">Quality Check Requirements</h3>
        <p className="text-sm text-green-700">A full quality check must be performed before shipment. Upload report, photos, and videos as evidence.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {checks.map((check, i) => (
          <div key={i} className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="font-semibold text-gray-900 mb-2 text-sm">{check.title}</div>
            <ul className="space-y-1">
              {check.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="font-semibold text-gray-900 mb-2 text-sm">Required Evidence — Upload to "5. Upload Documents"</div>
        <div className="flex flex-wrap gap-2">
          {['QC Report', 'QC Photos', 'QC Video'].map(e => (
            <span key={e} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium border border-blue-200">{e}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BatchTraceabilitySection() {
  const requirements = [
    'Each batch must be assigned a unique batch number',
    'Products and outer cartons must be clearly labeled with batch numbers',
    'Production documents must be provided per batch',
    'Full traceability back to production must be possible',
    'Batch numbers must be entered in "1. Confirm Order" section',
  ];

  return (
    <div className="space-y-5">
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
        <h3 className="font-semibold text-purple-900 mb-1">Batch & Files Requirements</h3>
        <p className="text-sm text-purple-700">All products must be traceable back to their production batch. Required configuration files must be provided for all applicable products.</p>
      </div>
      <div className="space-y-2">
        {requirements.map((req, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
            <span className="text-sm text-gray-700">{req}</span>
          </div>
        ))}
      </div>
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="font-semibold text-gray-900 mb-2 text-sm">Required Files — Upload to "5. Upload Documents"</div>
        <div className="flex flex-wrap gap-2">
          {['Production Records', 'Batch Labels / Photos', 'RCFGX File', 'Nova Card File'].map(e => (
            <span key={e} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium border border-purple-200">{e}</span>
          ))}
        </div>
      </div>
    </div>
  );
}