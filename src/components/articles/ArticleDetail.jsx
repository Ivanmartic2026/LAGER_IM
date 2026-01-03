import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Package, MapPin, Calendar, Hash, Factory, Ruler, 
  Scale, Grid3X3, ArrowLeft, Edit, Trash2, Plus, Minus, Printer, Wrench, CheckCircle2, History,
  DollarSign, Warehouse, Tag, Check, X, ShoppingCart, Copy
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LabelDownloader from "../labels/LabelDownloader";
import RepairModal from "./RepairModal";
import ReturnFromRepairModal from "./ReturnFromRepairModal";
import ImageGallery from "./ImageGallery";
import ProductAssemblyManager from "./ProductAssemblyManager";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

export default function ArticleDetail({ 
  article, 
  onBack, 
  onEdit, 
  onDelete,
  onAdjustStock 
}) {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [returnFromRepairModalOpen, setReturnFromRepairModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const queryClient = useQueryClient();

  // Fetch stock movements for this article
  const { data: movements = [] } = useQuery({
    queryKey: ['article-movements', article.id],
    queryFn: async () => {
      const allMovements = await base44.entities.StockMovement.list('-created_date', 100);
      return allMovements.filter(m => m.article_id === article.id);
    },
  });

  const { data: allArticles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-updated_date'),
  });

  const articlesOnRepair = allArticles.filter(a => a.status === 'on_repair');

  const { data: orderItems = [] } = useQuery({
    queryKey: ['orderItems', article.id],
    queryFn: async () => {
      const allItems = await base44.entities.OrderItem.list('-created_date', 100);
      return allItems.filter(item => item.article_id === article.id);
    },
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100),
    enabled: orderItems.length > 0,
  });

  const articleOrders = allOrders
    .filter(order => orderItems.some(item => item.order_id === order.id))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  
  const updateArticleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Article.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    }
  });

  const createMovementMutation = useMutation({
    mutationFn: (data) => base44.entities.StockMovement.create(data),
  });

  const createArticleMutation = useMutation({
    mutationFn: (data) => base44.entities.Article.create(data),
    onSuccess: (newArticle) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success("Artikel kopierad!");
      // Navigate to edit form for the new article
      window.location.href = `${createPageUrl("Inventory")}?articleId=${newArticle.id}&edit=true`;
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingFiles(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);
      
      const updatedUrls = [...(article.image_urls || []), ...newUrls];
      
      await updateArticleMutation.mutateAsync({
        id: article.id,
        data: { image_urls: updatedUrls }
      });
      
      toast.success(`${files.length} fil${files.length > 1 ? 'er' : ''} uppladdad${files.length > 1 ? 'e' : ''}`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Kunde inte ladda upp filer');
    } finally {
      setUploadingFiles(false);
    }
  };
  
  const getStatusConfig = (status) => {
    switch (status) {
      case "low_stock":
        return { label: "Lågt lager", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
      case "out_of_stock":
        return { label: "Slut i lager", color: "bg-red-500/20 text-red-400 border-red-500/30" };
      case "discontinued":
        return { label: "Utgått", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" };
      case "on_repair":
        return { label: "På reparation", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" };
      default:
        return { label: "I lager", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    }
  };

  const handleSendToRepair = async (repairNotes, quantity) => {
    try {
      const newQty = (article.stock_qty || 0) - quantity;
      
      await updateArticleMutation.mutateAsync({
        id: article.id,
        data: {
          status: "on_repair",
          repair_notes: `${quantity} st - ${repairNotes}`,
          repair_date: new Date().toISOString().split('T')[0],
          stock_qty: newQty
        }
      });

      await createMovementMutation.mutateAsync({
        article_id: article.id,
        movement_type: "adjustment",
        quantity: -quantity,
        previous_qty: article.stock_qty,
        new_qty: newQty,
        reason: `Skickad på reparation (${quantity} st): ${repairNotes}`
      });

      toast.success(`${quantity} st skickad på reparation`);
      setRepairModalOpen(false);
    } catch (error) {
      toast.error("Kunde inte uppdatera artikel");
    }
  };

  const handleQuickReturnToStock = async () => {
    try {
      const currentQty = article.stock_qty || 0;
      
      await updateArticleMutation.mutateAsync({
        id: article.id,
        data: {
          status: currentQty <= 0 ? "out_of_stock" : 
                 currentQty <= (article.min_stock_level || 5) ? "low_stock" : "active",
          repair_notes: null,
          repair_date: null
        }
      });

      await createMovementMutation.mutateAsync({
        article_id: article.id,
        movement_type: "adjustment",
        quantity: 0,
        previous_qty: currentQty,
        new_qty: currentQty,
        reason: "Återställd från reparation till lager"
      });

      toast.success("Artikel återförd till lager");
    } catch (error) {
      toast.error("Kunde inte uppdatera artikel");
    }
  };

  const handleCopyArticle = async () => {
    try {
      const copiedData = {
        ...article,
        name: `${article.name} (Kopia)`,
        batch_number: null,
        sku: null,
        stock_qty: 0,
        status: 'active',
        repair_notes: null,
        repair_date: null,
      };
      
      // Remove fields that shouldn't be copied
      delete copiedData.id;
      delete copiedData.created_date;
      delete copiedData.updated_date;
      delete copiedData.created_by;
      
      await createArticleMutation.mutateAsync(copiedData);
    } catch (error) {
      toast.error("Kunde inte kopiera artikel");
    }
  };

  const handleReturnFromRepair = async (returnedQuantity, discardedQuantity, returnNotes) => {
    try {
      const previousQty = article.stock_qty || 0;
      const newQty = previousQty + returnedQuantity;
      
      await updateArticleMutation.mutateAsync({
        id: article.id,
        data: {
          status: newQty <= 0 ? "out_of_stock" : 
                 newQty <= (article.min_stock_level || 5) ? "low_stock" : "active",
          repair_notes: null,
          repair_date: null,
          stock_qty: newQty
        }
      });

      // Create movement for returned items
      if (returnedQuantity > 0) {
        await createMovementMutation.mutateAsync({
          article_id: article.id,
          movement_type: "inbound",
          quantity: returnedQuantity,
          previous_qty: previousQty,
          new_qty: newQty,
          reason: `Återkommen från reparation${returnNotes ? ': ' + returnNotes : ''}`
        });
      }

      // Create movement for discarded items
      if (discardedQuantity > 0) {
        await createMovementMutation.mutateAsync({
          article_id: article.id,
          movement_type: "adjustment",
          quantity: -discardedQuantity,
          previous_qty: newQty,
          new_qty: newQty,
          reason: `Kasserad efter reparation (${discardedQuantity} st)${returnNotes ? ': ' + returnNotes : ''}`
        });
      }

      toast.success(`${returnedQuantity} st återförda till lager${discardedQuantity > 0 ? `, ${discardedQuantity} st kasserade` : ''}`);
      setReturnFromRepairModalOpen(false);
    } catch (error) {
      toast.error("Kunde inte uppdatera artikel");
    }
  };

  const statusConfig = getStatusConfig(article.status);

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div className="flex items-center gap-3 text-slate-400">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-medium text-white">{value || "—"}</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header - Mobile Optimized */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-slate-400 hover:text-white hover:bg-slate-800 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Tillbaka</span>
        </Button>
        
        {/* Mobile: Compact action menu */}
        <div className="flex gap-2">
          {article.status === "on_repair" && (
            <>
              <Button
                onClick={handleQuickReturnToStock}
                disabled={updateArticleMutation.isPending}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {updateArticleMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Återställ</span>
                  </>
                )}
              </Button>
              <Button
                onClick={() => setReturnFromRepairModalOpen(true)}
                disabled={updateArticleMutation.isPending}
                size="sm"
                variant="outline"
                className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white hidden sm:flex"
              >
                <Plus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Med detaljer</span>
              </Button>
            </>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const loadingToast = toast.loading('Genererar etikett...');
              try {
                const response = await base44.functions.invoke('generateA4Label', { articleId: article.id });
                
                // Create iframe to render HTML
                const iframe = document.createElement('iframe');
                iframe.style.position = 'absolute';
                iframe.style.width = '1240px';
                iframe.style.height = '1754px';
                iframe.style.left = '-9999px';
                document.body.appendChild(iframe);
                
                // Write HTML content
                iframe.contentDocument.write(response.data);
                iframe.contentDocument.close();
                
                // Wait for content to load
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Use html2canvas to convert to image
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(iframe.contentDocument.body, {
                  width: 1240,
                  height: 1754,
                  scale: 2,
                  backgroundColor: '#ffffff'
                });
                
                // Convert to blob and download
                canvas.toBlob((blob) => {
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `artikel_${article.batch_number}_${Date.now()}.png`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  a.remove();
                  document.body.removeChild(iframe);
                  toast.success('A4-etikett nedladdad som PNG', { id: loadingToast });
                }, 'image/png');
                
              } catch (error) {
                console.error('A4 error:', error);
                toast.error('Kunde inte generera etikett: ' + error.message, { id: loadingToast });
              }
            }}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
          >
            <Printer className="w-4 h-4 md:mr-2" />
            <span className="hidden sm:inline">A4</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrintModal(true)}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white hidden sm:flex"
          >
            <Printer className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Liten</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyArticle}
            disabled={createArticleMutation.isPending}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
            title="Kopiera artikel"
          >
            {createArticleMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
          >
            <Edit className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="bg-slate-800 border-slate-600 hover:bg-red-900/50 hover:border-red-500/50 text-white"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Article Header - Mobile Optimized */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-6">
        {/* Image Gallery */}
        <div className="w-full md:w-64 flex-shrink-0">
          <ImageGallery 
            images={article.image_urls || (article.image_url ? [article.image_url] : [])} 
            editable={false}
          />
          {(!article.image_urls || article.image_urls.length === 0) && !article.image_url && (
            <div className="w-full h-48 md:h-64 rounded-2xl bg-slate-800/50 flex items-center justify-center">
              <Package className="w-12 h-12 md:w-16 md:h-16 text-slate-600" />
            </div>
          )}
        </div>

        {/* Article Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-1 break-words">
                {article.customer_name || article.name}
              </h1>
              {article.customer_name && article.name !== article.customer_name && (
                <p className="text-xs md:text-sm text-slate-500 mb-1">({article.name})</p>
              )}
              <div className="flex flex-col gap-1 text-xs md:text-sm">
                {article.sku && (
                  <p className="text-blue-400 flex items-center gap-2 font-mono">
                    <Hash className="w-3 h-3 md:w-4 md:h-4" />
                    SKU: {article.sku}
                  </p>
                )}
                {article.batch_number && (
                  <p className="text-slate-400 flex items-center gap-2">
                    <Hash className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="text-slate-500">Batch:</span> {article.batch_number}
                  </p>
                )}
              </div>
            </div>
            <Badge className={cn("border text-xs md:text-sm flex-shrink-0", statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="p-3 md:p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <p className="text-xs md:text-sm text-blue-300 mb-1">I lager</p>
              <p className="text-2xl md:text-3xl font-bold text-white">{article.stock_qty || 0}</p>
            </div>
            <div className="p-3 md:p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-xs md:text-sm text-slate-400 mb-1">Min. nivå</p>
              <p className="text-2xl md:text-3xl font-bold text-white">{article.min_stock_level || "—"}</p>
            </div>
            {article.status === 'on_repair' && article.repair_notes && (
              <div className="p-3 md:p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <p className="text-xs md:text-sm text-orange-300 mb-1">Reparation</p>
                <p className="text-2xl md:text-3xl font-bold text-white">
                  {article.repair_notes.match(/^(\d+)\s*st/) ? article.repair_notes.match(/^(\d+)\s*st/)[1] : "—"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions - Mobile Optimized */}
      <div className="space-y-2 md:space-y-3 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          <Button
            onClick={() => onAdjustStock("add")}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-12 md:h-14 text-sm md:text-base active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Lägg till lager
          </Button>
          <Button
            onClick={() => onAdjustStock("remove")}
            className="bg-red-600 hover:bg-red-500 text-white font-semibold h-12 md:h-14 text-sm md:text-base active:scale-95 transition-transform"
          >
            <Minus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Ta ut från lager
          </Button>
        </div>

        {article.status !== "on_repair" && (
          <Button
            onClick={() => setRepairModalOpen(true)}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium h-10 md:h-11 text-sm md:text-base active:scale-95 transition-transform"
          >
            <Wrench className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Rapportera till Reparation
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800/50 border border-slate-700 w-full grid grid-cols-6 md:w-auto md:inline-flex">
          <TabsTrigger value="details" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Package className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Detaljer</span>
          </TabsTrigger>
          <TabsTrigger value="assembly" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Grid3X3 className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Sammansättning</span>
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <DollarSign className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Filer</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <History className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Historik</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <ShoppingCart className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Ordrar ({articleOrders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="repairs" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Wrench className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Reparation</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          {/* Grundläggande information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <h3 className="font-semibold text-white mb-4">Artikelinformation</h3>
              <div className="space-y-0">
                {article.sku && (
                  <InfoRow icon={Hash} label="Artikelnummer" value={article.sku} />
                )}
                <InfoRow icon={Package} label="Benämning" value={article.name} />
                {article.supplier_name && (
                  <InfoRow icon={Factory} label="Leverantör" value={article.supplier_name} />
                )}
                {article.supplier_price && (
                  <InfoRow icon={DollarSign} label="Leverantörspris" value={`${article.supplier_price} kr`} />
                )}
                {article.category && (
                  <InfoRow icon={Tag} label="Typ av artikel" value={article.category} />
                )}
                <InfoRow 
                  icon={article.is_stock_item !== false ? Check : X} 
                  label="Lagervara" 
                  value={article.is_stock_item !== false ? "Ja" : "Nej"} 
                />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <h3 className="font-semibold text-white mb-4">Mått & Vikt</h3>
              <div className="space-y-0">
                <InfoRow icon={Ruler} label="Bredd" value={
                  article.dimensions_width_mm ? `${article.dimensions_width_mm} mm` : null
                } />
                <InfoRow icon={Ruler} label="Höjd" value={
                  article.dimensions_height_mm ? `${article.dimensions_height_mm} mm` : null
                } />
                <InfoRow icon={Ruler} label="Djup" value={
                  article.dimensions_depth_mm ? `${article.dimensions_depth_mm} mm` : null
                } />
                <InfoRow icon={Scale} label="Vikt" value={
                  article.weight_g ? `${article.weight_g} g` : (article.weight_kg ? `${article.weight_kg * 1000} g` : null)
                } />
              </div>
            </div>
          </div>

          {/* Lagerplats & Kostnader */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <h3 className="font-semibold text-white mb-4">Lagerplats</h3>
              <div className="space-y-0">
                {article.warehouse && (
                  <InfoRow icon={Warehouse} label="Lagerställe" value={article.warehouse} />
                )}
                {article.shelf_address && (
                  <InfoRow icon={MapPin} label="Lagerplats" value={article.shelf_address} />
                )}
                {article.batch_number && (
                  <InfoRow icon={Hash} label="Batch Nummer" value={article.batch_number} />
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <h3 className="font-semibold text-white mb-4">Teknisk Information</h3>
              <div className="space-y-0">
                {article.pixel_pitch_mm && (
                  <InfoRow icon={Grid3X3} label="Pixel Pitch" value={`${article.pixel_pitch_mm} mm`} />
                )}
                {article.series && (
                  <InfoRow icon={Package} label="Serie" value={article.series} />
                )}
                {article.product_version && (
                  <InfoRow icon={Hash} label="Version" value={article.product_version} />
                )}
                {article.brightness_nits && (
                  <InfoRow icon={Grid3X3} label="Ljusstyrka" value={`${article.brightness_nits} nits`} />
                )}
              </div>
            </div>
          </div>

          {/* Tilläggsinfo (IM Vision specifik) */}
          {(article.customer_name || article.pitch_value || article.series || article.brightness_nits) && (
            <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
              <h3 className="font-semibold text-white mb-4">Tilläggsinfo</h3>
              <div className="space-y-0">
                {article.customer_name && (
                  <InfoRow icon={Package} label="Kundnamn" value={article.customer_name} />
                )}
                {article.pitch_value && (
                  <InfoRow icon={Grid3X3} label="Pitch värde" value={article.pitch_value} />
                )}
                {article.series && (
                  <InfoRow icon={Package} label="Serie" value={article.series} />
                )}
                {article.product_version && (
                  <InfoRow icon={Hash} label="Version" value={article.product_version} />
                )}
                {article.brightness_nits && (
                  <InfoRow icon={Grid3X3} label="Ljusstyrka" value={`${article.brightness_nits} nits`} />
                )}
                {article.manufacturer && (
                  <InfoRow icon={Factory} label="Tillverkare" value={article.manufacturer} />
                )}
                {article.manufacturing_date && !isNaN(new Date(article.manufacturing_date).getTime()) && (
                  <InfoRow icon={Calendar} label="Tillverkningsdatum" value={
                    format(new Date(article.manufacturing_date), "d MMM yyyy", { locale: sv })
                  } />
                )}
              </div>
            </div>
          )}

          {article.notes && (
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <h3 className="font-semibold text-white mb-3">Anteckningar</h3>
              <p className="text-slate-300">{article.notes}</p>
            </div>
          )}

          {article.status === "on_repair" && article.repair_notes && (
            <div className="p-5 rounded-2xl bg-orange-500/10 border border-orange-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-orange-400" />
                <h3 className="font-semibold text-white">Reparationsinformation</h3>
              </div>
              <p className="text-orange-200 mb-2">{article.repair_notes}</p>
              {article.repair_date && (
                <p className="text-xs text-orange-300">
                  Skickad: {format(new Date(article.repair_date), "d MMM yyyy", { locale: sv })}
                </p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assembly" className="mt-6">
          <ProductAssemblyManager article={article} />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Uppladdade filer
            </h3>

            {article.image_urls && article.image_urls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                {article.image_urls.map((url, index) => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
                  const fileName = url.split('/').pop().split('?')[0];
                  
                  return (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative rounded-xl overflow-hidden bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 transition-all"
                    >
                      {isImage ? (
                        <div className="aspect-square">
                          <img 
                            src={url} 
                            alt={`Fil ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-sm font-medium">Öppna</span>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-square flex flex-col items-center justify-center p-4">
                          <div className="text-4xl mb-2">📄</div>
                          <div className="text-xs text-slate-400 text-center truncate w-full px-2">
                            {fileName}
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-sm font-medium">Öppna</span>
                          </div>
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            )}

            <div>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={uploadingFiles}
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-600 bg-slate-900/30 cursor-pointer transition-colors"
              >
                {uploadingFiles ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-blue-400 rounded-full animate-spin" />
                    <span className="text-slate-400">Laddar upp...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-400">Lägg till filer</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Lagerrörelser för {article.name}
            </h3>

            {movements.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Ingen historik ännu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {movements.map((movement) => {
                  const typeConfig = {
                    inbound: { label: "Inleverans", icon: "📥", color: "text-emerald-400" },
                    outbound: { label: "Uttag", icon: "📤", color: "text-red-400" },
                    adjustment: { label: "Justering", icon: "⚙️", color: "text-blue-400" },
                    inventory: { label: "Inventering", icon: "📋", color: "text-purple-400" }
                  }[movement.movement_type] || { label: movement.movement_type, icon: "•", color: "text-slate-400" };

                  return (
                    <div
                      key={movement.id}
                      className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{typeConfig.icon}</span>
                            <span className={cn("font-medium", typeConfig.color)}>
                              {typeConfig.label}
                            </span>
                            <Badge variant="outline" className="bg-slate-800 text-slate-300 text-xs">
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity} st
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-400 mb-2">
                            {movement.reason || "Ingen anledning angiven"}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>
                              {format(new Date(movement.created_date), "d MMM yyyy HH:mm", { locale: sv })}
                            </span>
                            <span>•</span>
                            <span>
                              {movement.previous_qty} → {movement.new_qty} st
                            </span>
                            {movement.created_by && (
                              <>
                                <span>•</span>
                                <span>{movement.created_by}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
              Ordrar som innehåller denna artikel
            </h3>

            {articleOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Artikeln har inte använts i någon order ännu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {articleOrders.map((order) => {
                  const orderItem = orderItems.find(item => item.order_id === order.id);
                  const statusColors = {
                    draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
                    ready_to_pick: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                    picking: "bg-amber-500/20 text-amber-400 border-amber-500/30",
                    picked: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                    delivered: "bg-green-500/20 text-green-400 border-green-500/30",
                    cancelled: "bg-red-500/20 text-red-400 border-red-500/30"
                  };

                  return (
                    <Link 
                      key={order.id}
                      to={`${createPageUrl("Orders")}?orderId=${order.id}`}
                      className="block"
                    >
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/30 hover:border-slate-600 transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <p className="text-white font-medium">
                              {order.order_number || `Order #${order.id.slice(0, 8)}`}
                            </p>
                            <p className="text-sm text-slate-400">{order.customer_name}</p>
                          </div>
                          <Badge className={statusColors[order.status] || "bg-slate-500/20 text-slate-400"}>
                            {order.status === 'ready_to_pick' ? 'Redo' :
                             order.status === 'picking' ? 'Plockar' :
                             order.status === 'picked' ? 'Plockad' :
                             order.status === 'delivered' ? 'Levererad' :
                             order.status === 'cancelled' ? 'Avbruten' : order.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">
                            Antal: <span className="text-white font-medium">{orderItem?.quantity_ordered || 0} st</span>
                            {orderItem?.quantity_picked > 0 && (
                              <span className="text-emerald-400 ml-2">
                                (Plockad: {orderItem.quantity_picked})
                              </span>
                            )}
                          </span>
                          <span className="text-slate-500">
                            {format(new Date(order.created_date), "d MMM yyyy", { locale: sv })}
                          </span>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="repairs" className="mt-6">
          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-400" />
              Artiklar på reparation
            </h3>

            {articlesOnRepair.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Inga artiklar på reparation</p>
              </div>
            ) : (
              <div className="space-y-3">
                {articlesOnRepair.map((repairArticle) => (
                  <div
                    key={repairArticle.id}
                    className="p-4 rounded-xl bg-slate-900/50 border border-orange-500/30 hover:border-orange-500/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (repairArticle.id !== article.id) {
                        window.location.href = `#/Inventory?articleId=${repairArticle.id}`;
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{repairArticle.name}</span>
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                            #{repairArticle.batch_number}
                          </Badge>
                        </div>
                        {repairArticle.repair_notes && (
                          <p className="text-sm text-orange-200 mb-2">
                            {repairArticle.repair_notes}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          {repairArticle.repair_date && (
                            <span>
                              Skickad: {format(new Date(repairArticle.repair_date), "d MMM yyyy", { locale: sv })}
                            </span>
                          )}
                          {repairArticle.shelf_address && (
                            <>
                              <span>•</span>
                              <span>{repairArticle.shelf_address}</span>
                            </>
                          )}
                          {repairArticle.manufacturer && (
                            <>
                              <span>•</span>
                              <span>{repairArticle.manufacturer}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        </Tabs>

      {/* Modals */}
      {showPrintModal && (
        <LabelDownloader
          articles={[article]}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      <RepairModal
        isOpen={repairModalOpen}
        onClose={() => setRepairModalOpen(false)}
        article={article}
        onSubmit={handleSendToRepair}
        isSubmitting={updateArticleMutation.isPending}
      />

      <ReturnFromRepairModal
        isOpen={returnFromRepairModalOpen}
        onClose={() => setReturnFromRepairModalOpen(false)}
        article={article}
        onSubmit={handleReturnFromRepair}
        isSubmitting={updateArticleMutation.isPending}
      />
      </motion.div>
      );
      }