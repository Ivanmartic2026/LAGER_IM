import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileUp, Download, X, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

import WorkOrderHeader from "@/components/workorders/WorkOrderHeader";
import ProcessFlow from "@/components/workorders/ProcessFlow";
import StageContent from "@/components/workorders/StageContent";
import DocumentSection from "@/components/workorders/DocumentSection";
import ActivityFeed from "@/components/activity/ActivityFeed";
import { resolveStage } from "@/components/workorders/ProcessFlow";

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

  // Redirect if ID is invalid or work order not found
  useEffect(() => {
    if (!isLoading && (!workOrderId || !workOrder)) {
      navigate(createPageUrl('WorkOrders'));
    }
  }, [isLoading, workOrderId, workOrder, navigate]);
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

  // Initialize files
  useEffect(() => {
    if (!workOrder) return;
    const saved = workOrder.uploaded_files || [];
    const sourceDoc = order?.source_document_url
      ? [{ url: order.source_document_url, name: 'Original order document' }]
      : [];
    const sourceUrls = new Set(sourceDoc.map(f => f.url));
    const extra = saved.filter(f => !sourceUrls.has(f.url));
    setFiles([...sourceDoc, ...extra]);
  }, [workOrder?.uploaded_files, order?.source_document_url]);

  const updateWOMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkOrder.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['workOrder', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
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

  // Stage advance — maps each stage to what timestamps to save
  const STAGE_TIMESTAMPS = {
    produktion: { production_started_date: new Date().toISOString() },
    lager:      { picking_started_date: new Date().toISOString() },
    montering:  { picking_completed_date: new Date().toISOString() },
    leverans:   { production_completed_date: new Date().toISOString() },
    completed:  { production_completed_date: new Date().toISOString() },
  };

  const handleAdvanceStage = async (nextStage) => {
    const timestamps = STAGE_TIMESTAMPS[nextStage] || {};

    if (nextStage === 'completed') {
      await updateWOMutation.mutateAsync({
        id: workOrderId,
        data: { current_stage: 'leverans', status: 'klar', ...timestamps }
      });
      if (workOrder?.order_id) {
        await updateOrderMutation.mutateAsync({
          id: workOrder.order_id,
          data: { status: 'MONTERING' }
        });
      }
      try {
        await base44.functions.invoke('notifyWorkOrderCompleted', { work_order_id: workOrderId });
        toast.success('Arbetsorder slutförd! Email skickat.');
      } catch (e) {
        toast.success('Arbetsorder slutförd!');
      }
      navigate(createPageUrl('WorkOrders'));
      return;
    }

    await updateWOMutation.mutateAsync({
      id: workOrderId,
      data: { current_stage: nextStage, status: 'pågår', ...timestamps }
    });
    toast.success(`Steg framflyttat till ${nextStage}`);
  };

  const handleChecklistChange = async (field) => {
    const updatedChecklist = { ...(workOrder.checklist || {}), [field]: !workOrder.checklist?.[field] };
    await updateWOMutation.mutateAsync({ id: workOrderId, data: { checklist: updatedChecklist } });
  };

  const handleImageUpload = async (e) => {
    const imgs = Array.from(e.target.files || []);
    if (!imgs.length) return;
    setUploadingImages(true);
    try {
      const results = await Promise.all(imgs.map(f => base44.integrations.Core.UploadFile({ file: f })));
      const urls = results.map(r => r.file_url);
      await updateWOMutation.mutateAsync({
        id: workOrderId,
        data: { assembly_images: [...(workOrder.assembly_images || []), ...urls] }
      });
      toast.success(`${imgs.length} bild(er) uppladdad`);
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
      await updateWOMutation.mutateAsync({ id: workOrderId, data: { [`${type}_url`]: result.file_url } });
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
      await updateWOMutation.mutateAsync({ id: workOrderId, data: { uploaded_files: [...currentSaved, newFile] } });
      toast.success('Fil uppladdad');
    } catch (err) {
      toast.error('Fel vid uppladdning');
    }
  };

  const handleRemoveFile = async (index) => {
    const sourceCount = order?.source_document_url ? 1 : 0;
    const savedIndex = index - sourceCount;
    if (savedIndex < 0) return;
    const currentSaved = workOrder.uploaded_files || [];
    const updated = currentSaved.filter((_, i) => i !== savedIndex);
    await updateWOMutation.mutateAsync({ id: workOrderId, data: { uploaded_files: updated } });
  };

  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdrawFromStock = () => {
    if (!orderItems.length) { toast.error('Inga artiklar att ta ut'); return; }
    setWithdrawConfirmOpen(true);
  };

  const doWithdraw = async () => {
    setWithdrawing(true);
    try {
      await Promise.all(
        orderItems.filter(item => item.article_id).map(async (item) => {
          const article = articles.find(a => a.id === item.article_id);
          if (!article) return;
          const newQty = Math.max(0, (article.stock_qty || 0) - item.quantity_ordered);
          await base44.entities.Article.update(item.article_id, { stock_qty: newQty });
          await base44.entities.OrderItem.update(item.id, { status: 'picked', quantity_picked: item.quantity_ordered });
          await base44.entities.StockMovement.create({
            article_id: item.article_id,
            movement_type: 'outbound',
            quantity: -item.quantity_ordered,
            previous_qty: article.stock_qty || 0,
            new_qty: newQty,
            reason: `Uttag för arbetsorder ${workOrder.order_number || workOrderId.slice(0, 8)}`,
            reference: workOrder.order_number || workOrderId.slice(0, 8)
          });
        })
      );
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['orderItems', workOrder?.order_id] });
      toast.success('Artiklar uttagna från lagret');
    } catch (e) {
      toast.error('Fel vid lagerutdrag');
    } finally {
      setWithdrawing(false);
      setWithdrawConfirmOpen(false);
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
    <>
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">

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
                toast.error('Kunde inte skapa utskrift');
              }
            }}
          >
            <Printer className="w-4 h-4" />
            Print PDF
          </Button>
        </div>

        {/* Header */}
        <WorkOrderHeader
          workOrder={workOrder}
          order={order}
          onNameChange={(name) => handleSaveNotes('name', name)}
          onStatusChange={(status) => updateWOMutation.mutateAsync({ id: workOrderId, data: { status } })}
        />

        {/* Process Flow with initials + timestamps */}
        <ProcessFlow
          workOrder={workOrder}
          onStageClick={async (stageKey) => {
            await updateWOMutation.mutateAsync({ id: workOrderId, data: { current_stage: stageKey } });
            toast.success(`Steg ändrat till ${stageKey}`);
          }}
        />

        {/* Stage-specific content (Hero + stage actions) */}
        <div style={{ backgroundColor: '#111827' }} className="rounded-2xl">
        <StageContent
          workOrder={workOrder}
          order={order}
          orderItems={orderItems}
          articles={articles}
          onSaveNotes={handleSaveNotes}
          onWithdraw={handleWithdrawFromStock}
          onImageUpload={handleImageUpload}
          onChecklistChange={handleChecklistChange}
          onAdvanceStage={handleAdvanceStage}
          uploadingImages={uploadingImages}
        />
        </div>

        {/* Documentation */}
        <DocumentSection
          workOrder={workOrder}
          onUpload={handleUploadFile}
          onRemove={(field) => updateWOMutation.mutateAsync({ id: workOrderId, data: { [field]: null } })}
        />

        {/* Attachments */}
        <div className="bg-black rounded-2xl border border-white/10 p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FileUp className="w-4 h-4" />
            Bilagor
          </h3>
          {files.length > 0 && (
            <div className="space-y-2 mb-4">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                  <a href={file.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 flex-1 min-w-0">
                    <Download className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-sm">{file.name}</span>
                  </a>
                  <button onClick={() => handleRemoveFile(idx)}
                    className="text-white/40 hover:text-red-400 transition-colors flex-shrink-0 ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="block">
            <input type="file" onChange={handleAddFile} className="hidden" />
            <div className="p-4 rounded-lg border border-dashed border-white/20 hover:border-white/40 text-center cursor-pointer transition-colors">
              <p className="text-white/60 text-sm">Klicka för att ladda upp fil</p>
            </div>
          </label>
        </div>

        {/* Activity Feed */}
        <div className="bg-black rounded-2xl border border-white/10 p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Aktivitetslogg
          </h3>
          <ActivityFeed
            entityType="WorkOrderActivity"
            entityId={workOrderId}
            logFunctionName="logWorkOrderActivity"
            idField="work_order_id"
          />
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
          <Button onClick={doWithdraw} disabled={withdrawing} className="bg-red-600 hover:bg-red-500 text-white">
            {withdrawing ? 'Tar ut...' : 'Bekräfta uttag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}