import React, { useState, useRef } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, MapPin, Calendar, Hash, Factory, Ruler, 
  Scale, Grid3X3, ArrowLeft, Edit, Trash2, Plus, Minus, Printer, Wrench, CheckCircle2, History,
  DollarSign, Warehouse, Tag, Check, X, ShoppingCart, Copy, Camera, MessageSquare, Sparkles, FileText, Loader2, ChevronDown, ExternalLink, ArrowRightLeft
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
import ArticleComments from "./ArticleComments";
import LinkToSiteModal from "./LinkToSiteModal";
import InternalTransferModal from "./InternalTransferModal";
import WarehouseDistribution from "./WarehouseDistribution";
import LocationEditSection from "./LocationEditSection";
import PODocumentHub from "@/components/purchaseorders/PODocumentHub";
import ArticlePurchaseHistory from "./ArticlePurchaseHistory";
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
  const [linkToSiteModalOpen, setLinkToSiteModalOpen] = useState(false);
  const [internalTransferOpen, setInternalTransferOpen] = useState(false);
  const [generatingDocument, setGeneratingDocument] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [editingDimensions, setEditingDimensions] = useState(false);
  const [dimensionsData, setDimensionsData] = useState({
    dimensions_width_mm: article.dimensions_width_mm || '',
    dimensions_height_mm: article.dimensions_height_mm || '',
    dimensions_depth_mm: article.dimensions_depth_mm || '',
    weight_g: article.weight_g || ''
  });
  const [editingBasicInfo, setEditingBasicInfo] = useState(false);
  const [basicInfoData, setBasicInfoData] = useState({
    name: article.name || '',
    batch_number: article.batch_number || '',
    manufacturer: article.manufacturer || '',
    category: article.category || '',
  });
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationData, setLocationData] = useState({
    warehouse: article.warehouse || '',
    shelf_address: Array.isArray(article.shelf_address) ? (article.shelf_address[0] || '') : (article.shelf_address || ''),
    shelf_addresses: Array.isArray(article.shelf_address) ? article.shelf_address : (article.shelf_address ? [article.shelf_address] : ['']),
  });
  const [editingTechnical, setEditingTechnical] = useState(false);
  const [aiDataExpanded, setAiDataExpanded] = useState(false);
  const [technicalData, setTechnicalData] = useState({
    pixel_pitch_mm: article.pixel_pitch_mm || '',
    series: article.series || '',
    product_version: article.product_version || '',
    brightness_nits: article.brightness_nits || '',
    manufacturer: article.manufacturer || '',
    manufacturing_date: article.manufacturing_date || '',
  });
  const queryClient = useQueryClient();

  // Fetch stock movements for this article
  const { data: movements = [] } = useQuery({
    queryKey: ['article-movements', article.id],
    queryFn: () => base44.entities.StockMovement.filter({ article_id: article.id }, '-created_date', 500),
  });

  // Fetch sibling articles with same SKU (for multi-warehouse view)
  const { data: siblingArticles = [] } = useQuery({
    queryKey: ['sibling-articles', article.sku],
    queryFn: async () => {
      if (!article.sku) return [];
      const all = await base44.entities.Article.filter({ sku: article.sku });
      return all.filter(a => a.id !== article.id);
    },
    enabled: !!article.sku,
  });

  const { data: allArticles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-updated_date'),
  });

  const articlesOnRepair = allArticles.filter(a => a.status === 'on_repair');

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  // Fetch assembly data
  const { data: assemblyParts = [] } = useQuery({
    queryKey: ['assemblyParts', article.id],
    queryFn: async () => {
      const all = await base44.entities.ProductAssembly.list();
      return all.filter(a => a.parent_article_id === article.id);
    },
  });

  const { data: usedInProducts = [] } = useQuery({
    queryKey: ['usedInProducts', article.id],
    queryFn: async () => {
      const all = await base44.entities.ProductAssembly.list();
      return all.filter(a => a.part_article_id === article.id);
    },
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['orderItems', article.id],
    queryFn: async () => {
      const allItems = await base44.entities.OrderItem.list('-created_date', 100);
      return allItems.filter(item => item.article_id === article.id);
    },
  });

  // Fetch linked purchase order via source_purchase_order_id or by matching article in PO items
  const { data: linkedPurchaseOrder } = useQuery({
    queryKey: ['linked-po', article.id, article.source_purchase_order_id],
    queryFn: async () => {
      if (article.source_purchase_order_id) {
        const orders = await base44.entities.PurchaseOrder.filter({ id: article.source_purchase_order_id });
        return orders[0] || null;
      }
      // Try to find via PO items
      const poItems = await base44.entities.PurchaseOrderItem.filter({ article_id: article.id });
      if (poItems.length > 0) {
        const orders = await base44.entities.PurchaseOrder.filter({ id: poItems[0].purchase_order_id });
        return orders[0] || null;
      }
      return null;
    },
  });

  const { data: siteReportImages = [] } = useQuery({
    queryKey: ['siteReportImages', article.id],
    queryFn: async () => {
      const allImages = await base44.entities.SiteReportImage.filter({ 
        matched_article_id: article.id,
        match_status: 'confirmed'
      });
      return allImages;
    },
  });

  const uniqueReportIds = [...new Set(siteReportImages.map(img => img.site_report_id))];

  const { data: siteReports = [] } = useQuery({
    queryKey: ['siteReports', uniqueReportIds.join(',')],
    queryFn: async () => {
      if (uniqueReportIds.length === 0) return [];
      const allReports = await base44.entities.SiteReport.list('-created_date');
      return allReports.filter(r => uniqueReportIds.includes(r.id));
    },
    enabled: uniqueReportIds.length > 0,
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
      case "in_transit":
        return { label: "I transit från leverantör", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
      case "on_its_way_home":
        return { label: "På väg hem", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" };
      default:
        return { label: "In Stock", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    }
  };

  const handleSendToRepair = async (repairNotes, quantity) => {
    try {
      const newQty = (article.stock_qty || 0) - quantity;
      const currentRepairCount = article.repair_notes?.match(/^(\d+)\s*st/) ? 
        parseInt(article.repair_notes.match(/^(\d+)\s*st/)[1]) : 0;
      const totalRepairCount = currentRepairCount + quantity;
      
      await updateArticleMutation.mutateAsync({
        id: article.id,
        data: {
          status: "on_repair",
          repair_notes: `${totalRepairCount} st - ${repairNotes}`,
          repair_date: article.repair_date || new Date().toISOString().split('T')[0],
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
      className={cn(
        "space-y-6 rounded-2xl transition-all",
        article.status === 'in_transit' ? "ring-2 ring-blue-500/40 ring-offset-2 ring-offset-black" : ""
      )}
    >
      {/* Header - Mobile Optimized */}
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-black/80 backdrop-blur-xl z-[100] -mx-4 px-4 py-3">
        <div
          onClick={onBack}
          role="button"
          tabIndex={0}
          className="px-3 py-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden md:inline">Tillbaka</span>
        </div>
        
        {/* Mobile: Compact action menu */}
        <div className="flex gap-2 flex-wrap relative z-[101]">
          <div
            onClick={async () => {
              const loadingToast = toast.loading('Genererar etikett...');
              try {
                const response = await base44.functions.invoke('generateA4Label', { articleId: article.id });
                
                const iframe = document.createElement('iframe');
                iframe.style.position = 'absolute';
                iframe.style.width = '1240px';
                iframe.style.height = '1754px';
                iframe.style.left = '-9999px';
                document.body.appendChild(iframe);
                
                iframe.contentDocument.write(response.data);
                iframe.contentDocument.close();
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(iframe.contentDocument.body, {
                  width: 1240,
                  height: 1754,
                  scale: 2,
                  backgroundColor: '#ffffff'
                });
                
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
                  toast.success('A4-etikett nedladdad', { id: loadingToast });
                }, 'image/png');
                
              } catch (error) {
                console.error('A4 error:', error);
                toast.error('Kunde inte generera etikett: ' + error.message, { id: loadingToast });
              }
            }}
            role="button"
            tabIndex={0}
            className="h-10 px-4 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-white text-sm font-medium flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-xl"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">A4</span>
          </div>
          
          <div
            onClick={async () => {
              const loadingToast = toast.loading('Öppnar etikett...');
              try {
                const response = await base44.functions.invoke('generateResponsiveLabel', {
                  articleId: article.id
                });
                
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(response.data);
                  printWindow.document.close();
                  toast.success('Etikett öppnad!', { id: loadingToast });
                } else {
                  toast.error('Kunde inte öppna popup. Kontrollera popup-blockerare.', { id: loadingToast });
                }
              } catch (error) {
                console.error('Error:', error);
                toast.error('Kunde inte generera etikett', { id: loadingToast });
              }
            }}
            role="button"
            tabIndex={0}
            className="h-10 px-4 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-white text-sm font-medium flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-xl"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">HTML</span>
          </div>

          <div
            onClick={() => !createArticleMutation.isPending && handleCopyArticle()}
            role="button"
            tabIndex={0}
            title="Kopiera artikel"
            className={`h-10 px-4 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-white text-sm font-medium flex items-center gap-2 transition-all shadow-lg hover:shadow-xl ${createArticleMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {createArticleMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </div>

          <div
            onClick={async () => {
              if (generatingDocument) return;
              setGeneratingDocument(true);
              try {
                const response = await base44.functions.invoke('generateSupplierRequestDocument', {
                  article_id: article.id
                });

                if (response.data.success) {
                  window.open(response.data.upload_url, '_blank');
                  toast.success('Leverantörslänk öppnad!');
                }
              } catch (error) {
                console.error('Error:', error);
                toast.error('Kunde inte generera dokument');
              } finally {
                setGeneratingDocument(false);
              }
            }}
            role="button"
            tabIndex={0}
            className={`h-10 px-4 rounded-xl text-white text-sm font-medium flex items-center gap-2 transition-all shadow-lg hover:shadow-xl ${generatingDocument ? 'bg-slate-600 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-600 hover:to-blue-600 cursor-pointer'}`}
          >
            {generatingDocument ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </div>
          
          <div
            onClick={() => onEdit()}
            role="button"
            tabIndex={0}
            className="h-10 px-4 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-white text-sm font-medium flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-xl"
          >
            <Edit className="w-4 h-4" />
          </div>
          
          <div
            onClick={() => onDelete()}
            role="button"
            tabIndex={0}
            className="h-10 px-4 rounded-xl bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-xl"
          >
            <Trash2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ETA Banner */}
      {article.status === 'in_transit' && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 shadow-xl shadow-blue-500/30 border border-blue-400/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl flex-shrink-0">
              🚢
            </div>
            <p className="text-white font-bold text-base tracking-wide">Estimated Time of Arrival</p>
          </div>
          {article.transit_expected_date && (
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-2 flex-shrink-0">
              <Calendar className="w-4 h-4 text-blue-100" />
              <p className="text-white font-bold text-sm">
                {format(new Date(article.transit_expected_date), "d MMM yyyy", { locale: sv })}
              </p>
            </div>
          )}
        </div>
      )}

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
          
          {/* Quick Add Image Button */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="quick-image-upload"
            disabled={uploadingFiles}
          />
          <label
            htmlFor="quick-image-upload"
            className="mt-3 flex items-center justify-center gap-2 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 text-blue-300 font-medium cursor-pointer transition-all"
          >
            {uploadingFiles ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
                <span className="text-sm">Laddar upp...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span className="text-sm">Lägg till bilder</span>
              </>
            )}
          </label>
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
                    Article Number: {article.sku}
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
            <div className="flex flex-col gap-2 items-end">
              <Badge className={cn("border text-xs md:text-sm flex-shrink-0", statusConfig.color)}>
                {statusConfig.label}
              </Badge>
              {assemblyParts.length > 0 && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs flex-shrink-0">
                  <Grid3X3 className="w-3 h-3 mr-1" />
                  Sammansatt produkt
                </Badge>
              )}
              {usedInProducts.length > 0 && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs flex-shrink-0">
                  <Package className="w-3 h-3 mr-1" />
                  Används i {usedInProducts.length} produkt{usedInProducts.length !== 1 ? 'er' : ''}
                </Badge>
              )}
            </div>
            </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div className="p-3 md:p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <p className="text-xs md:text-sm text-blue-300 mb-1">I Lager</p>
              <p className="text-2xl md:text-3xl font-bold text-white">{article.stock_qty || 0}</p>
              {siblingArticles.length > 0 && (
                <p className="text-xs text-blue-300/70 mt-1">
                  +{siblingArticles.reduce((sum, a) => sum + (a.stock_qty || 0), 0)} (andra)
                </p>
              )}
            </div>
            <div className="p-3 md:p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <p className="text-xs md:text-sm text-purple-300 mb-1">Reserverat</p>
              <p className="text-2xl md:text-3xl font-bold text-white">{article.reserved_stock_qty || 0}</p>
              <p className="text-xs text-purple-300/70 mt-1">för ordrar</p>
            </div>
            <div className="p-3 md:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-xs md:text-sm text-emerald-300 mb-1">Tillgängligt</p>
              <p className="text-2xl md:text-3xl font-bold text-white">
                {Math.max(0, (article.stock_qty || 0) - (article.reserved_stock_qty || 0))}
              </p>
            </div>
            <div className="p-3 md:p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-xs md:text-sm text-slate-400 mb-1">Minimilager</p>
              <p className="text-2xl md:text-3xl font-bold text-white">{article.min_stock_level || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Mobile Optimized */}
      <div className="space-y-2 md:space-y-3 mb-6">



        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAdjustStock("add");
            }}
            className="bg-emerald-500/30 border border-emerald-500/60 hover:bg-emerald-500/40 text-emerald-300 font-semibold h-12 md:h-14 text-sm md:text-base active:scale-95 transition-all rounded-lg flex items-center justify-center gap-2 backdrop-blur-xl"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            Lägg till lager
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAdjustStock("remove");
            }}
            className="bg-red-500/30 border border-red-500/60 hover:bg-red-500/40 text-red-300 font-semibold h-12 md:h-14 text-sm md:text-base active:scale-95 transition-all rounded-lg flex items-center justify-center gap-2 backdrop-blur-xl"
          >
            <Minus className="w-4 h-4 md:w-5 md:h-5" />
            Ta ut från lager
          </button>
        </div>

        {(article.stock_qty || 0) > 0 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setRepairModalOpen(true);
            }}
            className="w-full bg-orange-500/30 border border-orange-500/60 hover:bg-orange-500/40 text-orange-300 font-medium h-10 md:h-11 text-sm md:text-base active:scale-95 transition-all rounded-lg flex items-center justify-center gap-2 backdrop-blur-xl"
          >
            <Wrench className="w-3 h-3 md:w-4 md:h-4" />
            Rapportera till Reparation
          </button>
        )}
        {(article.stock_qty || 0) > 0 && siblingArticles.length > 0 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setInternalTransferOpen(true);
            }}
            className="w-full bg-purple-500/30 border border-purple-500/60 hover:bg-purple-500/40 text-purple-300 font-medium h-10 md:h-11 text-sm md:text-base active:scale-95 transition-all rounded-lg flex items-center justify-center gap-2 backdrop-blur-xl"
          >
            <ArrowRightLeft className="w-3 h-3 md:w-4 md:h-4" />
            Flytta mellan lager
          </button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 w-full grid grid-cols-7 md:w-auto md:inline-flex p-1 gap-1 backdrop-blur-xl">
          <TabsTrigger 
            value="details" 
            className="flex items-center justify-center gap-2 text-sm font-medium text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-lg px-4 py-2.5 transition-all hover:text-white/70 hover:bg-white/5"
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Detaljer</span>
          </TabsTrigger>
          <TabsTrigger 
            value="assembly" 
            className="flex items-center justify-center gap-2 text-sm font-medium text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-lg px-4 py-2.5 transition-all hover:text-white/70 hover:bg-white/5"
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">Sammansättning</span>
          </TabsTrigger>
          <TabsTrigger 
            value="files" 
            className="flex items-center justify-center gap-2 text-sm font-medium text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-lg px-4 py-2.5 transition-all hover:text-white/70 hover:bg-white/5"
          >
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Filer</span>
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="flex items-center justify-center gap-2 text-sm font-medium text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-lg px-4 py-2.5 transition-all hover:text-white/70 hover:bg-white/5"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Historik</span>
          </TabsTrigger>
          <TabsTrigger 
            value="orders" 
            className="flex items-center justify-center gap-2 text-sm font-medium text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-lg px-4 py-2.5 transition-all hover:text-white/70 hover:bg-white/5"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Ordrar ({articleOrders.length})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="repairs" 
            className="flex items-center justify-center gap-2 text-sm font-medium text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-lg px-4 py-2.5 transition-all hover:text-white/70 hover:bg-white/5"
          >
            <Wrench className="w-4 h-4" />
            <span className="hidden sm:inline">Reparation</span>
          </TabsTrigger>
          <TabsTrigger 
            value="onsite" 
            className="flex items-center justify-center gap-2 text-sm font-medium text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-lg px-4 py-2.5 transition-all hover:text-white/70 hover:bg-white/5"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Onsite ({siteReports.length})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="purchase_history" 
            className="flex items-center justify-center gap-2 text-sm font-medium text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-lg px-4 py-2.5 transition-all hover:text-white/70 hover:bg-white/5"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Inköp</span>
          </TabsTrigger>
          <TabsTrigger 
            value="comments" 
            className="flex items-center justify-center gap-2 text-sm font-medium text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-lg px-4 py-2.5 transition-all hover:text-white/70 hover:bg-white/5"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Notes</span>
          </TabsTrigger>
          {linkedPurchaseOrder && (
            <TabsTrigger 
              value="documents" 
              className="flex items-center justify-center gap-2 text-sm font-medium text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-lg px-4 py-2.5 transition-all hover:text-white/70 hover:bg-white/5"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Dokument</span>
            </TabsTrigger>
          )}
          </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          {/* Grundläggande information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Article Information</h3>
                {!editingBasicInfo ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingBasicInfo(true);
                      setBasicInfoData({
                        name: article.name || '',
                        batch_number: article.batch_number || '',
                        manufacturer: article.manufacturer || '',
                        category: article.category || '',
                      });
                    }}
                    className="h-8 px-3 text-sm rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 flex items-center gap-1 transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    Redigera
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingBasicInfo(false);
                      }}
                      className="h-8 px-3 text-sm rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          const updatedData = {
                            name: basicInfoData.name,
                            batch_number: basicInfoData.batch_number || null,
                            manufacturer: basicInfoData.manufacturer || null,
                            category: basicInfoData.category || null,
                          };
                          await updateArticleMutation.mutateAsync({
                            id: article.id,
                            data: updatedData
                          });
                          Object.assign(article, updatedData);
                          setEditingBasicInfo(false);
                          toast.success('Information uppdaterad');
                        } catch (error) {
                          toast.error('Kunde inte uppdatera information');
                        }
                      }}
                      disabled={updateArticleMutation.isPending || !basicInfoData.name}
                      className="h-8 px-3 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                    >
                      Spara
                    </button>
                  </div>
                )}
              </div>
              {editingBasicInfo ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Product Name *</label>
                    <Input
                      type="text"
                      value={basicInfoData.name}
                      onChange={(e) => setBasicInfoData({...basicInfoData, name: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Batch ID</label>
                    <Input
                      type="text"
                      value={basicInfoData.batch_number}
                      onChange={(e) => setBasicInfoData({...basicInfoData, batch_number: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Manufacturer</label>
                    <Select
                      value={basicInfoData.manufacturer}
                      onValueChange={(value) => setBasicInfoData({...basicInfoData, manufacturer: value})}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue placeholder="Välj tillverkare..." />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.name}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Category</label>
                    <Select
                      value={basicInfoData.category}
                      onValueChange={(value) => setBasicInfoData({...basicInfoData, category: value})}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue placeholder="Välj typ..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cabinet">Kabinett</SelectItem>
                        <SelectItem value="LED Module">LED-modul</SelectItem>
                        <SelectItem value="Power Supply">Strömförsörjning</SelectItem>
                        <SelectItem value="Receiving Card">Receiving card</SelectItem>
                        <SelectItem value="Control Processor">Control Processor</SelectItem>
                        <SelectItem value="Computer">Dator</SelectItem>
                        <SelectItem value="Cable">Kabel</SelectItem>
                        <SelectItem value="Accessory">Tillbehör</SelectItem>
                        <SelectItem value="Other">Övrigt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  <InfoRow icon={Package} label="Product Name" value={article.name} />
                  {article.batch_number && (
                    <InfoRow icon={Hash} label="Batch ID" value={article.batch_number} />
                  )}
                  {article.manufacturer && (
                    <InfoRow icon={Factory} label="Manufacturer" value={article.manufacturer} />
                  )}
                  {article.category && (
                    <InfoRow icon={Tag} label="Category" value={article.category} />
                  )}
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Dimensions & Weight</h3>
                {!editingDimensions ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingDimensions(true);
                      setDimensionsData({
                        dimensions_width_mm: article.dimensions_width_mm || '',
                        dimensions_height_mm: article.dimensions_height_mm || '',
                        dimensions_depth_mm: article.dimensions_depth_mm || '',
                        weight_g: article.weight_g || ''
                      });
                    }}
                    className="h-8 px-3 text-sm rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 flex items-center gap-1 transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    Redigera
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingDimensions(false);
                      }}
                      className="h-8 px-3 text-sm rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          const updatedData = {
                            dimensions_width_mm: dimensionsData.dimensions_width_mm ? Number(dimensionsData.dimensions_width_mm) : null,
                            dimensions_height_mm: dimensionsData.dimensions_height_mm ? Number(dimensionsData.dimensions_height_mm) : null,
                            dimensions_depth_mm: dimensionsData.dimensions_depth_mm ? Number(dimensionsData.dimensions_depth_mm) : null,
                            weight_g: dimensionsData.weight_g ? Number(dimensionsData.weight_g) : null
                          };
                          await updateArticleMutation.mutateAsync({
                            id: article.id,
                            data: updatedData
                          });
                          // Update local article object
                          Object.assign(article, updatedData);
                          setEditingDimensions(false);
                          toast.success('Mått uppdaterade');
                        } catch (error) {
                          toast.error('Kunde inte uppdatera mått');
                        }
                      }}
                      disabled={updateArticleMutation.isPending}
                      className="h-8 px-3 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                    >
                      Spara
                    </button>
                  </div>
                )}
              </div>
              {editingDimensions ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Bredd (mm)</label>
                    <Input
                      type="number"
                      value={dimensionsData.dimensions_width_mm}
                      onChange={(e) => setDimensionsData({...dimensionsData, dimensions_width_mm: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                      placeholder="t.ex. 500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Höjd (mm)</label>
                    <Input
                      type="number"
                      value={dimensionsData.dimensions_height_mm}
                      onChange={(e) => setDimensionsData({...dimensionsData, dimensions_height_mm: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                      placeholder="t.ex. 500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Djup (mm)</label>
                    <Input
                      type="number"
                      value={dimensionsData.dimensions_depth_mm}
                      onChange={(e) => setDimensionsData({...dimensionsData, dimensions_depth_mm: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                      placeholder="t.ex. 80"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Vikt (g)</label>
                    <Input
                      type="number"
                      value={dimensionsData.weight_g}
                      onChange={(e) => setDimensionsData({...dimensionsData, weight_g: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                      placeholder="t.ex. 2500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  <InfoRow icon={Ruler} label="Width" value={
                    article.dimensions_width_mm ? `${article.dimensions_width_mm} mm` : null
                  } />
                  <InfoRow icon={Ruler} label="Height" value={
                    article.dimensions_height_mm ? `${article.dimensions_height_mm} mm` : null
                  } />
                  <InfoRow icon={Ruler} label="Depth" value={
                    article.dimensions_depth_mm ? `${article.dimensions_depth_mm} mm` : null
                  } />
                  <InfoRow icon={Scale} label="Weight" value={
                    article.weight_g ? `${article.weight_g} g` : (article.weight_kg ? `${article.weight_kg * 1000} g` : null)
                  } />
                </div>
              )}
            </div>
          </div>

          {/* Location & Teknisk */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Location</h3>
                {!editingLocation ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingLocation(true);
                      setLocationData({
                        warehouse: article.warehouse || '',
                        shelf_address: Array.isArray(article.shelf_address) ? (article.shelf_address[0] || '') : (article.shelf_address || ''),
                        shelf_addresses: Array.isArray(article.shelf_address) ? article.shelf_address : (article.shelf_address ? [article.shelf_address] : ['']),
                      });
                    }}
                    className="h-8 px-3 text-sm rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 flex items-center gap-1 transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    Redigera
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingLocation(false);
                      }}
                      className="h-8 px-3 text-sm rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          const allShelves = (locationData.shelf_addresses || [locationData.shelf_address]).filter(Boolean);
                          const updatedData = {
                            warehouse: locationData.warehouse || null,
                            shelf_address: allShelves.length > 0 ? allShelves : null,
                          };
                          await updateArticleMutation.mutateAsync({
                            id: article.id,
                            data: updatedData
                          });
                          Object.assign(article, updatedData);
                          setEditingLocation(false);
                          toast.success('Location uppdaterad');
                        } catch (error) {
                          toast.error('Kunde inte uppdatera lagerplats');
                        }
                      }}
                      disabled={updateArticleMutation.isPending}
                      className="h-8 px-3 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                    >
                      Spara
                    </button>
                  </div>
                )}
                </div>
                <WarehouseDistribution article={article} siblingArticles={siblingArticles} isEditing={editingLocation} />

              {editingLocation ? (
                <LocationEditSection locationData={locationData} setLocationData={setLocationData} />
              ) : (
                <div className="space-y-0">
                  {article.warehouse && (
                    <InfoRow icon={Warehouse} label="Warehouse" value={article.warehouse} />
                  )}
                  {article.shelf_address && (
                    Array.isArray(article.shelf_address) && article.shelf_address.length > 1 ? (
                      <div className="flex items-start justify-between py-3 border-b border-slate-700/50 last:border-0">
                        <div className="flex items-center gap-3 text-slate-400">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">Location</span>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {article.shelf_address.map((addr, i) => (
                            <span key={i} className="bg-slate-700 text-white text-xs px-2 py-1 rounded font-medium">{addr}</span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <InfoRow icon={MapPin} label="Location" value={Array.isArray(article.shelf_address) ? article.shelf_address[0] : article.shelf_address} />
                    )
                  )}
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Technical Information</h3>
                {!editingTechnical ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingTechnical(true);
                      setTechnicalData({
                        pixel_pitch_mm: article.pixel_pitch_mm || '',
                        series: article.series || '',
                        product_version: article.product_version || '',
                        brightness_nits: article.brightness_nits || '',
                        manufacturer: article.manufacturer || '',
                        manufacturing_date: article.manufacturing_date || '',
                      });
                    }}
                    className="h-8 px-3 text-sm rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 flex items-center gap-1 transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    Redigera
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingTechnical(false);
                      }}
                      className="h-8 px-3 text-sm rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          const updatedData = {
                            pixel_pitch_mm: technicalData.pixel_pitch_mm ? Number(technicalData.pixel_pitch_mm) : null,
                            series: technicalData.series || null,
                            product_version: technicalData.product_version || null,
                            brightness_nits: technicalData.brightness_nits ? Number(technicalData.brightness_nits) : null,
                            manufacturer: technicalData.manufacturer || null,
                            manufacturing_date: technicalData.manufacturing_date || null,
                          };
                          await updateArticleMutation.mutateAsync({
                            id: article.id,
                            data: updatedData
                          });
                          Object.assign(article, updatedData);
                          setEditingTechnical(false);
                          toast.success('Teknisk information uppdaterad');
                        } catch (error) {
                          toast.error('Kunde inte uppdatera information');
                        }
                      }}
                      disabled={updateArticleMutation.isPending}
                      className="h-8 px-3 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                    >
                      Spara
                    </button>
                  </div>
                )}
              </div>
              {editingTechnical ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Pixel Pitch (mm)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={technicalData.pixel_pitch_mm}
                      onChange={(e) => setTechnicalData({...technicalData, pixel_pitch_mm: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Serie</label>
                    <Input
                      type="text"
                      value={technicalData.series}
                      onChange={(e) => setTechnicalData({...technicalData, series: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Version</label>
                    <Input
                      type="text"
                      value={technicalData.product_version}
                      onChange={(e) => setTechnicalData({...technicalData, product_version: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Ljusstyrka (nits)</label>
                    <Input
                      type="number"
                      value={technicalData.brightness_nits}
                      onChange={(e) => setTechnicalData({...technicalData, brightness_nits: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Manufacturer</label>
                    <Input
                      type="text"
                      value={technicalData.manufacturer}
                      onChange={(e) => setTechnicalData({...technicalData, manufacturer: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Manufacture Date</label>
                    <Input
                      type="date"
                      value={technicalData.manufacturing_date}
                      onChange={(e) => setTechnicalData({...technicalData, manufacturing_date: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>
              ) : (
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
                  {article.manufacturer && (
                    <InfoRow icon={Factory} label="Manufacturer" value={article.manufacturer} />
                  )}
                  {article.manufacturing_date && !isNaN(new Date(article.manufacturing_date).getTime()) && (
                    <InfoRow icon={Calendar} label="Manufacture Date" value={
                    format(new Date(article.manufacturing_date), "d MMM yyyy", { locale: sv })
                    } />
                  )}
                </div>
              )}
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
                  <InfoRow icon={Factory} label="Manufacturer" value={article.manufacturer} />
                )}
                {article.manufacturing_date && !isNaN(new Date(article.manufacturing_date).getTime()) && (
                  <InfoRow icon={Calendar} label="Manufacture Date" value={
                    format(new Date(article.manufacturing_date), "d MMM yyyy", { locale: sv })
                  } />
                )}
              </div>
            </div>
          )}

          {article.notes && (
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <h3 className="font-semibold text-white mb-3">Notes</h3>
              <p className="text-slate-300">{article.notes}</p>
            </div>
          )}

          {/* AI-extraherad information */}
          {(article.ai_extracted_data || article.ai_confidence_scores) && (
            <div className="rounded-2xl bg-purple-500/10 border border-purple-500/30 overflow-hidden">
              <button
                onClick={() => setAiDataExpanded(prev => !prev)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-purple-500/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-white">AI-Extraherad Data</h3>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-purple-400 transition-transform", aiDataExpanded && "rotate-180")} />
              </button>
              
              {aiDataExpanded && (
                <div className="px-5 pb-5">
                  {article.ai_extracted_data && (
                    <div className="space-y-3 mb-4">
                      {Object.entries(article.ai_extracted_data).map(([key, value]) => {
                        if (!value || key.endsWith('_confidence') || key === 'image_urls') return null;
                        
                        const confidence = article.ai_confidence_scores?.[key];
                        const confidencePercent = confidence ? Math.round(confidence * 100) : null;
                        
                        return (
                          <div key={key} className="flex items-start justify-between py-2 border-b border-purple-500/20 last:border-0">
                            <div className="flex-1">
                              <p className="text-xs text-purple-300 mb-1 capitalize">
                                {key.replace(/_/g, ' ')}
                              </p>
                              <p className="text-white font-medium">{value.toString()}</p>
                            </div>
                            {confidencePercent !== null && (
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all ${
                                      confidencePercent >= 90 ? 'bg-emerald-500' :
                                      confidencePercent >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${confidencePercent}%` }}
                                  />
                                </div>
                                <span className="text-xs text-purple-300 min-w-[3rem] text-right">
                                  {confidencePercent}%
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <p className="text-xs text-purple-300/70 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Denna information extraherades automatiskt vid scanning
                  </p>
                </div>
              )}
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
          <ProductAssemblyManager 
            article={article} 
            assemblyParts={assemblyParts}
            usedInProducts={usedInProducts}
          />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Uppladdade filer
            </h3>

            {/* Source invoice + PO link */}
            {(article.source_invoice_url || linkedPurchaseOrder) && (
              <div className="mb-4 space-y-2">
                {article.source_invoice_url && (
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-purple-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-purple-300">Originalfaktura (inköpskälla)</p>
                        <p className="text-sm text-white font-medium truncate">
                          {article.source_invoice_number || 'Faktura'}
                        </p>
                      </div>
                    </div>
                    <a
                      href={article.source_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-medium transition-colors"
                    >
                      Öppna
                    </a>
                  </div>
                )}
                {linkedPurchaseOrder?.invoice_file_url && linkedPurchaseOrder.invoice_file_url !== article.source_invoice_url && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-amber-300">Faktura från inköpsorder</p>
                        <p className="text-sm text-white font-medium truncate">
                          {linkedPurchaseOrder.invoice_number || linkedPurchaseOrder.po_number || 'PO Faktura'}
                        </p>
                      </div>
                    </div>
                    <a
                      href={linkedPurchaseOrder.invoice_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 text-xs font-medium transition-colors"
                    >
                      Öppna
                    </a>
                  </div>
                )}
                {linkedPurchaseOrder && (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <ShoppingCart className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-blue-300">Kopplad inköpsorder</p>
                        <p className="text-sm text-white font-medium truncate">
                          {linkedPurchaseOrder.po_number || `PO #${linkedPurchaseOrder.id.slice(0,8)}`} · {linkedPurchaseOrder.supplier_name}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={createPageUrl('PurchaseOrders')}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-xs font-medium transition-colors"
                    >
                      Visa PO
                    </Link>
                  </div>
                )}
              </div>
            )}


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

            {movements.length === 0 && !article.stock_qty ? (
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
                {article.stock_qty > 0 && (
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/30 opacity-60">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">📦</span>
                          <span className="font-medium text-slate-300">Artikel skapad</span>
                          <Badge variant="outline" className="bg-slate-800 text-slate-300 text-xs">
                            +{article.stock_qty} st (startsaldo)
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">Startsaldo vid registrering</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>{format(new Date(article.created_date), "d MMM yyyy HH:mm", { locale: sv })}</span>
                          {article.created_by && (
                            <>
                              <span>•</span>
                              <span>{article.created_by}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
              Reparationsstatus
            </h3>

            {article.status !== 'on_repair' || !article.repair_notes ? (
              <div className="text-center py-8">
                <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Denna artikel är inte på reparation</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[article].map((repairArticle) => (
                  <Link
                    key={repairArticle.id}
                    to={`${createPageUrl("Repairs")}?articleId=${repairArticle.id}`}
                    className="block"
                  >
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-orange-500/30 hover:border-orange-500/50 transition-colors cursor-pointer">
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
                  </Link>
                ))}
                </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="purchase_history" className="mt-6">
          <ArticlePurchaseHistory articleId={article.id} />
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <ArticleComments articleId={article.id} />
        </TabsContent>

        {linkedPurchaseOrder && (
          <TabsContent value="documents" className="mt-6">
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs text-blue-300">
                  Dokument kopplade till inköpsorder: <span className="font-semibold text-white">{linkedPurchaseOrder.po_number || `PO #${linkedPurchaseOrder.id.slice(0,8)}`}</span>
                  {linkedPurchaseOrder.supplier_name && <span> · {linkedPurchaseOrder.supplier_name}</span>}
                </p>
              </div>
              <PODocumentHub purchaseOrder={linkedPurchaseOrder} />
            </div>
          </TabsContent>
        )}

        <TabsContent value="onsite" className="mt-6">
          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-400" />
                Användning på site
              </h3>
              <Button
                onClick={() => setLinkToSiteModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till manuellt
              </Button>
            </div>

            {siteReports.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Artikeln har inte dokumenterats på någon site ännu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {siteReports.map((report) => {
                  const reportImages = siteReportImages.filter(img => img.site_report_id === report.id);
                  
                  return (
                    <Link 
                      key={report.id}
                      to={`${createPageUrl("SiteReports")}?reportId=${report.id}`}
                      className="block"
                    >
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/30 hover:border-slate-600 transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <p className="text-white font-medium">{report.site_name}</p>
                            {report.site_address && (
                              <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                {report.site_address}
                              </p>
                            )}
                            <p className="text-sm text-slate-500 mt-1">
                              Tekniker: {report.technician_name || report.technician_email}
                            </p>
                          </div>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {reportImages.length} {reportImages.length === 1 ? 'bild' : 'bilder'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">
                            {format(new Date(report.report_date), "d MMM yyyy HH:mm", { locale: sv })}
                          </span>
                          {reportImages[0]?.component_status && (
                            <span className={cn(
                              "text-xs px-2 py-1 rounded",
                              reportImages[0].component_status === 'ok' ? 'bg-green-500/20 text-green-400' :
                              reportImages[0].component_status === 'needs_replacement' ? 'bg-red-500/20 text-red-400' :
                              reportImages[0].component_status === 'needs_repair' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-slate-500/20 text-slate-400'
                            )}>
                              {reportImages[0].component_status === 'ok' ? 'OK' :
                               reportImages[0].component_status === 'needs_replacement' ? 'Behöver bytas' :
                               reportImages[0].component_status === 'needs_repair' ? 'Behöver repareras' : 
                               'Dokumenterad'}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
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

      <LinkToSiteModal
        isOpen={linkToSiteModalOpen}
        onClose={() => setLinkToSiteModalOpen(false)}
        article={article}
      />

      <InternalTransferModal
        isOpen={internalTransferOpen}
        onClose={() => setInternalTransferOpen(false)}
        article={article}
        siblingArticles={siblingArticles}
      />
      </motion.div>
      );
      }