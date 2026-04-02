import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, User, Clock, Truck, CheckCircle2, Printer, FileUp, Download, X, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import DesignerSection from "@/components/workorders/DesignerSection";
import ActivityFeed from "@/components/activity/ActivityFeed";

export default function WorkOrderViewPage() {
  const { workOrderId: workOrderIdParam } = useParams();
  const urlSearchParams = new URLSearchParams(window.location.search);
  const workOrderId = workOrderIdParam || urlSearchParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadingImages, setUploadingImages] = useState(false);
  const [files, setFiles] = useState([]);

  const { data: workOrder, isLoading } = useQuery({
    queryKey: ['workOrder', workOrderId],
    queryFn: async () => {
      const list = await base44.entities.WorkOrder.filter({ id: workOrderId });
      return list[0] || null;
    },
    enabled: !!workOrderId
  });

  // Real-time listener for WorkOrder changes
  useEffect(() => {
    if (!workOrderId) return;
    
    const unsubscribe = base44.entities.WorkOrder.subscribe((event) => {
      if (event.id === workOrderId) {
        queryClient.setQueryData(['workOrder', workOrderId], event.data);
      }
    });

    return unsubscribe;
  }, [workOrderId, queryClient]);

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

  // Initialize files from workOrder's saved files + order's source document
  useEffect(() => {
    if (!workOrder) return;
    const saved = workOrder.uploaded_files || [];
    const sourceDoc = order?.source_document_url 
      ? [{ url: order.source_document_url, name: 'Original order document' }] 
      : [];
    // Merge: source doc first, then saved files (avoid duplicates by url)
    const sourceUrls = new Set(sourceDoc.map(f => f.url));
    const extra = saved.filter(f => !sourceUrls.has(f.url));
    setFiles([...sourceDoc, ...extra]);
  }, [workOrder?.uploaded_files, order?.source_document_url]);

  const updateWOMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkOrder.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['workOrder', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      
      // Log activity
      try {
        await base44.functions.invoke('logWorkOrderActivity', {
          work_order_id: workOrderId,
          type: 'field_change',
          message: 'Arbetsorder uppdaterad',
        });
      } catch (e) {
        console.error('Activity log failed:', e);
      }
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

  const handleAddFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const newFile = { url: result.file_url, name: file.name };
      const currentSaved = workOrder.uploaded_files || [];
      await updateWOMutation.mutateAsync({
        id: workOrderId,
        data: { uploaded_files: [...currentSaved, newFile] }
      });
      toast.success('Fil uppladdad');
    } catch (err) {
      toast.error('Fel vid uppladdning');
    }
  };

  const handleRemoveFile = async (index) => {
    // Only remove from the saved list (skip the source_document at index 0 if present)
    const sourceCount = order?.source_document_url ? 1 : 0;
    const savedIndex = index - sourceCount;
    if (savedIndex < 0) return; // Can't remove source doc
    const currentSaved = workOrder.uploaded_files || [];
    const updated = currentSaved.filter((_, i) => i !== savedIndex);
    await updateWOMutation.mutateAsync({
      id: workOrderId,
      data: { uploaded_files: updated }
    });
  };

  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdrawFromStock = () => {
    if (!orderItems.length) {
      toast.error('Inga artiklar att ta ut');
      return;
    }
    setWithdrawConfirmOpen(true);
  };

  const doWithdraw = async () => {
    setWithdrawing(true);
    try {
      const updates = orderItems
        .filter(item => item.article_id)
        .map(async (item) => {
          const article = articles.find(a => a.id === item.article_id);
          if (!article) return;
          const newQty = Math.max(0, (article.stock_qty || 0) - item.quantity_ordered);
          await base44.entities.Article.update(item.article_id, { stock_qty: newQty });
          await base44.entities.StockMovement.create({
            article_id: item.article_id,
            movement_type: 'outbound',
            quantity: -item.quantity_ordered,
            previous_qty: article.stock_qty || 0,
            new_qty: newQty,
            reason: `Uttag för arbetsorder ${workOrder.order_number || workOrderId.slice(0,8)}`,
            reference: workOrder.order_number || workOrderId.slice(0,8)
          });
        });

      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Artiklar uttagna från lagret');
    } catch (e) {
      console.error(e);
      toast.error('Fel vid lagerutdrag');
    } finally {
      setWithdrawing(false);
      setWithdrawConfirmOpen(false);
    }
  };

  if (isLoading || !workOrder) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50">Loading work order...</div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4 bg-black">

        {/* Back + Print */}
        <div className="flex items-center justify-between">
          <Link to={createPageUrl('WorkOrders')}>
            <Button variant="ghost" className="text-white/60 hover:text-white -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Work Orders
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/5 border-white/20 hover:bg-white/10 text-white gap-2"
            onClick={async () => {
              try {
                const res = await base44.functions.invoke('printWorkOrder', { work_order_id: workOrderId });
                const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                const tab = window.open('', '_blank');
                tab.document.write(html);
                tab.document.close();
              } catch (e) {
                toast.error('Could not create print');
              }
            }}
          >
            <Printer className="w-4 h-4" />
            Print PDF
          </Button>
        </div>

        {/* Header with Status */}
         <WorkOrderHeader 
           workOrder={workOrder}
           order={order}
           onNameChange={(name) => handleSaveNotes('name', name)}
           onStatusChange={(status) => updateWOMutation.mutateAsync({
             id: workOrderId,
             data: { status }
           })}
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
        <ArticlesList items={orderItems} articles={articles} onWithdraw={handleWithdrawFromStock} />

        {/* Notes */}
        <NotesSection 
          notes={workOrder.production_notes || ''}
          onSaveNotes={handleSaveNotes}
        />

        {/* Designer Section */}
        <DesignerSection workOrderId={workOrderId} />

        {/* Activity Feed */}
        <div className="bg-black rounded-2xl border border-white/10 p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Activity Log
          </h3>
          <ActivityFeed
            entityType="WorkOrderActivity"
            entityId={workOrderId}
            logFunctionName="logWorkOrderActivity"
            idField="work_order_id"
          />
        </div>

        {/* File Management */}
        <div className="bg-black rounded-2xl border border-white/10 p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FileUp className="w-4 h-4" />
            Attachments
          </h3>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2 mb-4">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 flex-1 min-w-0"
                  >
                    <Download className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-sm">{file.name}</span>
                  </a>
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    className="text-white/40 hover:text-red-400 transition-colors flex-shrink-0 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <label className="block">
            <input
              type="file"
              onChange={handleAddFile}
              className="hidden"
            />
            <div className="p-4 rounded-lg border border-dashed border-white/20 hover:border-white/40 text-center cursor-pointer transition-colors">
              <p className="text-white/60 text-sm">Click to upload a file</p>
            </div>
          </label>
        </div>

      </div>
    </div>

    {/* Withdraw Confirm Dialog */}
    <Dialog open={withdrawConfirmOpen} onOpenChange={setWithdrawConfirmOpen}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            Ta ut från Lagret
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-slate-300 mb-3">Följande artiklar kommer att tas ut från lagret:</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {orderItems.map(item => (
              <div key={item.id} className="flex justify-between text-sm py-1 border-b border-slate-700/50">
                <span className="text-white">{item.article_name}</span>
                <span className="text-slate-400">{item.quantity_ordered} st</span>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setWithdrawConfirmOpen(false)} className="text-slate-400 hover:text-white">
            Avbryt
          </Button>
          <Button
            onClick={doWithdraw}
            disabled={withdrawing}
            className="bg-red-600 hover:bg-red-500 text-white"
          >
            {withdrawing ? 'Tar ut...' : 'Bekräfta uttag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}