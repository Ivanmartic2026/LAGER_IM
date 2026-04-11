import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  ArrowLeft, Package, MapPin, User, Calendar, FileText, 
  CheckCircle2, AlertCircle, ShoppingCart, Download, Truck
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import FortnoxSyncButton from "@/components/orders/FortnoxSyncButton";
import OrderTasks from "@/components/orders/OrderTasks";

export default function OrderDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('id');

  const [editMode, setEditMode] = useState(false);
  const [needsOrdering, setNeedsOrdering] = useState(false);
  const [orderingCompleted, setOrderingCompleted] = useState(false);
  const [orderingNotes, setOrderingNotes] = useState('');

  const queryClient = useQueryClient();

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => base44.entities.Order.list().then(orders => 
      orders.find(o => o.id === orderId)
    ),
    enabled: !!orderId,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['orderItems', orderId],
    queryFn: () => base44.entities.OrderItem.filter({ order_id: orderId }),
    enabled: !!orderId,
  });

  const { data: relatedPOs = [] } = useQuery({
    queryKey: ['relatedPOs', orderId],
    queryFn: async () => {
      const allPOs = await base44.entities.PurchaseOrder.list('-created_date');
      return allPOs.filter(po =>
        po.order_id === orderId ||
        (order?.fortnox_project_number && po.fortnox_project_number === order.fortnox_project_number)
      );
    },
    enabled: !!orderId && !!order,
  });

  const { data: linkedWorkOrders = [] } = useQuery({
    queryKey: ['workOrders', orderId],
    queryFn: () => base44.entities.WorkOrder.filter({ order_id: orderId }),
    enabled: !!orderId,
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success("Order uppdaterad");
      setEditMode(false);
    }
  });

  const exportOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      const response = await base44.functions.invoke('exportOrder', { orderId });
      return response.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order_${order.order_number || order.id}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF nedladdad!');
    }
  });

  const createFortnoxProjectMutation = useMutation({
    mutationFn: async (orderId) => {
      const response = await base44.functions.invoke('createFortnoxProject', { order_id: orderId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success(`Fortnox-projekt skapat: ${data.project_number}`);
    },
    onError: (error) => {
      toast.error('Kunde inte skapa projekt: ' + (error.message || 'Okänt fel'));
    }
  });

  const handleSaveOrderingInfo = () => {
    updateOrderMutation.mutate({
      id: order.id,
      data: {
        needs_ordering: needsOrdering,
        ordering_completed: orderingCompleted,
        ordering_notes: orderingNotes
      }
    });
  };

  useEffect(() => {
    if (order) {
      setNeedsOrdering(order.needs_ordering || false);
      setOrderingCompleted(order.ordering_completed || false);
      setOrderingNotes(order.ordering_notes || '');
    }
  }, [order]);

  if (orderLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-blue-300 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-black p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          <Button variant="outline" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka
          </Button>
          <div className="text-center py-16">
            <p className="text-white/50">Order inte hittad</p>
          </div>
        </div>
      </div>
    );
  }

  // Workflow status bar
  const WORKFLOW_PHASES = [
    { key: 'SÄLJ',         label: 'Säljare',       role: order.created_by },
    { key: 'KONSTRUKTION', label: 'Projektledare', role: linkedWorkOrders[0]?.assigned_to_produktion_name },
    { key: 'PRODUKTION',   label: 'Konstruktör',   role: linkedWorkOrders[0]?.assigned_to_konstruktion_name },
    { key: 'LAGER',        label: 'Lager',         role: linkedWorkOrders[0]?.assigned_to_lager_name },
    { key: 'MONTERING',    label: 'Tekniker',      role: linkedWorkOrders[0]?.assigned_to_montering_name || linkedWorkOrders[0]?.technician_name },
  ];
  const phaseOrder = ['SÄLJ','KONSTRUKTION','PRODUKTION','LAGER','MONTERING'];
  const currentPhaseIdx = phaseOrder.indexOf(order.status);

  const statusColors = {
    draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    'SÄLJ': "bg-slate-500/20 text-slate-400 border-slate-500/30",
    'KONSTRUKTION': "bg-sky-500/20 text-sky-400 border-sky-500/30",
    'PRODUKTION': "bg-blue-500/20 text-blue-400 border-blue-500/30",
    'LAGER': "bg-amber-500/20 text-amber-400 border-amber-500/30",
    'MONTERING': "bg-purple-500/20 text-purple-400 border-purple-500/30",
    ready_for_handover: "bg-blue-400/20 text-blue-300 border-blue-400/30",
    handed_over: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    planning: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    construction: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    ready_for_production: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    in_production: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    ready_for_warehouse: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    picking: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    ready_for_delivery: "bg-lime-500/20 text-lime-400 border-lime-500/30",
    shipped: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    delivered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30"
  };

  const statusLabels = {
    draft: "Utkast",
    'SÄLJ': "Sälj",
    'KONSTRUKTION': "Konstruktion",
    'PRODUKTION': "Produktion",
    'LAGER': "Lager",
    'MONTERING': "Montering",
    ready_for_handover: "Klar för överlämning",
    handed_over: "Överlämnad",
    planning: "Planering",
    construction: "Konstruktion",
    ready_for_production: "Klar för produktion",
    in_production: "I produktion",
    ready_for_warehouse: "Klar för lager",
    picking: "Plockas",
    ready_for_delivery: "Klar för leverans",
    shipped: "Skickad",
    delivered: "Levererad",
    cancelled: "Avbruten"
  };

  const itemStatusColors = {
    pending: "bg-slate-500/20 text-slate-400",
    partial: "bg-amber-500/20 text-amber-400",
    picked: "bg-green-500/20 text-green-400"
  };

  const totalOrdered = orderItems.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0);
  const totalPicked = orderItems.reduce((sum, item) => sum + (item.quantity_picked || 0), 0);

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/OrderEdit?id=${orderId}`)}
              className="bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30"
            >
              Redigera order
            </Button>
            {linkedWorkOrders.length > 0 && (
              <Button
                variant="outline"
                onClick={() => navigate(`/WorkOrders/${linkedWorkOrders[0].id}`)}
                className="bg-purple-600/20 border-purple-500/30 text-purple-400 hover:bg-purple-600/30"
              >
                Se arbetsorder
              </Button>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white mb-2">
              {order.order_number || `Order #${order.id.slice(0, 8)}`}
            </h1>
            <div className="flex items-center gap-2 justify-end flex-wrap">
              <Badge className={cn("text-xs", statusColors[order.status])}>
                {statusLabels[order.status]}
              </Badge>
              {order.priority === 'urgent' && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                  Brådskande
                </Badge>
              )}
              {order.fortnox_project_number && (
                <Badge className="bg-purple-500/30 text-purple-300 border-purple-500/50 text-xs flex items-center gap-1 font-semibold">
                  Fortnox Projekt #{order.fortnox_project_number}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Workflow Status Bar */}
        <div className="mb-6 bg-white/5 rounded-2xl border border-white/10 p-4">
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {WORKFLOW_PHASES.map((phase, idx) => {
              const isDone = currentPhaseIdx > idx;
              const isActive = currentPhaseIdx === idx;
              return (
                <div key={phase.key} className="flex items-center gap-1 flex-1 min-w-0">
                  <div className={cn("flex-1 flex flex-col items-center p-2 rounded-xl text-center min-w-[70px] transition-all",
                    isActive ? "bg-blue-600/30 border border-blue-500/50" :
                    isDone ? "bg-green-500/15 border border-green-500/30" :
                    "bg-white/5 border border-white/10 opacity-50"
                  )}>
                    <span className={cn("text-lg", isDone ? "" : isActive ? "" : "")}>
                      {isDone ? "✅" : isActive ? "🔵" : "⬜"}
                    </span>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wide mt-0.5",
                      isActive ? "text-blue-300" : isDone ? "text-green-400" : "text-white/30")}>
                      {phase.label}
                    </span>
                    {phase.role && (
                      <span className="text-[9px] text-white/40 truncate max-w-full mt-0.5">
                        {String(phase.role).split('@')[0].replace('.', ' ')}
                      </span>
                    )}
                  </div>
                  {idx < WORKFLOW_PHASES.length - 1 && (
                    <div className={cn("w-4 h-0.5 flex-shrink-0", isDone ? "bg-green-400" : "bg-white/10")} />
                  )}
                </div>
              );
            })}
          </div>
          {order.status === 'SÄLJ' && !order.sales_completed && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-3">
              <Button size="sm"
                className="bg-green-600 hover:bg-green-500 text-white gap-2"
                onClick={async () => {
                  await updateOrderMutation.mutateAsync({ id: order.id, data: {
                    sales_completed: true, status: 'KONSTRUKTION'
                  }});
                  try {
                    const users = await base44.entities.User.list();
                    const admins = users.filter(u => u.role === 'admin');
                    await Promise.all(admins.map(u => base44.entities.Notification.create({
                      user_email: u.email,
                      title: `Order ${order.order_number || order.id.slice(0,8)} redo för PL`,
                      message: `Order ${order.order_number} (${order.customer_name}) är redo för projektledning.`,
                      type: 'order_status', priority: 'normal',
                      link_to: order.id, link_page: 'OrderDetail'
                    })));
                  } catch {}
                  toast.success('Försäljning markerad klar — order redo för projektledare!');
                }}
                disabled={updateOrderMutation.isPending}>
                ✅ Markera försäljning klar
              </Button>
              <span className="text-xs text-white/40">Skickar notis till projektledare</span>
            </div>
          )}
          {order.sales_completed && order.status === 'KONSTRUKTION' && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-full">✅ Redo för projektledare</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-6">
          
          {/* Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 rounded-2xl border border-white/10 p-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
                <User className="w-4 h-4" />
                <span>Kund</span>
              </div>
              <p className="text-white font-medium text-lg">{order.customer_name}</p>
            </div>

            {order.customer_reference && (
              <div>
                <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
                  <FileText className="w-4 h-4" />
                  <span>Referens</span>
                </div>
                <p className="text-white font-medium text-lg">{order.customer_reference}</p>
              </div>
            )}

            {order.delivery_date && (
              <div>
                <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>Leveransdatum</span>
                </div>
                <p className="text-white font-medium text-lg">
                  {format(new Date(order.delivery_date), "d MMMM yyyy", { locale: sv })}
                </p>
              </div>
            )}

            {order.picked_by && (
              <div>
                <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Plockad av</span>
                </div>
                <p className="text-white font-medium text-lg">{order.picked_by}</p>
                {order.picked_date && (
                  <p className="text-xs text-white/40">
                    {format(new Date(order.picked_date), "d MMM yyyy HH:mm", { locale: sv })}
                  </p>
                )}
              </div>
            )}

            {order.fortnox_invoiced && order.fortnox_invoice_number && (
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
                  <FileText className="w-4 h-4" />
                  <span>Fakturerad i Fortnox</span>
                </div>
                <p className="text-white font-medium font-mono text-lg">{order.fortnox_invoice_number}</p>
                {order.invoiced_date && (
                  <p className="text-xs text-white/40">
                    {format(new Date(order.invoiced_date), "d MMM yyyy HH:mm", { locale: sv })}
                  </p>
                )}
                {order.invoiced_by && (
                  <p className="text-xs text-white/40">
                    Fakturerad av: {order.invoiced_by}
                  </p>
                )}
              </div>
            )}

            {order.created_by && (
              <div>
                <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
                  <User className="w-4 h-4" />
                  <span>Skapad av</span>
                </div>
                <p className="text-white font-medium text-lg">{order.created_by}</p>
                {order.created_date && (
                  <p className="text-xs text-white/40">
                    {format(new Date(order.created_date), "d MMM yyyy HH:mm", { locale: sv })}
                  </p>
                )}
              </div>
            )}
          </div>

          {order.delivery_address && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-2 text-sm text-white/50 mb-3">
                <MapPin className="w-4 h-4" />
                <span>Leveransadress</span>
              </div>
              <p className="text-white whitespace-pre-wrap">{order.delivery_address}</p>
            </div>
          )}

          {/* Ordering Status */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Beställningsstatus
              </h3>
              {!editMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditMode(true)}
                  className="bg-white/5 border-white/10 hover:bg-white/10 h-8 text-xs"
                >
                  Redigera
                </Button>
              )}
            </div>

            {editMode ? (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-white">
                  <Checkbox
                    checked={needsOrdering}
                    onCheckedChange={setNeedsOrdering}
                  />
                  Kräver beställning
                </label>

                {needsOrdering && (
                  <>
                    <label className="flex items-center gap-2 text-sm text-white">
                      <Checkbox
                        checked={orderingCompleted}
                        onCheckedChange={setOrderingCompleted}
                      />
                      Beställning genomförd
                    </label>

                    <Textarea
                      value={orderingNotes}
                      onChange={(e) => setOrderingNotes(e.target.value)}
                      placeholder="Beställningsanteckningar..."
                      className="bg-white/5 border-white/10 text-white text-sm h-20"
                    />
                  </>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveOrderingInfo}
                    disabled={updateOrderMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    {updateOrderMutation.isPending ? "Sparar..." : "Spara"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      setNeedsOrdering(order.needs_ordering || false);
                      setOrderingCompleted(order.ordering_completed || false);
                      setOrderingNotes(order.ordering_notes || '');
                    }}
                    className="bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    Avbryt
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {order.needs_ordering ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span className="text-sm text-amber-400">Kräver beställning</span>
                      {order.ordering_completed && (
                        <CheckCircle2 className="w-4 h-4 text-green-400 ml-2" />
                      )}
                      {order.ordering_completed && (
                        <span className="text-sm text-green-400">Genomförd</span>
                      )}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white/40" />
                      <span className="text-sm text-white/40">Ingen beställning behövs</span>
                    </>
                  )}
                </div>
                {order.ordering_notes && (
                  <p className="text-sm text-white/60 pl-6 whitespace-pre-wrap">
                    {order.ordering_notes}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Package className="w-4 h-4" />
                Orderrader ({orderItems.length})
              </h3>
              <div className="text-sm text-white/50">
                {totalPicked} / {totalOrdered} st
              </div>
            </div>

            <div className="space-y-2">
              {orderItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white mb-1">
                        {item.article_name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                        {item.article_batch_number && (
                          <span className="font-mono">{item.article_batch_number}</span>
                        )}
                        {item.shelf_address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.shelf_address}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className={cn("text-xs", itemStatusColors[item.status])}>
                      {item.status === 'pending' && 'Väntar'}
                      {item.status === 'partial' && 'Delvis'}
                      {item.status === 'picked' && 'Plockad'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Plockad:</span>
                    <span className="font-semibold text-white">
                      {item.quantity_picked || 0} / {item.quantity_ordered} st
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {order.source_document_url && (
            <div className="bg-blue-500/10 rounded-2xl border border-blue-500/20 p-6">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Originaldokument
              </h3>
              <a
                href={order.source_document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 underline"
              >
                <FileText className="w-4 h-4" />
                Öppna originaldokument
              </a>
            </div>
          )}

          {/* Related Purchase Orders */}
          {relatedPOs.length > 0 && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" />
                Relaterade inköp ({relatedPOs.length})
              </h3>
              <div className="space-y-2">
                {relatedPOs.map(po => {
                  const statusColors = {
                    draft: 'bg-slate-500/20 text-slate-400',
                    sent: 'bg-blue-500/20 text-blue-400',
                    confirmed: 'bg-cyan-500/20 text-cyan-400',
                    in_production: 'bg-purple-500/20 text-purple-400',
                    shipped: 'bg-violet-500/20 text-violet-400',
                    received: 'bg-green-500/20 text-green-400',
                    cancelled: 'bg-red-500/20 text-red-400',
                  };
                  const statusLabels = {
                    draft: 'Utkast', sent: 'Skickad', confirmed: 'Bekräftad',
                    in_production: 'I produktion', shipped: 'I transit',
                    received: 'Mottagen', cancelled: 'Avbruten',
                  };
                  return (
                    <div key={po.id} className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{po.po_number || `PO #${po.id.slice(0,8)}`}</p>
                        <p className="text-xs text-white/50 truncate">{po.supplier_name}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {po.expected_delivery_date && (
                          <span className="text-xs text-white/40 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            ETA {format(new Date(po.expected_delivery_date), 'd MMM', { locale: sv })}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[po.status] || 'bg-slate-500/20 text-slate-400'}`}>
                          {statusLabels[po.status] || po.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tasks */}
          <OrderTasks orderId={order.id} />

          {order.critical_notes && (
            <div className="bg-yellow-500/10 rounded-2xl border border-yellow-500/30 p-6">
              <h3 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">⚠️ Viktigt för teamet</h3>
              <p className="text-sm text-yellow-100 whitespace-pre-wrap">{order.critical_notes}</p>
            </div>
          )}

          {order.notes && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <h3 className="text-sm font-semibold text-white mb-3">Anteckningar</h3>
              <p className="text-sm text-white/60 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}

          {/* Uploaded files */}
          {((order.uploaded_files?.length > 0) || order.source_document_url) && (
            <div className="bg-blue-500/10 rounded-2xl border border-blue-500/20 p-6">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Dokument
              </h3>
              <div className="space-y-2">
                {order.source_document_url && (
                  <a href={order.source_document_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-400 hover:underline">
                    <FileText className="w-4 h-4" /> Kundorder / PO
                  </a>
                )}
                {(order.uploaded_files || []).map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-400 hover:underline">
                    <Download className="w-4 h-4" /> {f.name || f.type || 'Dokument'}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Linked work orders */}
          {linkedWorkOrders.length > 0 && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                Kopplade arbetsordrar ({linkedWorkOrders.length})
              </h3>
              <div className="space-y-2">
                {linkedWorkOrders.map(wo => {
                  const woStatusColor = { väntande: 'bg-slate-500/20 text-slate-300', pågår: 'bg-blue-500/20 text-blue-300', klar: 'bg-green-500/20 text-green-300', avbruten: 'bg-red-500/20 text-red-300', pending: 'bg-slate-500/20 text-slate-300', in_progress: 'bg-blue-500/20 text-blue-300', completed: 'bg-green-500/20 text-green-300' };
                  const woStatusLabel = { väntande: 'Väntande', pågår: 'Pågår', klar: 'Klar', avbruten: 'Avbruten', pending: 'Väntande', in_progress: 'Pågår', completed: 'Klar', picking: 'Plockning' };
                  const stageLabel = { konstruktion: 'Konstruktion', produktion: 'Produktion', lager: 'Lager', montering: 'Montering', leverans: 'Leverans' };
                  return (
                    <div key={wo.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{wo.name || wo.order_number || wo.id}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={cn('text-xs', woStatusColor[wo.status] || 'bg-slate-500/20 text-slate-300')}>
                            {woStatusLabel[wo.status] || wo.status}
                          </Badge>
                          {wo.current_stage && <span className="text-xs text-white/40">{stageLabel[wo.current_stage] || wo.current_stage}</span>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/WorkOrders/${wo.id}`)}
                        className="text-blue-400 hover:text-blue-300 text-xs ml-3 flex-shrink-0">
                        Se arbetsorder →
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between flex-wrap gap-4 pb-6">
          <div className="text-xs text-white/40">
            Skapad {format(new Date(order.created_date), "d MMM yyyy HH:mm", { locale: sv })}
          </div>
          <div className="flex gap-2 flex-wrap">
             {!order.fortnox_project_number && (
               <Button
                 size="sm"
                 variant="outline"
                 className="bg-purple-600/20 border-purple-500/30 text-purple-400 hover:bg-purple-600/30"
                 onClick={() => {
                   if (window.confirm(`Vill du skapa ett Fortnox-projekt för order ${order.order_number}?`)) {
                     createFortnoxProjectMutation.mutate(order.id);
                   }
                 }}
                 disabled={createFortnoxProjectMutation.isPending}
               >
                 Skapa Fortnox Projekt
               </Button>
             )}
             <FortnoxSyncButton 
              order={order} 
              orderItems={orderItems}
              onSyncSuccess={() => queryClient.invalidateQueries({ queryKey: ['order', orderId] })}
            />
            {order.status === 'picked' && (
              <Button
                onClick={() => exportOrderMutation.mutate(order.id)}
                disabled={exportOrderMutation.isPending}
                className="bg-green-600 hover:bg-green-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Ladda ner PDF
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}