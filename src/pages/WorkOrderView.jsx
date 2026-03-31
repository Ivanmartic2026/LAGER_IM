import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, Package, Factory, Truck, CheckCircle2,
  Play, User, Clock, AlertCircle, Camera, Upload,
  ChevronRight, ClipboardList
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const STAGES = [
  { key: 'picking', label: 'Plockning', icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  { key: 'production', label: 'Produktion', icon: Factory, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  { key: 'delivery', label: 'Leverans', icon: Truck, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  { key: 'completed', label: 'Klar', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' }
];

export default function WorkOrderViewPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const workOrderId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadingImages, setUploadingImages] = useState(false);

  const { data: workOrder, isLoading } = useQuery({
    queryKey: ['workOrder', workOrderId],
    queryFn: async () => {
      const list = await base44.entities.WorkOrder.filter({ id: workOrderId });
      return list[0] || null;
    },
    enabled: !!workOrderId
  });

  const { data: order } = useQuery({
    queryKey: ['order', workOrder?.order_id],
    queryFn: async () => {
      const list = await base44.entities.Order.filter({ id: workOrder.order_id });
      return list[0];
    },
    enabled: !!workOrder?.order_id
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['orderItems', workOrder?.order_id],
    queryFn: () => base44.entities.OrderItem.filter({ order_id: workOrder.order_id }),
    enabled: !!workOrder?.order_id
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list()
  });

  const updateWOMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrder', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', workOrder?.order_id] });
    }
  });

  const handleStartPicking = async () => {
    const user = await base44.auth.me();
    await updateWOMutation.mutateAsync({
      id: workOrderId,
      data: {
        status: 'in_progress',
        picking_started_date: new Date().toISOString(),
        assigned_to_picking: user.email,
        assigned_to_picking_name: user.full_name
      }
    });
    await updateOrderMutation.mutateAsync({
      id: workOrder.order_id,
      data: { status: 'picking' }
    });
    // Navigate to the actual pick order page
    navigate(createPageUrl(`PickOrder?orderId=${workOrder.order_id}`));
  };

  const handlePickingDone = async () => {
    await updateWOMutation.mutateAsync({
      id: workOrderId,
      data: {
        current_stage: 'production',
        picking_completed_date: new Date().toISOString()
      }
    });
    toast.success('Plockning klar — vidare till produktion');
  };

  const handleStartProduction = async () => {
    const user = await base44.auth.me();
    await updateWOMutation.mutateAsync({
      id: workOrderId,
      data: {
        status: 'in_progress',
        current_stage: 'production',
        production_started_date: new Date().toISOString(),
        assigned_to_production: user.email,
        assigned_to_production_name: user.full_name,
        production_status: 'started'
      }
    });
    await updateOrderMutation.mutateAsync({
      id: workOrder.order_id,
      data: {
        status: 'in_production',
        production_started_date: new Date().toISOString(),
        production_started_by: user.email
      }
    });
    toast.success('Produktion startad');
  };

  const handleChecklistChange = async (field) => {
    const updatedChecklist = {
      ...(workOrder.checklist || {}),
      [field]: !workOrder.checklist?.[field]
    };
    await updateWOMutation.mutateAsync({
      id: workOrderId,
      data: { checklist: updatedChecklist }
    });
  };

  const handleCompleteProduction = async () => {
    await updateWOMutation.mutateAsync({
      id: workOrderId,
      data: {
        current_stage: 'delivery',
        production_completed_date: new Date().toISOString(),
        production_status: 'completed'
      }
    });
    await updateOrderMutation.mutateAsync({
      id: workOrder.order_id,
      data: {
        status: 'production_completed',
        production_completed_date: new Date().toISOString()
      }
    });
    toast.success('Produktion klar!');
  };

  const handleCompleteDelivery = async () => {
    await updateWOMutation.mutateAsync({
      id: workOrderId,
      data: {
        current_stage: 'completed',
        status: 'completed'
      }
    });
    await updateOrderMutation.mutateAsync({
      id: workOrder.order_id,
      data: { status: 'delivered' }
    });
    toast.success('Arbetsorder slutförd!');
    navigate(createPageUrl('WorkOrders'));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImages(true);
    try {
      const results = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f })));
      const urls = results.map(r => r.file_url);
      await updateWOMutation.mutateAsync({
        id: workOrderId,
        data: { assembly_images: [...(workOrder.assembly_images || []), ...urls] }
      });
      toast.success(`${files.length} bild(er) uppladdad`);
    } catch (e) {
      toast.error('Fel vid uppladdning');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSaveNotes = async (field, value) => {
    await updateWOMutation.mutateAsync({ id: workOrderId, data: { [field]: value } });
    toast.success('Sparat');
  };

  if (isLoading || !workOrder) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50">Laddar arbetsorder...</div>
      </div>
    );
  }

  const currentStageIdx = STAGES.findIndex(s => s.key === workOrder.current_stage);
  const currentStage = STAGES[currentStageIdx] || STAGES[0];
  const checklist = workOrder.checklist || {};
  const allChecked = checklist.assembled && checklist.tested && checklist.ready_for_delivery;

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-3xl mx-auto">

        {/* Back */}
        <Link to={createPageUrl('WorkOrders')}>
          <Button variant="ghost" className="text-white/60 hover:text-white mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Arbetsordrar
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-6 p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">
                {workOrder.order_number || `AO-${workOrder.id.slice(0, 6)}`}
              </h1>
              <p className="text-white/60 text-sm">{workOrder.customer_name}</p>
              {workOrder.delivery_date && (
                <p className={cn("text-sm mt-1", new Date(workOrder.delivery_date) < new Date() && workOrder.status !== 'completed' ? 'text-red-400' : 'text-white/50')}>
                  Leverans: {format(new Date(workOrder.delivery_date), 'd MMMM yyyy', { locale: sv })}
                </p>
              )}
            </div>
            <Badge className={cn("px-3 py-1 border", currentStage.bg, currentStage.border, currentStage.color)}>
              <currentStage.icon className="w-3.5 h-3.5 mr-1.5" />
              {currentStage.label}
            </Badge>
          </div>
        </div>

        {/* Stage Progress */}
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            {STAGES.map((stage, idx) => {
              const isDone = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;
              const Icon = stage.icon;
              return (
                <React.Fragment key={stage.key}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center border transition-all",
                      isDone ? 'bg-green-500/20 border-green-500/30' :
                      isCurrent ? `${stage.bg} ${stage.border}` :
                      'bg-white/5 border-white/10'
                    )}>
                      {isDone
                        ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                        : <Icon className={cn("w-4 h-4", isCurrent ? stage.color : 'text-white/30')} />
                      }
                    </div>
                    <span className={cn("text-xs", isCurrent ? 'text-white' : isDone ? 'text-green-400/70' : 'text-white/30')}>
                      {stage.label}
                    </span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <div className={cn("flex-1 h-0.5 mx-2 rounded", idx < currentStageIdx ? 'bg-green-500/40' : 'bg-white/10')} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* STAGE: PICKING */}
        {workOrder.current_stage === 'picking' && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <h2 className="font-bold text-amber-400 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Plockning
            </h2>
            {workOrder.status === 'pending' ? (
              <>
                <p className="text-white/60 text-sm mb-4">Starta plockning för att börja plocka artiklarna.</p>
                <Button onClick={handleStartPicking} className="bg-amber-600 hover:bg-amber-500 text-white">
                  <Play className="w-4 h-4 mr-2" />
                  Starta plockning
                </Button>
              </>
            ) : (
              <>
                <div className="text-sm text-amber-400/70 mb-3">
                  {workOrder.assigned_to_picking_name && (
                    <span className="flex items-center gap-1 mb-1">
                      <User className="w-3.5 h-3.5" />
                      {workOrder.assigned_to_picking_name}
                    </span>
                  )}
                  {workOrder.picking_started_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Startad {format(new Date(workOrder.picking_started_date), "d MMM 'kl' HH:mm", { locale: sv })}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => navigate(createPageUrl(`PickOrder?orderId=${workOrder.order_id}`))}
                    className="bg-amber-600 hover:bg-amber-500 text-white"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Öppna plocklista
                  </Button>
                  {order?.status === 'picked' && (
                    <Button onClick={handlePickingDone} variant="outline" className="border-green-500/40 text-green-400 hover:bg-green-500/10">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Plockning klar → Produktion
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* STAGE: PRODUCTION */}
        {workOrder.current_stage === 'production' && (
          <div className="mb-6 space-y-4">
            <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
              <h2 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
                <Factory className="w-5 h-5" />
                Produktion
              </h2>
              {!workOrder.production_started_date ? (
                <>
                  <p className="text-white/60 text-sm mb-4">Starta produktion när du är redo att börja montera.</p>
                  <Button onClick={handleStartProduction} className="bg-blue-600 hover:bg-blue-500 text-white">
                    <Play className="w-4 h-4 mr-2" />
                    Starta produktion
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-sm text-blue-400/70 mb-4">
                    {workOrder.assigned_to_production_name && (
                      <span className="flex items-center gap-1 mb-1">
                        <User className="w-3.5 h-3.5" />
                        {workOrder.assigned_to_production_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Startad {format(new Date(workOrder.production_started_date), "d MMM 'kl' HH:mm", { locale: sv })}
                    </span>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2 mb-4">
                    {[
                      { key: 'assembled', label: 'Monterat' },
                      { key: 'tested', label: 'Testat' },
                      { key: 'ready_for_delivery', label: 'Redo för leverans' }
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10">
                        <Checkbox
                          checked={!!checklist[key]}
                          onCheckedChange={() => handleChecklistChange(key)}
                        />
                        <span className={cn("text-sm font-medium", checklist[key] ? 'text-white' : 'text-white/60')}>
                          {label}
                        </span>
                        {checklist[key] && <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />}
                      </label>
                    ))}
                  </div>

                  {/* Avvikelser */}
                  <div className="mb-4">
                    <label className="text-xs text-white/50 mb-1 block">Avvikelser / noteringar</label>
                    <Textarea
                      defaultValue={workOrder.deviations || ''}
                      onBlur={e => e.target.value !== (workOrder.deviations || '') && handleSaveNotes('deviations', e.target.value)}
                      placeholder="Noterade avvikelser..."
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
                      rows={2}
                    />
                  </div>

                  {/* Bilder */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/50">Monteringsbilder</span>
                      <label className={cn("text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors flex items-center gap-1", uploadingImages && "opacity-50")}>
                        {uploadingImages ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Laddar...</> : <><Camera className="w-3 h-3" />Lägg till bild</>}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploadingImages} />
                      </label>
                    </div>
                    {workOrder.assembly_images?.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {workOrder.assembly_images.map((url, i) => (
                          <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                        ))}
                      </div>
                    )}
                  </div>

                  {allChecked && (
                    <Button onClick={handleCompleteProduction} className="bg-green-600 hover:bg-green-500 text-white">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Slutför produktion → Leverans
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* STAGE: DELIVERY */}
        {workOrder.current_stage === 'delivery' && (
          <div className="mb-6 p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30">
            <h2 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Leverans
            </h2>
            <p className="text-white/60 text-sm mb-4">Produktion är klar. Ordern är redo att levereras till kund.</p>
            <Button onClick={handleCompleteDelivery} className="bg-purple-600 hover:bg-purple-500 text-white">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Markera som levererad
            </Button>
          </div>
        )}

        {/* STAGE: COMPLETED */}
        {workOrder.current_stage === 'completed' && (
          <div className="mb-6 p-5 rounded-2xl bg-green-500/10 border border-green-500/30 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h2 className="font-bold text-green-400 text-lg">Arbetsorder slutförd!</h2>
            <p className="text-white/50 text-sm mt-1">Alla steg är klara för denna order.</p>
          </div>
        )}

        {/* Article List (BOM) */}
        {orderItems.length > 0 && (
          <div className="mb-6 p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-white/60" />
              Artiklar ({orderItems.length})
            </h3>
            <div className="space-y-2">
              {orderItems.map(item => {
                const article = articles.find(a => a.id === item.article_id);
                return (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-sm">
                    <div>
                      <span className="text-white font-medium">{item.article_name}</span>
                      {article?.shelf_address?.[0] && (
                        <span className="text-white/40 ml-2 text-xs">{article.shelf_address[0]}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60">{item.quantity_ordered} st</span>
                      {item.status === 'picked' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="font-semibold text-white mb-3 text-sm">Anteckningar</h3>
          <Textarea
            defaultValue={workOrder.production_notes || ''}
            onBlur={e => e.target.value !== (workOrder.production_notes || '') && handleSaveNotes('production_notes', e.target.value)}
            placeholder="Lägg till anteckningar..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
            rows={3}
          />
        </div>

      </div>
    </div>
  );
}