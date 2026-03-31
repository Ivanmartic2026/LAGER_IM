import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, User, Clock, Truck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

import WorkOrderHeader from "@/components/workorders/WorkOrderHeader";
import ProcessFlow from "@/components/workorders/ProcessFlow";
import ProjectInfo from "@/components/workorders/ProjectInfo";
import MaterialStatus from "@/components/workorders/MaterialStatus";
import DocumentSection from "@/components/workorders/DocumentSection";
import ProductionChecklist from "@/components/workorders/ProductionChecklist";
import ArticlesList from "@/components/workorders/ArticlesList";
import NotesSection from "@/components/workorders/NotesSection";

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
    const updateData = {
      status: 'in_progress',
      production_started_date: new Date().toISOString(),
      assigned_to_production: user.email,
      assigned_to_production_name: user.full_name,
      production_status: 'started'
    };
    // Only update stage if not currently in picking
    if (workOrder.current_stage !== 'picking') {
      updateData.current_stage = 'production';
    }
    await updateWOMutation.mutateAsync({
      id: workOrderId,
      data: updateData
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

    // Notify + sync to Fortnox
    try {
      await base44.functions.invoke('notifyWorkOrderCompleted', { work_order_id: workOrderId });
      toast.success('Arbetsorder slutförd! Email skickat till info@imvision.se');
    } catch (e) {
      console.error('Notify failed:', e);
      toast.success('Arbetsorder slutförd!');
    }

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

  const handleUploadFile = async (type, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      await updateWOMutation.mutateAsync({
        id: workOrderId,
        data: { [`${type}_url`]: result.file_url }
      });
      toast.success('Fil uppladdad');
    } catch (err) {
      toast.error('Fel vid uppladdning');
    }
  };

  if (isLoading || !workOrder) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50">Laddar arbetsorder...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Back */}
        <Link to={createPageUrl('WorkOrders')}>
          <Button variant="ghost" className="text-white/60 hover:text-white -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Arbetsordrar
          </Button>
        </Link>

        {/* Header with Status */}
        <WorkOrderHeader 
          workOrder={workOrder}
          order={order}
          onNameChange={(name) => handleSaveNotes('name', name)}
        />

        {/* Process Flow */}
        <ProcessFlow currentStage={workOrder.current_stage} />

        {/* Project & Instructions */}
        <ProjectInfo 
          workOrder={workOrder}
          onSaveNotes={handleSaveNotes}
        />

        {/* Material Status */}
        <MaterialStatus materials={workOrder.materials_needed} />

        {/* Documentation */}
        <DocumentSection 
          workOrder={workOrder}
          onUpload={handleUploadFile}
          onRemove={(field) => updateWOMutation.mutateAsync({ id: workOrderId, data: { [field]: null } })}
        />

        {/* Production Checklist */}
        {workOrder.current_stage === 'production' || workOrder.production_started_date ? (
          <ProductionChecklist
            workOrder={workOrder}
            order={order}
            onChecklistChange={handleChecklistChange}
            onSaveNotes={handleSaveNotes}
            onImageUpload={handleImageUpload}
            onCompleteProduction={handleCompleteProduction}
            uploading={uploadingImages}
          />
        ) : null}

        {/* Articles List */}
        <ArticlesList items={orderItems} articles={articles} />

        {/* Notes */}
        <NotesSection 
          notes={workOrder.production_notes || ''}
          onSaveNotes={handleSaveNotes}
        />

      </div>
    </div>
  );
}