import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
Search, Plus, ShoppingCart, Download, Calendar,
Truck, Package, User, Printer, Mail, Eye, X, CheckCircle2, AlertCircle, Link2, Copy, FileText,
TrendingUp, Clock, PackageCheck, Send, ChevronDown, ChevronRight, ArrowRight
} from "lucide-react";
// CheckCircle2 already imported above
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import PurchaseOrderForm from "@/components/orders/PurchaseOrderForm";
import SimplifiedReceivingForm from "@/components/receiving/SimplifiedReceivingForm";
import InvoiceScanButton from "@/components/orders/InvoiceScanButton";
import PODocumentHub from "@/components/purchaseorders/PODocumentHub";
import POStatusFlow from "@/components/purchaseorders/POStatusFlow";
import ActivityFeed from "@/components/activity/ActivityFeed";
import FortnoxPOSyncButton from "@/components/purchaseorders/FortnoxPOSyncButton";

export default function PurchaseOrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedPOForEmail, setSelectedPOForEmail] = useState(null);
  const [customEmail, setCustomEmail] = useState("");
  const [supplierPortalUrl, setSupplierPortalUrl] = useState("");
  const [receivingPO, setReceivingPO] = useState(null);
  const [viewingPO, setViewingPO] = useState(null);
  const [documentsPO, setDocumentsPO] = useState(null);
  const [accountingModalPO, setAccountingModalPO] = useState(null);
  const [accountingEmail, setAccountingEmail] = useState("");
  const [accountingCc, setAccountingCc] = useState("");
  const [accountingNote, setAccountingNote] = useState("");
  const [accountingSent, setAccountingSent] = useState(false);
  const [accountingPaymentPct, setAccountingPaymentPct] = useState("");

  const QUICK_EMAILS = [
    { name: "Frida Jansson", email: "frida.jansson@finec.se" },
    { name: "Ivan Martic", email: "ivan@imvision.se" },
    { name: "Joakim Hyltse", email: "joakim.hyltse@finec.se" },
    { name: "Josefine Johansson", email: "josefine@imvision.se" },
  ];
  
  const queryClient = useQueryClient();

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date'),
  });

  const { data: poItems = [] } = useQuery({
    queryKey: ['purchaseOrderItems'],
    queryFn: () => base44.entities.PurchaseOrderItem.list(),
  });

  const { data: receivingRecords = [] } = useQuery({
    queryKey: ['receivingRecords'],
    queryFn: () => base44.entities.ReceivingRecord.list(),
  });

  const deletePOMutation = useMutation({
    mutationFn: async (poId) => {
      const response = await base44.functions.invoke('deletePurchaseOrder', { purchaseOrderId: poId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrderItems'] });
      toast.success("Inköpsorder borttagen");
    },
    onError: (error) => {
      console.error('Delete PO error:', error);
      toast.error('Kunde inte ta bort inköpsorder: ' + error.message);
    }
  });

  const exportPOMutation = useMutation({
    mutationFn: async (poId) => {
      const response = await base44.functions.invoke('exportPurchaseOrderReceipt', { purchaseOrderId: poId });
      return response.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inkopsorder_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF nedladdad!');
    }
  });

  const printPOMutation = useMutation({
    mutationFn: async (po) => {
      let token = po.supplier_portal_token;
      if (!token) {
        token = crypto.randomUUID().replace(/-/g, '');
        await base44.entities.PurchaseOrder.update(po.id, { supplier_portal_token: token });
        queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      }
      const portalUrl = `${window.location.origin}/SupplierPOView?po=${po.id}&token=${token}`;
      const response = await base44.functions.invoke('printPurchaseOrder', { 
        purchaseOrderId: po.id,
        supplierPortalUrl: portalUrl
      });
      return response.data;
    },
    onSuccess: (htmlContent) => {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
      toast.success('Öppnar utskriftsdialog — välj "Spara som PDF"!');
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ poId, emailTo }) => {
      const response = await base44.functions.invoke('sendPurchaseOrderEmail', { 
        purchaseOrderId: poId,
        supplierEmail: emailTo || undefined
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Download HTML file
      const blob = new Blob([data.emailBody], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inkopsorder_${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      // Open email client in new tab to avoid navigating away
      const mailtoLink = `mailto:${data.recipientEmail}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent('Se bifogad inköpsorder i HTML-format.')}`;
      window.open(mailtoLink, '_blank');
      
      toast.success(`✅ Email skickat till ${data.recipientEmail || 'leverantören'}!`);
      setEmailModalOpen(false);
      setCustomEmail("");
      setSelectedPOForEmail(null);
    },
    onError: (error) => {
      toast.error('Kunde inte skicka email: ' + error.message);
    }
  });

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = !searchQuery || 
      po.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const pågående = ['sent','confirmed','in_production','shipped','ready_for_reception','waiting_for_supplier_documentation'];
    const matchesStatus = statusFilter === "all"
      ? po.status !== "received"
      : statusFilter === "sent"
      ? pågående.includes(po.status)
      : po.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getPOItemsCount = (poId) => {
    return poItems.filter(item => item.purchase_order_id === poId).length;
  };

  const statusColors = {
    draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    confirmed: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    waiting_for_supplier_documentation: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    in_production: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    shipped: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    ready_for_reception: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    received: "bg-green-500/20 text-green-400 border-green-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
    // legacy
    ordered: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    partially_received: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  const statusLabels = {
    draft: "Utkast",
    sent: "Skickad",
    confirmed: "Bekräftad",
    waiting_for_supplier_documentation: "Väntar dok.",
    in_production: "Under produktion",
    shipped: "Skickad / I transit",
    ready_for_reception: "Klar för mottagning",
    received: "Mottagen",
    cancelled: "Avbruten",
    // legacy
    ordered: "Beställd",
    partially_received: "Delvis mottagen",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-white/8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Purchase Orders</h1>
              <p className="text-white/40 text-sm mt-1">Hantera och spåra dina inköpsordrar</p>
            </div>
            <div className="flex gap-2">
              <InvoiceScanButton />
              <Button
                onClick={() => { setEditingPO(null); setShowForm(true); }}
                className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ny order
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            {
              filter: 'all',
              icon: ShoppingCart,
              iconColor: 'text-blue-400',
              accentColor: 'bg-blue-500',
              count: purchaseOrders.length,
              label: 'Totalt ordrar',
              activeClass: 'border-blue-500/40 bg-blue-500/8 shadow-lg shadow-blue-500/10',
            },
            {
              filter: 'sent',
              icon: Truck,
              iconColor: 'text-cyan-400',
              accentColor: 'bg-cyan-500',
              count: purchaseOrders.filter(po => ['sent','confirmed','in_production','shipped','ready_for_reception','waiting_for_supplier_documentation'].includes(po.status)).length,
              label: 'Pågående',
              activeClass: 'border-cyan-500/40 bg-cyan-500/8 shadow-lg shadow-cyan-500/10',
            },
            {
              filter: 'ready_for_reception',
              icon: Clock,
              iconColor: 'text-amber-400',
              accentColor: 'bg-amber-500',
              count: purchaseOrders.filter(po => po.status === 'ready_for_reception').length,
              label: 'Klar mottagning',
              activeClass: 'border-amber-500/40 bg-amber-500/8 shadow-lg shadow-amber-500/10',
            },
            {
              filter: 'received',
              icon: PackageCheck,
              iconColor: 'text-emerald-400',
              accentColor: 'bg-emerald-500',
              count: purchaseOrders.filter(po => po.status === 'received').length,
              label: 'Mottagna',
              activeClass: 'border-emerald-500/40 bg-emerald-500/8 shadow-lg shadow-emerald-500/10',
            },
          ].map(({ filter, icon: Icon, iconColor, accentColor, count, label, activeClass }) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "relative p-4 rounded-xl border text-left transition-all duration-200 overflow-hidden",
                statusFilter === filter
                  ? activeClass
                  : "bg-white/3 border-white/8 hover:bg-white/5 hover:border-white/15"
              )}
            >
              {statusFilter === filter && (
                <div className={cn("absolute top-0 left-0 w-1 h-full rounded-l-xl", accentColor)} />
              )}
              <div className="flex items-center justify-between mb-3">
                <Icon className={cn("w-4 h-4", iconColor)} />
                {statusFilter === filter && <div className={cn("w-1.5 h-1.5 rounded-full", accentColor)} />}
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{count}</p>
              <p className="text-xs text-white/40 mt-0.5">{label}</p>
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök ordernummer eller leverantör..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:bg-white/8 transition-all"
            />
          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-white/6 mb-6" />

        {/* Purchase Orders List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-white/3 animate-pulse" />
            ))}
          </div>
        ) : filteredPOs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-7 h-7 text-white/20" />
            </div>
            <h3 className="text-base font-semibold text-white/70 mb-2">Inga inköpsordrar</h3>
            <p className="text-sm text-white/30 mb-6">Skapa din första Purchase Order för att komma igång</p>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-500">
              <Plus className="w-4 h-4 mr-2" />
              Skapa Purchase Order
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredPOs.map((po) => {
                const itemsCount = getPOItemsCount(po.id);
                return (
                  <motion.div
                    key={po.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="relative rounded-xl bg-[#111118] border border-white/8 hover:border-white/14 transition-all duration-200 overflow-hidden group"
                  >
                    {/* Left accent bar based on status */}
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", {
                      "bg-slate-500": po.status === 'draft',
                      "bg-blue-500": po.status === 'sent',
                      "bg-cyan-400": po.status === 'confirmed',
                      "bg-yellow-500": po.status === 'waiting_for_supplier_documentation',
                      "bg-purple-500": po.status === 'in_production',
                      "bg-violet-500": po.status === 'shipped',
                      "bg-amber-500": po.status === 'ready_for_reception',
                      "bg-emerald-500": po.status === 'received',
                      "bg-red-500": po.status === 'cancelled',
                    })} />

                    {/* Main content */}
                    <div className="pl-4">
                      {/* Top row: PO info + cost */}
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xl font-extrabold text-white tracking-tight">
                                {po.po_number || `PO #${po.id.slice(0, 8)}`}
                              </h3>
                              <Badge className={cn("text-sm font-semibold border px-2.5 py-0.5", statusColors[po.status])}>
                                {statusLabels[po.status]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-white/50 text-xs mt-0.5">
                              <Truck className="w-3 h-3 text-white/30" />
                              <span className="truncate">{po.supplier_name}</span>
                            </div>

                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                          {po.fortnox_project_number && (
                            <div className="flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 rounded-lg px-2.5 py-1">
                              <span className="text-xs text-blue-400/70">Projekt</span>
                              <span className="text-sm font-bold text-blue-200">{po.fortnox_project_number}</span>
                            </div>
                          )}
                          {po.total_cost && (
                            <div className="text-right">
                              <div className="text-base font-bold text-white">{po.total_cost.toLocaleString('sv-SE')}<span className="text-xs font-normal text-white/30 ml-1">kr</span></div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tags row */}
                      {(po.expected_delivery_date || itemsCount > 0 || po.order_date || po.delivery_terms || po.mode_of_transport) && (
                        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                          {po.expected_delivery_date && po.status !== 'received' && (() => {
                            const eta = new Date(po.expected_delivery_date);
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            eta.setHours(0,0,0,0);
                            const daysLeft = Math.round((eta - today) / (1000 * 60 * 60 * 24));
                            const isOverdue = daysLeft < 0;
                            const isToday = daysLeft === 0;
                            return (
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border",
                                isOverdue ? "bg-red-500/15 border-red-500/30 text-red-300" :
                                isToday ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" :
                                daysLeft <= 7 ? "bg-amber-500/15 border-amber-500/30 text-amber-300" :
                                "bg-blue-500/10 border-blue-500/25 text-blue-300"
                              )}>
                                <Calendar className="w-3.5 h-3.5" />
                                ETA {format(new Date(po.expected_delivery_date), "d MMM yyyy", { locale: sv })}
                                <span className={cn(
                                  "ml-0.5 px-1.5 py-0.5 rounded text-xs font-bold",
                                  isOverdue ? "bg-red-500/30 text-red-200" :
                                  isToday ? "bg-emerald-500/30 text-emerald-200" :
                                  daysLeft <= 7 ? "bg-amber-500/30 text-amber-200" :
                                  "bg-blue-500/20 text-blue-200"
                                )}>
                                  {isOverdue ? `${Math.abs(daysLeft)}d sen` : isToday ? "Idag!" : `${daysLeft}d`}
                                </span>
                              </span>
                            );
                          })()}
                          {itemsCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-white/6 text-white/40">
                              <Package className="w-3 h-3" />
                              {itemsCount} artiklar
                            </span>
                          )}
                          {po.order_date && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-white/5 text-white/30">
                              {format(new Date(po.order_date), "d MMM yyyy", { locale: sv })}
                            </span>
                          )}
                          {po.delivery_terms && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                              {po.delivery_terms}
                            </span>
                          )}
                          {po.mode_of_transport && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-teal-500/10 border border-teal-500/20 text-teal-300">
                              {{
                                air_freight_express: '✈ Air Express',
                                air_freight_economy: '✈ Air Economy',
                                sea_freight: '🚢 Sea Freight',
                                rail_transport: '🚂 Rail',
                                road_transport: '🚛 Road (Truck)',
                                courier: '📦 Courier',
                              }[po.mode_of_transport] || po.mode_of_transport}
                            </span>
                          )}
                          {po.cost_center && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-300">
                              {{
                                '10_support_service': '10 – Support & Service',
                                '20_rental': '20 – Rental',
                                '30_sales': '30 – Sales',
                                '99_generell': '99 – Generell',
                              }[po.cost_center] || po.cost_center}
                            </span>
                          )}
                          {po.notes && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-white/5 text-white/30 max-w-xs truncate">
                              {po.notes}
                            </span>
                          )}
                          {po.payment_percentage_sent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                              <Send className="w-2.5 h-2.5" />
                              Ekonomi: {po.payment_percentage_sent}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/6 bg-white/[0.02]">
                        <div className="flex flex-wrap gap-1">
                          <FortnoxPOSyncButton po={po} />
                          <POStatusFlow po={po} />
                          {(po.status === 'ordered' || po.status === 'partially_received') && (
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors" onClick={() => setReceivingPO(po)}>
                              <Package className="w-3 h-3" />Ta emot
                            </button>
                          )}
                          {(po.status === 'received' || po.status === 'partially_received') && (
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-white/50 hover:text-white hover:bg-white/8 transition-colors" onClick={() => setViewingPO(po)}>
                              <Eye className="w-3 h-3" />Följesedel
                            </button>
                          )}
                          <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-white/50 hover:text-white hover:bg-white/8 transition-colors" onClick={() => setDocumentsPO(po)}>
                            <FileText className="w-3 h-3" />Dokument
                          </button>
                          <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-white/50 hover:text-white hover:bg-white/8 transition-colors" onClick={async () => {
                            let token = po.supplier_portal_token;
                            if (!token) {
                              token = crypto.randomUUID().replace(/-/g, '');
                              await base44.entities.PurchaseOrder.update(po.id, { supplier_portal_token: token });
                              queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
                            }
                            const portalUrl = `${window.location.origin}${createPageUrl('SupplierPOView')}?po=${po.id}&token=${token}`;
                            navigator.clipboard.writeText(portalUrl);
                            toast.success('Leverantörslänk kopierad!');
                          }}>
                            <Link2 className="w-3 h-3" />Lev.länk
                          </button>
                          <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-white/50 hover:text-white hover:bg-white/8 transition-colors" onClick={async () => { 
                            let token = po.supplier_portal_token;
                            if (!token) {
                              token = crypto.randomUUID().replace(/-/g, '');
                              await base44.entities.PurchaseOrder.update(po.id, { supplier_portal_token: token });
                              queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
                            }
                            setSelectedPOForEmail(po);
                            setSupplierPortalUrl(`${window.location.origin}${createPageUrl('SupplierPOView')}?po=${po.id}&token=${token}`);
                            setEmailModalOpen(true);
                          }}>
                            <Mail className="w-3 h-3" />Email
                          </button>
                          <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-white/50 hover:text-white hover:bg-white/8 transition-colors" onClick={() => printPOMutation.mutate(po)} disabled={printPOMutation.isPending}>
                            <Printer className="w-3 h-3" />Skriv ut
                          </button>
                          {po.status === 'received' && (
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-white/50 hover:text-white hover:bg-white/8 transition-colors" onClick={() => exportPOMutation.mutate(po.id)} disabled={exportPOMutation.isPending}>
                              <Download className="w-3 h-3" />Kvitto
                            </button>
                          )}
                          {po.status === 'received' && !po.fortnox_incoming_goods_id && (
                            <button
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow-lg shadow-emerald-500/20 transition-all"
                              onClick={async () => {
                                if (!confirm(`Synca inleverans till Fortnox för ${po.po_number || po.id.slice(0,8)}?`)) return;
                                const t = toast.loading("Syncar till Fortnox...");
                                try {
                                  const res = await base44.functions.invoke('fortnoxSyncV2', {
                                    purchaseOrderId: po.id,
                                    createInboundDelivery: true
                                  });
                                  toast.dismiss(t);
                                  const data = res.data;
                                  if (data?.success) {
                                    const skipped = data?.diagnostics?.skippedItems?.length || 0;
                                    const gnr = data?.goodsReceiptNumber;
                                    toast.success(
                                      `✅ Inleverans skapad i Fortnox!${gnr ? ` (GR#${gnr})` : ''}${skipped > 0 ? ` · ${skipped} rad(er) hoppades över` : ''}`,
                                      { duration: 6000 }
                                    );
                                  } else {
                                    const errMsg = data?.errors?.[0] || data?.error || 'Okänt fel';
                                    toast.error(`❌ Misslyckades: ${errMsg}`, { duration: 8000 });
                                  }
                                  queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
                                } catch (e) {
                                  toast.error('Misslyckades: ' + e.message, { id: t });
                                }
                              }}
                            >
                              <Package className="w-4 h-4" />Synca till Fortnox
                            </button>
                          )}
                          {po.status === 'received' && po.fortnox_incoming_goods_id && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />Synkad FN #{po.fortnox_incoming_goods_id}
                            </span>
                          )}
                          {po.invoice_file_url && (
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-amber-400 hover:bg-amber-500/10 transition-colors" onClick={() => window.open(po.invoice_file_url, '_blank')}>
                              <FileText className="w-3 h-3" />Faktura
                            </button>
                          )}
                          <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors" onClick={() => setAccountingModalPO(po)}>
                            <Send className="w-3 h-3" />Till ekonomi
                          </button>
                        </div>
                        <div className="flex gap-1 flex-shrink-0 ml-2">
                          <button className="px-2.5 py-1 rounded-md text-xs text-purple-400 hover:bg-purple-500/10 transition-colors" onClick={async () => {
                            try {
                              await base44.functions.invoke('fortnoxSyncV2', { 
                                purchaseOrderId: po.id
                              });
                              toast.success('Order synkad med Fortnox!');
                              queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
                            } catch (e) {
                              toast.error('Synk misslyckades');
                            }
                          }}>
                            <TrendingUp className="w-3 h-3 mr-1 inline" />Synca
                          </button>
                          <button className="px-2.5 py-1 rounded-md text-xs text-white/40 hover:text-white hover:bg-white/8 transition-colors" onClick={() => { setEditingPO(po); setShowForm(true); }}>
                            Redigera
                          </button>
                          <button className="px-2.5 py-1 rounded-md text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors" onClick={() => { if (confirm('Är du säker?')) deletePOMutation.mutate(po.id); }}>
                            Ta bort
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Purchase Order Form Modal */}
        {showForm && (
          <PurchaseOrderForm
            purchaseOrder={editingPO}
            onClose={() => {
              setShowForm(false);
              setEditingPO(null);
            }}
          />
        )}

        {/* Receiving Form */}
        {receivingPO && (
          <SimplifiedReceivingForm
            purchaseOrder={receivingPO}
            onClose={() => setReceivingPO(null)}
            onComplete={() => setReceivingPO(null)}
          />
        )}

        {/* Documents Modal */}
        {documentsPO && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDocumentsPO(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <div>
                  <h2 className="text-xl font-bold text-white">Dokumentation</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {documentsPO.po_number || `PO #${documentsPO.id.slice(0, 8)}`} · {documentsPO.supplier_name}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDocumentsPO(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <PODocumentHub purchaseOrder={documentsPO} />
                <div className="border-t border-slate-700 pt-6">
                  <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    Aktivitetslogg
                  </h3>
                  <ActivityFeed
                    entityType="POActivity"
                    entityId={documentsPO.id}
                    logFunctionName="logPOActivity"
                    idField="purchase_order_id"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Email Modal */}
         {emailModalOpen && selectedPOForEmail && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => {
               setEmailModalOpen(false);
               setCustomEmail("");
               setSelectedPOForEmail(null);
               setSupplierPortalUrl("");
             }}
           >
             <motion.div
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               onClick={(e) => e.stopPropagation()}
               className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6"
             >
               <h3 className="text-xl font-bold text-white mb-4">Skicka PO till leverantör</h3>
               <p className="text-sm text-slate-400 mb-4">Emailet inkluderar länken till leverantörsportalen där de kan bekräfta ordern och ladda upp dokument.</p>

               <div className="space-y-4">
                 <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                   <p className="text-xs text-green-400 font-medium">✓ Leverantörslänk läggs automatiskt till emailet</p>
                 </div>

                 <div>
                   <label className="text-sm font-medium text-slate-300 mb-2 block">
                     Email-adress
                   </label>
                   <Input
                     type="email"
                     value={customEmail}
                     onChange={(e) => setCustomEmail(e.target.value)}
                     placeholder="Ange email eller lämna tomt för leverantörens email"
                     className="bg-slate-800 border-slate-700 text-white"
                   />
                   <p className="text-xs text-slate-500 mt-2">
                     Lämna tomt för att skicka till leverantörens registrerade email
                   </p>
                 </div>

                 <div className="flex gap-3 pt-4">
                   <Button
                     variant="outline"
                     onClick={() => {
                       setEmailModalOpen(false);
                       setCustomEmail("");
                       setSelectedPOForEmail(null);
                       setSupplierPortalUrl("");
                     }}
                     className="flex-1 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
                   >
                     Avbryt
                   </Button>
                   <Button
                     onClick={async () => {
                       if (!customEmail) {
                         toast.error("Ange en email-adress till leverantören");
                         return;
                       }
                       const t = toast.loading("Skickar...");
                       try {
                         await base44.functions.invoke('sendPOToSupplier', {
                               purchaseOrderId: selectedPOForEmail.id,
                               emailTo: customEmail,
                               supplierPortalUrl: supplierPortalUrl
                             });
                         toast.dismiss(t);
                         toast.success("Email skickat till leverantören!");
                         setEmailModalOpen(false);
                         setCustomEmail("");
                         setSelectedPOForEmail(null);
                         setSupplierPortalUrl("");
                       } catch (err) {
                         toast.error("Kunde inte skicka: " + err.message, { id: t });
                       }
                     }}
                     disabled={!customEmail}
                     className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                   >
                     <Mail className="w-4 h-4 mr-2" />
                     Skicka
                   </Button>
                 </div>
               </div>
             </motion.div>
           </motion.div>
         )}

        {/* Accounting Package Modal */}
        {accountingModalPO && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setAccountingModalPO(null); setAccountingEmail(""); setAccountingCc(""); setAccountingNote(""); setAccountingSent(false); setAccountingPaymentPct(""); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6"
            >
              {accountingSent ? (
                /* Confirmation view */
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Skickat!</h3>
                  <p className="text-slate-400 text-sm mb-6">
                    Ekonomipaketet har skickats till<br />
                    <span className="text-white font-medium">{accountingEmail}</span>
                  </p>
                  <Button
                    onClick={() => { setAccountingModalPO(null); setAccountingEmail(""); setAccountingCc(""); setAccountingNote(""); setAccountingSent(false); setAccountingPaymentPct(""); }}
                    className="bg-emerald-600 hover:bg-emerald-500 w-full"
                  >
                    Stäng
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-white mb-1">Skicka till ekonomi</h3>
                  <p className="text-sm text-slate-400 mb-5">
                    Skickar ett samlat paket med PO-detaljer och leverantörsfaktura.
                  </p>

                  <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Order</span>
                      <span className="text-white font-semibold">{accountingModalPO.po_number || `PO-${accountingModalPO.id.slice(0,8)}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Leverantör</span>
                      <span className="text-white">{accountingModalPO.supplier_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Belopp</span>
                      <span className="text-white font-semibold">{(accountingModalPO.total_cost || 0).toLocaleString('sv-SE')} {accountingModalPO.invoice_currency || 'SEK'}</span>
                    </div>
                    {accountingModalPO.invoice_file_url ? (
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs pt-1">
                        <FileText className="w-3.5 h-3.5" />
                        Leverantörsfaktura finns uppladdad ✓
                      </div>
                    ) : (
                      <div className="text-red-400 text-xs pt-1">⚠️ Ingen leverantörsfaktura uppladdad</div>
                    )}
                  </div>

                  {/* Existing payment log */}
                  {accountingModalPO.payment_log?.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-xs font-semibold text-slate-400 mb-2">Tidigare skickade betalningar</p>
                      <div className="space-y-1.5">
                        {accountingModalPO.payment_log.map((entry, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-400">{entry.percentage}</span>
                            <span className="text-slate-400">{entry.sent_by}</span>
                            <span className="text-slate-500">{entry.sent_date ? format(new Date(entry.sent_date), "d MMM yyyy HH:mm", { locale: sv }) : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment percentage */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Betalningsbeteckning *</label>
                    <div className="flex gap-2">
                      {['20%', '50%', '100%'].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setAccountingPaymentPct(pct)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-sm font-bold border transition-colors",
                            accountingPaymentPct === pct
                              ? "bg-emerald-600 border-emerald-500 text-white"
                              : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white"
                          )}
                        >
                          {pct}
                        </button>
                      ))}
                    </div>
                    {!accountingPaymentPct && (
                      <p className="text-xs text-amber-400 mt-1">Välj betalningsbeteckning</p>
                    )}
                  </div>

                  <div className="mb-5">
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Meddelande (valfritt)</label>
                    <textarea
                      value={accountingNote}
                      onChange={(e) => setAccountingNote(e.target.value)}
                      placeholder="Skriv ett meddelande till ekonomiavdelningen..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Snabbval mottagare</label>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_EMAILS.map(({ name, email }) => (
                        <button
                          key={email}
                          onClick={() => setAccountingEmail(email)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                            accountingEmail === email
                              ? "bg-emerald-600 border-emerald-500 text-white"
                              : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white"
                          )}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Email till ekonomi *</label>
                    <Input
                      type="email"
                      value={accountingEmail}
                      onChange={(e) => setAccountingEmail(e.target.value)}
                      placeholder="ekonomi@foretag.se"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Kopia (CC) <span className="text-slate-500 font-normal">— valfritt</span></label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {QUICK_EMAILS.filter(q => q.email !== accountingEmail).map(({ name, email }) => (
                        <button
                          key={email}
                          onClick={() => setAccountingCc(prev => {
                            const emails = prev ? prev.split(',').map(e => e.trim()).filter(Boolean) : [];
                            if (emails.includes(email)) return emails.filter(e => e !== email).join(', ');
                            return [...emails, email].join(', ');
                          })}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                            accountingCc.includes(email)
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white"
                          )}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="text"
                      value={accountingCc}
                      onChange={(e) => setAccountingCc(e.target.value)}
                      placeholder="cc@foretag.se, annan@foretag.se"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => { setAccountingModalPO(null); setAccountingEmail(""); setAccountingCc(""); setAccountingNote(""); setAccountingSent(false); setAccountingPaymentPct(""); }}
                      className="flex-1 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
                    >
                      Avbryt
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!accountingEmail) { toast.error("Ange en email-adress"); return; }
                        if (!accountingPaymentPct) { toast.error("Välj betalningsbeteckning (20%/50%/100%)"); return; }
                        const t = toast.loading("Skickar till ekonomi...");
                        try {
                          await base44.functions.invoke('sendAccountingPackage', {
                            purchaseOrderId: accountingModalPO.id,
                            accountingEmail,
                            ccEmails: accountingCc ? accountingCc.split(',').map(e => e.trim()).filter(Boolean) : undefined,
                            note: accountingNote || undefined,
                            paymentPercentage: accountingPaymentPct
                          });
                          // Save payment log entry
                          const me = await base44.auth.me();
                          const newLogEntry = {
                            percentage: accountingPaymentPct,
                            sent_date: new Date().toISOString(),
                            sent_by: me?.email || 'okänd',
                            note: accountingNote || ''
                          };
                          const existingLog = accountingModalPO.payment_log || [];
                          await base44.entities.PurchaseOrder.update(accountingModalPO.id, {
                            payment_percentage_sent: accountingPaymentPct,
                            sent_for_payment_date: new Date().toISOString(),
                            sent_for_payment_by: me?.email || 'okänd',
                            payment_log: [...existingLog, newLogEntry]
                          });
                          queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
                          toast.dismiss(t);
                          setAccountingSent(true);
                        } catch (err) {
                          toast.error("Kunde inte skicka: " + err.message, { id: t });
                        }
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Skicka paket
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Receiving Records Detail Modal */}
        {viewingPO && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingPO(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <div>
                  <h2 className="text-xl font-bold text-white">Följesedel & Mottagningsdetaljer</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {viewingPO.po_number || `PO #${viewingPO.id.slice(0, 8)}`} · {viewingPO.supplier_name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewingPO(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {(() => {
                  const records = receivingRecords.filter(r => r.purchase_order_id === viewingPO.id);
                  
                  if (records.length === 0) {
                    return (
                      <div className="text-center py-16">
                        <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">Inga mottagningar registrerade ännu</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {records.map((record) => (
                        <div key={record.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white mb-1">{record.article_name}</h3>
                              <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span>Kvantitet: <span className="text-white font-medium">{record.quantity_received} st</span></span>
                                {record.shelf_address && (
                                  <span>Hyllplats: <span className="text-white font-medium">{record.shelf_address}</span></span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {record.quality_check_passed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-red-400" />
                              )}
                            </div>
                          </div>

                          {record.has_discrepancy && (
                            <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/30">
                              <p className="text-sm text-red-400">
                                <AlertCircle className="w-4 h-4 inline mr-1" />
                                Avvikelse: {record.discrepancy_reason || 'Ingen anledning angiven'}
                              </p>
                            </div>
                          )}

                          {record.notes && (
                            <div className="mb-3">
                              <p className="text-sm text-slate-400 mb-1">Anteckningar:</p>
                              <p className="text-sm text-slate-300">{record.notes}</p>
                            </div>
                          )}

                          {record.image_urls && record.image_urls.length > 0 && (
                            <div>
                              <p className="text-sm text-slate-400 mb-2">Bilder från mottagning:</p>
                              <div className="grid grid-cols-3 gap-2">
                                {record.image_urls.map((url, imgIndex) => (
                                  <img 
                                    key={imgIndex} 
                                    src={url} 
                                    alt={`Bild ${imgIndex + 1}`}
                                    className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.open(url, '_blank')}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
                            Mottagen av {record.received_by} · {format(new Date(record.created_date), "d MMM yyyy HH:mm", { locale: sv })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end p-6 border-t border-slate-700 bg-slate-900/50">
                <Button
                  onClick={() => setViewingPO(null)}
                  variant="outline"
                  className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                >
                  Stäng
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}