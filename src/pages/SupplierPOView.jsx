import React from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, FileText, CheckCircle2, Clock, Upload, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import SupplierPOConfirmation from "@/components/supplier/SupplierPOConfirmation";
import SupplierPODocuments from "@/components/supplier/SupplierPODocuments";
import SupplierDocumentUploadHub from "@/components/supplier/SupplierDocumentUploadHub";

export default function SupplierPOView() {
  const urlParams = new URLSearchParams(window.location.search);
  const poToken = urlParams.get('token');

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Inköpsorder hittades inte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Kontrollera att länken är korrekt eller kontakta din kontaktperson.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = {
    draft: { label: 'Utkast', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    sent: { label: 'Skickad', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    confirmed: { label: 'Bekräftad', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    in_production: { label: 'Under produktion', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    shipped: { label: 'Skickad', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    received: { label: 'Mottagen', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    cancelled: { label: 'Avbruten', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
  };

  const currentStatus = statusConfig[purchaseOrder.status] || statusConfig.draft;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">
                  Inköpsorder {purchaseOrder.po_number}
                </CardTitle>
                <p className="text-slate-600">
                  {purchaseOrder.supplier_name}
                </p>
              </div>
              <Badge className={currentStatus.color}>
                {currentStatus.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-slate-500 mb-1">Orderdatum</div>
                <div className="font-medium">
                  {purchaseOrder.order_date ? format(new Date(purchaseOrder.order_date), "d MMMM yyyy", { locale: sv }) : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Förväntat leveransdatum</div>
                <div className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {purchaseOrder.expected_delivery_date ? format(new Date(purchaseOrder.expected_delivery_date), "d MMMM yyyy", { locale: sv }) : '-'}
                </div>
              </div>
              {purchaseOrder.confirmed_delivery_date && (
                <div>
                  <div className="text-sm text-slate-500 mb-1">Bekräftat datum</div>
                  <div className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {format(new Date(purchaseOrder.confirmed_delivery_date), "d MMMM yyyy", { locale: sv })}
                  </div>
                </div>
              )}
            </div>

            {purchaseOrder.notes && (
              <div>
                <div className="text-sm text-slate-500 mb-1">Anteckningar</div>
                <div className="text-slate-700 bg-slate-50 p-3 rounded">{purchaseOrder.notes}</div>
              </div>
            )}

            {purchaseOrder.invoice_file_url && (
              <div>
                <div className="text-sm text-slate-500 mb-2">Originalfaktura</div>
                <a
                  href={purchaseOrder.invoice_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  {purchaseOrder.invoice_number ? `Faktura ${purchaseOrder.invoice_number}` : 'Visa originalfaktura'}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Artiklar ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{item.article_name}</div>
                      <div className="text-sm text-slate-500 mt-1">
                        Beställt: {item.quantity_ordered} st
                        {item.quantity_confirmed && item.quantity_confirmed !== item.quantity_ordered && (
                          <span className="ml-2 text-green-600">
                            • Bekräftat: {item.quantity_confirmed} st
                          </span>
                        )}
                      </div>
                      {item.supplier_batch_numbers && item.supplier_batch_numbers.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-slate-500">Batchnummer:</div>
                          {item.supplier_batch_numbers.map((batch, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="font-mono">{batch.batch_no}</span>
                              <span className="text-slate-500"> • {batch.quantity} st</span>
                              {batch.production_date && (
                                <span className="text-slate-500"> • Prod: {format(new Date(batch.production_date), "d MMM yyyy", { locale: sv })}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {item.status === 'confirmed' && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Bekräftad
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="confirm" className="space-y-6">
          <TabsList>
            <TabsTrigger value="confirm">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Bekräfta order
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Dokumentation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="confirm">
            <SupplierPOConfirmation 
              purchaseOrder={purchaseOrder} 
              items={items}
            />
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h3 className="font-semibold text-blue-800 mb-1">Dokumentationsportal</h3>
                <p className="text-sm text-blue-600">
                  Ladda upp dokument för varje fas av ordern. IMvision ser dina uppladdningar direkt och granskar dem.
                </p>
              </div>
              <SupplierDocumentUploadHub purchaseOrder={purchaseOrder} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}