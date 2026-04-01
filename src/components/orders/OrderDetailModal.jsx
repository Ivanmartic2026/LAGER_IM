import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  X, Package, MapPin, User, Calendar, FileText, 
  CheckCircle2, AlertCircle, ShoppingCart, Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import FortnoxSyncButton from "@/components/orders/FortnoxSyncButton";
import OrderTasks from "@/components/orders/OrderTasks";

export default function OrderDetailModal({ order, onClose, onSyncSuccess }) {
  const [editMode, setEditMode] = useState(false);
  const [needsOrdering, setNeedsOrdering] = useState(order.needs_ordering || false);
  const [orderingCompleted, setOrderingCompleted] = useState(order.ordering_completed || false);
  const [orderingNotes, setOrderingNotes] = useState(order.ordering_notes || '');

  const queryClient = useQueryClient();

  const { data: orderItems = [] } = useQuery({
    queryKey: ['orderItems', order.id],
    queryFn: () => base44.entities.OrderItem.filter({ order_id: order.id }),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
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
      queryClient.invalidateQueries({ queryKey: ['orders', order.id] });
      onSyncSuccess?.();
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

  const statusColors = {
    draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              {order.order_number || `Order #${order.id.slice(0, 8)}`}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                <User className="w-4 h-4" />
                <span>Kund</span>
              </div>
              <p className="text-white font-medium">{order.customer_name}</p>
            </div>

            {order.customer_reference && (
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                  <FileText className="w-4 h-4" />
                  <span>Referens</span>
                </div>
                <p className="text-white font-medium">{order.customer_reference}</p>
              </div>
            )}

            {order.delivery_date && (
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>Leveransdatum</span>
                </div>
                <p className="text-white font-medium">
                  {format(new Date(order.delivery_date), "d MMMM yyyy", { locale: sv })}
                </p>
              </div>
            )}

            {order.picked_by && (
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Plockad av</span>
                </div>
                <p className="text-white font-medium">{order.picked_by}</p>
                {order.picked_date && (
                  <p className="text-xs text-slate-500">
                    {format(new Date(order.picked_date), "d MMM yyyy HH:mm", { locale: sv })}
                  </p>
                )}
              </div>
            )}

            {order.fortnox_invoiced && order.fortnox_invoice_number && (
              <div className="col-span-2">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                  <FileText className="w-4 h-4" />
                  <span>Fakturerad i Fortnox</span>
                </div>
                <p className="text-white font-medium font-mono">{order.fortnox_invoice_number}</p>
                {order.invoiced_date && (
                  <p className="text-xs text-slate-500">
                    {format(new Date(order.invoiced_date), "d MMM yyyy HH:mm", { locale: sv })}
                  </p>
                )}
                {order.invoiced_by && (
                  <p className="text-xs text-slate-500">
                    Fakturerad av: {order.invoiced_by}
                  </p>
                )}
              </div>
            )}

            {order.created_by && (
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                  <User className="w-4 h-4" />
                  <span>Skapad av</span>
                </div>
                <p className="text-white font-medium">{order.created_by}</p>
                {order.created_date && (
                  <p className="text-xs text-slate-500">
                    {format(new Date(order.created_date), "d MMM yyyy HH:mm", { locale: sv })}
                  </p>
                )}
              </div>
            )}
          </div>

          {order.delivery_address && (
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <MapPin className="w-4 h-4" />
                <span>Leveransadress</span>
              </div>
              <p className="text-white whitespace-pre-wrap">{order.delivery_address}</p>
            </div>
          )}

          {/* Ordering Status */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Beställningsstatus
              </h3>
              {!editMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditMode(true)}
                  className="bg-slate-700 border-slate-600 hover:bg-slate-600 h-7 text-xs"
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
                      className="bg-slate-900 border-slate-700 text-white text-sm h-20"
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
                    className="bg-slate-700 border-slate-600 hover:bg-slate-600"
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
                      <CheckCircle2 className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-400">Ingen beställning behövs</span>
                    </>
                  )}
                </div>
                {order.ordering_notes && (
                  <p className="text-sm text-slate-300 pl-6 whitespace-pre-wrap">
                    {order.ordering_notes}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Order Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Package className="w-4 h-4" />
                Orderrader ({orderItems.length})
              </h3>
              <div className="text-sm text-slate-400">
                {totalPicked} / {totalOrdered} st
              </div>
            </div>

            <div className="space-y-2">
              {orderItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white mb-1">
                        {item.article_name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
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
                    <span className="text-slate-400">Plockad:</span>
                    <span className="font-semibold text-white">
                      {item.quantity_picked || 0} / {item.quantity_ordered} st
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {order.source_document_url && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Originaldokument
              </h3>
              <a
                href={order.source_document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 underline p-3 rounded-lg bg-blue-500/10 border border-blue-500/20"
              >
                <FileText className="w-4 h-4" />
                Öppna originaldokument
              </a>
            </div>
          )}

          {/* Tasks */}
          <OrderTasks orderId={order.id} />

          {order.notes && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Anteckningar</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                {order.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-900/50">
          <div className="text-xs text-slate-500">
            Skapad {format(new Date(order.created_date), "d MMM yyyy HH:mm", { locale: sv })}
          </div>
          <div className="flex gap-2">
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
              onSyncSuccess={onSyncSuccess || (() => {})}
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
            <Button
              onClick={onClose}
              variant="outline"
              className="bg-slate-800 border-slate-600 hover:bg-slate-700"
            >
              Stäng
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}