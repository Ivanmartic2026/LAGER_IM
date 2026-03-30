import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, FileText, CheckCircle2, Clock, Upload, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import SupplierPOConfirmation from "@/components/supplier/SupplierPOConfirmation";
import SupplierDocumentUploadHub from "@/components/supplier/SupplierDocumentUploadHub";
import { cn } from "@/lib/utils";

const TABS = [
  { key: 'confirm', label: 'Confirm Order', icon: CheckCircle2 },
  { key: 'requirements', label: 'Requirements', icon: FileText },
  { key: 'upload', label: 'Upload Documents', icon: Upload },
];

export default function SupplierPOView() {
  const urlParams = new URLSearchParams(window.location.search);
  const poToken = urlParams.get('token');
  const [activeTab, setActiveTab] = useState('confirm');

  // Show error if no token
  if (!poToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-500">This link is missing a required token. Please use the link provided in your email.</p>
        </div>
      </div>
    );
  }

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
                      {item.article_sku && <div className="text-gray-400 text-xs mt-0.5">Article Number: <span className="font-mono">{item.article_sku}</span></div>}
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
              <SupplierPOConfirmation purchaseOrder={purchaseOrder} items={items} poToken={poToken} />
            )}
            {activeTab === 'requirements' && (
              <RequirementsSection />
            )}
            {activeTab === 'upload' && (
              <SupplierDocumentUploadHub purchaseOrder={purchaseOrder} poToken={poToken} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RequirementsSection() {
  const docs = [
    { doc: 'QC Report + Photos/Video', note: 'Full quality check must be performed before shipment', icon: '📋' },
    { doc: 'Commercial Invoice', note: 'Must match PO exactly — item, quantity, price, currency', icon: '🧾' },
    { doc: 'Packing List', note: 'Item by item, including carton dimensions and gross weight', icon: '📦' },
    { doc: 'Bill of Lading or Airway Bill', note: 'Required before or at shipment', icon: '🚢' },
    { doc: 'HS Code Declaration', note: 'Correct HS codes for all product categories', icon: '📑' },
    { doc: 'RCFGX / Nova Card files', note: 'Configuration files per batch (if applicable)', icon: '💾' },
    { doc: 'CE / RoHS Certificates', note: 'As required per product', icon: '✅' },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="font-semibold text-blue-900 mb-1">Required Documents</h3>
        <p className="text-sm text-blue-700">Upload all documents in the "Upload Documents" tab. All info must match the Purchase Order exactly.</p>
      </div>
      <div className="space-y-2">
        {docs.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
            <span className="text-xl flex-shrink-0">{item.icon}</span>
            <div>
              <div className="font-semibold text-gray-900 text-sm">{item.doc}</div>
              <div className="text-sm text-gray-500 mt-0.5">{item.note}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-medium">
        ⚠️ Do not dispatch shipment until all documents have been uploaded and approved by IMvision.
      </div>
    </div>
  );
}