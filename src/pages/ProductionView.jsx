import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, Factory, Package, Upload, FileText,
  Phone, Mail, AlertCircle, CheckCircle2, Camera,
  Download, ExternalLink, User, Calendar, Save, Clock
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProductionDocumentation from "@/components/production/ProductionDocumentation";
import ProductionComments from "@/components/production/ProductionComments";

export default function ProductionViewPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  const [uploadingFile, setUploadingFile] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const orders = await base44.entities.Order.list();
      return orders.find(o => o.id === orderId);
    },
    enabled: !!orderId
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['orderItems', orderId],
    queryFn: () => base44.entities.OrderItem.filter({ order_id: orderId }),
    enabled: !!orderId
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: productionComments = [] } = useQuery({
    queryKey: ['productionComments', orderId],
    queryFn: () => base44.entities.ProductionComment?.filter({ order_id: orderId }) || [],
    enabled: !!orderId
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const currentUser = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: productionFiles = [] } = useQuery({
    queryKey: ['productionFiles', orderId],
    queryFn: () => base44.entities.ProductionFile.filter({ order_id: orderId }),
    enabled: !!orderId
  });

  const { data: productionRecord } = useQuery({
    queryKey: ['productionRecord', orderId],
    queryFn: async () => {
      const records = await base44.entities.ProductionRecord.filter({ order_id: orderId });
      return records[0] || null;
    },
    enabled: !!orderId
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Order uppdaterad');
    }
  });

  const createProductionRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionRecord', orderId] });
    }
  });

  const updateProductionRecordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductionRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionRecord', orderId] });
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionComment?.create(data) || Promise.resolve({}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionComments', orderId] });
      toast.success('Kommentar skickad');
    }
  });

  const handleStartProduction = async () => {
    const user = await base44.auth.me();
    
    await updateOrderMutation.mutateAsync({
      id: orderId,
      data: { 
        status: 'in_production',
        production_started_date: new Date().toISOString()
      }
    });

    await createProductionRecordMutation.mutateAsync({
      order_id: orderId,
      production_status: 'started',
      responsible_person: user.email,
      responsible_name: user.full_name,
      assembly_date: new Date().toISOString()
    });

    toast.success('Produktion startad');
  };

  const handleFileUpload = async (fileType, file) => {
    setUploadingFile(fileType);
    try {
      const user = await base44.auth.me();
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Get current version
      const existingFiles = productionFiles.filter(f => f.file_type === fileType);
      const versionNumber = existingFiles.length + 1;
      
      // Mark old files as not current
      for (const oldFile of existingFiles) {
        if (oldFile.is_current) {
          await base44.entities.ProductionFile.update(oldFile.id, { is_current: false });
        }
      }
      
      await base44.entities.ProductionFile.create({
        order_id: orderId,
        file_type: fileType,
        file_url,
        file_name: file.name,
        version: `v${versionNumber}`,
        version_number: versionNumber,
        uploaded_by: user.email,
        uploaded_by_name: user.full_name,
        upload_date: new Date().toISOString(),
        is_current: true
      });
      
      queryClient.invalidateQueries({ queryKey: ['productionFiles', orderId] });
      toast.success(`Fil uppladdad (v${versionNumber})`);
    } catch (error) {
      toast.error('Kunde inte ladda upp fil');
    } finally {
      setUploadingFile(null);
    }
  };

  const handleImageUpload = async (e, imageType) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);
      
      const currentImages = productionRecord?.[imageType] || [];
      const updatedImages = [...currentImages, ...newUrls];
      
      if (productionRecord) {
        await updateProductionRecordMutation.mutateAsync({
          id: productionRecord.id,
          data: { [imageType]: updatedImages }
        });
      }
      
      toast.success(`${files.length} bild(er) uppladdad(e)`);
    } catch (error) {
      toast.error('Kunde inte ladda upp bilder');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleImageDelete = async (imageType, index) => {
    if (!productionRecord) return;
    
    const currentImages = productionRecord?.[imageType] || [];
    const updatedImages = currentImages.filter((_, i) => i !== index);
    
    await updateProductionRecordMutation.mutateAsync({
      id: productionRecord.id,
      data: { [imageType]: updatedImages }
    });
    
    toast.success('Bild borttagen');
  };

  const handleUpdateField = (field, value) => {
    if (!productionRecord) return;
    
    updateProductionRecordMutation.mutate({
      id: productionRecord.id,
      data: { [field]: value }
    });
  };

  const handleAddComment = async (commentData) => {
    await addCommentMutation.mutateAsync({
      order_id: orderId,
      ...commentData
    });
  };

  const handleChecklistChange = async (field) => {
    if (!productionRecord) return;
    
    const updatedChecklist = {
      ...productionRecord.checklist,
      [field]: !productionRecord.checklist?.[field]
    };
    
    await updateProductionRecordMutation.mutateAsync({
      id: productionRecord.id,
      data: { checklist: updatedChecklist }
    });
  };

  const handleSaveProgress = () => {
    toast.success('Ändringar sparade automatiskt');
  };

  const handleCompleteProduction = async () => {
    const completedDate = new Date();
    const startDate = order.production_started_date ? new Date(order.production_started_date) : null;
    
    await updateOrderMutation.mutateAsync({
      id: orderId,
      data: { 
        status: 'production_completed',
        production_completed_date: completedDate.toISOString()
      }
    });

    if (productionRecord) {
      await updateProductionRecordMutation.mutateAsync({
        id: productionRecord.id,
        data: { 
          production_status: 'completed',
          completed_date: completedDate.toISOString()
        }
      });
    }

    // Calculate production time
    if (startDate) {
      const diffMs = completedDate - startDate;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      let timeMessage = 'Produktion klar!';
      if (diffDays > 0) {
        timeMessage += ` Tog ${diffDays} dag${diffDays > 1 ? 'ar' : ''} och ${diffHours} timme${diffHours !== 1 ? 'r' : ''}`;
      } else if (diffHours > 0) {
        timeMessage += ` Tog ${diffHours} timme${diffHours !== 1 ? 'r' : ''}`;
      } else {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        timeMessage += ` Tog ${diffMinutes} minut${diffMinutes !== 1 ? 'er' : ''}`;
      }
      
      toast.success(timeMessage, { duration: 5000 });
    } else {
      toast.success('Produktion markerad som klar');
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="text-white/50">Laddar...</div>
      </div>
    );
  }

  const fileTypes = [
    { key: 'drawing', label: 'Ritning', icon: FileText },
    { key: 'assembly_instruction', label: 'Montageinstruktion', icon: FileText },
    { key: 'special_instruction', label: 'Specialanvisningar', icon: AlertCircle },
    { key: 'customer_requirements', label: 'Kundkrav', icon: FileText },
    { key: 'technical_notes', label: 'Tekniska noteringar', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl('Production')}>
            <Button variant="ghost" className="text-white/70 hover:text-white mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
          </Link>

          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                {order.order_number || `Order #${order.id.slice(0, 8)}`}
              </h1>
              <div className="text-sm text-white/60">
                {order.customer_name}
              </div>
            </div>

            <div className="flex gap-2">
              {order.status === 'picked' && (
                <Button
                  onClick={handleStartProduction}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Factory className="w-4 h-4 mr-2" />
                  Starta produktion
                </Button>
              )}
              {order.status === 'in_production' && (
                <>
                  <Button
                    onClick={handleSaveProgress}
                    variant="outline"
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Spara
                  </Button>
                  {productionRecord?.checklist?.assembled && productionRecord?.checklist?.tested && (
                    <Button
                      onClick={handleCompleteProduction}
                      className="bg-green-600 hover:bg-green-500"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Slutför produktion
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {order.status === 'picked' && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Redo för produktion</span>
            </div>
            <p className="text-sm text-amber-400/70 mt-1">
              Klicka på "Starta produktion" för att börja monteringen
            </p>
          </div>
        )}

        {order.status !== 'picked' && (
          <>
            {/* Production Status & Info */}
            {productionRecord && order.status === 'in_production' && (
              <div className="mb-6 p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Factory className="w-5 h-5 text-blue-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-400">Under produktion</h3>
                    {order.production_started_date && (
                      <p className="text-sm text-blue-400/70 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Startad {format(new Date(order.production_started_date), "d MMMM yyyy 'kl' HH:mm", { locale: sv })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-blue-400/60 mb-1">Ansvarig montör</div>
                    <div className="text-blue-300 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {productionRecord.responsible_name || productionRecord.responsible_person}
                    </div>
                  </div>
                  {order.production_started_date && (
                    <div>
                      <div className="text-blue-400/60 mb-1">Tid i produktion</div>
                      <div className="text-blue-300 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {(() => {
                          const diffMs = new Date() - new Date(order.production_started_date);
                          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                          const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                          if (diffDays > 0) return `${diffDays} dag${diffDays > 1 ? 'ar' : ''} ${diffHours}h`;
                          if (diffHours > 0) return `${diffHours} timme${diffHours !== 1 ? 'r' : ''}`;
                          const diffMinutes = Math.floor(diffMs / (1000 * 60));
                          return `${diffMinutes} minut${diffMinutes !== 1 ? 'er' : ''}`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Completed Production Info */}
            {order.status === 'production_completed' && (
              <div className="mb-6 p-5 rounded-2xl bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-400">Produktion slutförd</h3>
                    {order.production_completed_date && (
                      <p className="text-sm text-green-400/70">
                        Slutförd {format(new Date(order.production_completed_date), "d MMMM yyyy 'kl' HH:mm", { locale: sv })}
                      </p>
                    )}
                  </div>
                </div>
                {order.production_started_date && order.production_completed_date && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="text-sm text-green-400/70 mb-1">Total produktionstid</div>
                    <div className="text-lg font-semibold text-green-300">
                      {(() => {
                        const diffMs = new Date(order.production_completed_date) - new Date(order.production_started_date);
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        if (diffDays > 0) return `${diffDays} dag${diffDays > 1 ? 'ar' : ''} och ${diffHours} timme${diffHours !== 1 ? 'r' : ''}`;
                        if (diffHours > 0) return `${diffHours} timme${diffHours !== 1 ? 'r' : ''}`;
                        const diffMinutes = Math.floor(diffMs / (1000 * 60));
                        return `${diffMinutes} minut${diffMinutes !== 1 ? 'er' : ''}`;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Projekt underlag */}
            <div className="mb-6 p-5 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Projektunderlag
              </h3>
              
              <div className="space-y-4">
                {fileTypes.map(({ key, label, icon: Icon }) => {
                  const files = productionFiles.filter(f => f.file_type === key).sort((a, b) => b.version_number - a.version_number);
                  const currentFile = files.find(f => f.is_current);
                  
                  return (
                    <div key={key} className="p-3 rounded-lg bg-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-white/70">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <input
                          type="file"
                          onChange={(e) => e.target.files[0] && handleFileUpload(key, e.target.files[0])}
                          className="hidden"
                          id={`file-${key}`}
                          disabled={uploadingFile === key}
                        />
                        <label
                          htmlFor={`file-${key}`}
                          className={cn(
                            "text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors flex items-center gap-1",
                            uploadingFile === key && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {uploadingFile === key ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Laddar upp...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3 h-3" />
                              Ladda upp
                            </>
                          )}
                        </label>
                      </div>
                      
                      {files.length > 0 && (
                        <div className="space-y-1">
                          {currentFile && (
                            <div className="flex items-center justify-between p-2 rounded bg-blue-500/10 border border-blue-500/30">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-blue-400 font-medium truncate">{currentFile.file_name}</div>
                                <div className="text-xs text-blue-400/60">
                                  {currentFile.version} • {format(new Date(currentFile.upload_date), "d MMM HH:mm", { locale: sv })} • {currentFile.uploaded_by_name}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <a
                                  href={currentFile.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-blue-400 hover:text-blue-300"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                                <a
                                  href={currentFile.file_url}
                                  download
                                  className="p-1 text-blue-400 hover:text-blue-300"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          )}
                          {files.length > 1 && (
                            <details className="text-xs text-white/50">
                              <summary className="cursor-pointer hover:text-white/70">
                                Äldre versioner ({files.length - 1})
                              </summary>
                              <div className="mt-2 space-y-1">
                                {files.filter(f => !f.is_current).map(file => (
                                  <div key={file.id} className="flex items-center justify-between p-2 rounded bg-white/5">
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate">{file.file_name}</div>
                                      <div className="text-xs text-white/40">
                                        {file.version} • {format(new Date(file.upload_date), "d MMM HH:mm", { locale: sv })}
                                      </div>
                                    </div>
                                    <a
                                      href={file.file_url}
                                      download
                                      className="p-1 text-white/40 hover:text-white"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Digital BOM */}
            <div className="mb-6 p-5 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Digital BOM (Bill of Materials)
              </h3>
              
              {orderItems.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  Inga artiklar i denna order
                </div>
              ) : (
                <div className="space-y-2">
                  {orderItems.map(item => {
                    const article = articles.find(a => a.id === item.article_id);
                    const supplier = suppliers.find(s => s.id === article?.supplier_id);
                    
                    return (
                      <div key={item.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-medium text-white mb-1">{item.article_name}</div>
                            <div className="text-sm text-white/50 space-y-0.5">
                              {article?.batch_number && <div>Batch: {article.batch_number}</div>}
                              <div>Antal: {item.quantity_ordered} st</div>
                            </div>
                          </div>
                          
                          {supplier && (
                            <div className="text-xs p-2 rounded bg-purple-500/10 border border-purple-500/30 min-w-[200px]">
                              <div className="font-medium text-purple-400 mb-1">{supplier.name}</div>
                              {supplier.contact_person && (
                                <div className="text-purple-400/70 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {supplier.contact_person}
                                </div>
                              )}
                              {supplier.phone && (
                                <div className="text-purple-400/70 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {supplier.phone}
                                </div>
                              )}
                              {supplier.email && (
                                <div className="text-purple-400/70 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {supplier.email}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Production Documentation */}
            {productionRecord && (
              <div className="mb-6 rounded-2xl overflow-hidden">
                <div className="p-5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-t-2xl">
                  <h3 className="font-bold text-xl text-white flex items-center gap-2">
                    📋 Produktionsdokumentation
                  </h3>
                </div>
                <div className="bg-white/5 border border-white/10 border-t-0 rounded-b-2xl p-6">
                  <ProductionDocumentation
                    productionRecord={productionRecord}
                    onChecklistChange={handleChecklistChange}
                    onUpdateField={handleUpdateField}
                    onImageUpload={handleImageUpload}
                    onImageDelete={handleImageDelete}
                    uploadingImages={uploadingImages}
                  />
                </div>
              </div>
            )}

            {/* Production Comments */}
            <div className="mb-6">
              <ProductionComments
                comments={productionComments}
                users={users}
                currentUser={currentUser.data}
                onAddComment={handleAddComment}
                isLoading={addCommentMutation.isPending}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}