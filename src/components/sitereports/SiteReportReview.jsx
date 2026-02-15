import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle,
  Package, MapPin, Wrench, Camera, FileText, Download, ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import SwipeNavigation from "@/components/utils/SwipeNavigation";
import { LazyImage } from "@/components/utils/MobileOptimized";

export default function SiteReportReview({ report, onBack }) {
  const [processing, setProcessing] = useState(false);
  const [editingOrder, setEditingOrder] = useState(false);

  const { data: images = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['siteReportImages', report.id],
    queryFn: () => base44.entities.SiteReportImage.filter({ site_report_id: report.id })
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list()
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => base44.entities.Order.list('-created_date')
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['orderItems', report.linked_order_id],
    queryFn: () => report.linked_order_id 
      ? base44.entities.OrderItem.filter({ order_id: report.linked_order_id })
      : [],
    enabled: !!report.linked_order_id
  });

  const runMatchingMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('matchSiteImages', {
        site_report_id: report.id
      });
      return result.data;
    },
    onSuccess: (data) => {
      toast.success(`Matchade ${data.matches?.length || 0} bilder`);
      window.location.reload();
    },
    onError: (error) => {
      toast.error('Matchning misslyckades: ' + error.message);
    }
  });

  const confirmMatchMutation = useMutation({
    mutationFn: async ({ imageId, formData }) => {
      await base44.entities.SiteReportImage.update(imageId, {
        match_status: 'confirmed',
        confirmed_by: (await base44.auth.me()).email,
        form_data: formData,
        component_status: formData.component_status
      });
    },
    onSuccess: () => {
      toast.success('Matchning bekräftad');
      window.location.reload();
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      await base44.entities.SiteReport.update(report.id, {
        linked_order_id: orderId || null
      });
    },
    onSuccess: () => {
      toast.success('Order uppdaterad');
      setEditingOrder(false);
      window.location.reload();
    }
  });

  const handleRunMatching = async () => {
    setProcessing(true);
    try {
      await runMatchingMutation.mutateAsync();
    } catch (error) {
      console.error('Matching error:', error);
      toast.error('Matchning misslyckades');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info('Genererar PDF...');
      const response = await base44.functions.invoke('exportSiteReport', {
        report_id: report.id
      });
      
      // Create blob from response
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `site-rapport-${report.site_name}-${format(new Date(report.report_date), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('PDF nedladdad');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Kunde inte generera PDF');
    }
  };

  const pendingImages = images.filter(img => img.match_status === 'pending');
  const matchedImages = images.filter(img => img.match_status === 'matched');
  const confirmedImages = images.filter(img => img.match_status === 'confirmed');

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={onBack}
            variant="ghost"
            className="text-white/70 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                {report.site_name}
              </h1>
              <div className="space-y-1 text-sm text-white/60">
                {report.site_address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{report.site_address}</span>
                  </div>
                )}
                <div>
                  Tekniker: {report.technician_name || report.technician_email}
                </div>
                <div>
                  Datum: {format(new Date(report.report_date), "d MMMM yyyy HH:mm", { locale: sv })}
                </div>
                {report.linked_order_id && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <Package className="w-4 h-4" />
                    <span>Kopplad till order</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {matchedImages.length > 0 && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {matchedImages.length} matchningar redo
                </Badge>
              )}
              <Button
                onClick={handleExportPDF}
                variant="outline"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <FileText className="w-4 h-4 mr-2" />
                Exportera PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Linked Order Section */}
        <div className="mb-6 p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Kopplad order
            </h3>
            {!editingOrder && (
              <Button
                onClick={() => setEditingOrder(true)}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                {report.linked_order_id ? 'Ändra' : 'Koppla order'}
              </Button>
            )}
          </div>

          {editingOrder ? (
            <div className="space-y-3">
              <Select
                value={report.linked_order_id || ''}
                onValueChange={(value) => updateOrderMutation.mutate(value || null)}
              >
                <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                  <SelectValue placeholder="Välj order..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white max-h-[200px]">
                  <SelectItem value={null}>Ingen order</SelectItem>
                  {allOrders.map(order => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.order_number || order.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => setEditingOrder(false)}
                variant="ghost"
                size="sm"
                className="text-white/50 hover:text-white"
              >
                Avbryt
              </Button>
            </div>
          ) : (
            <div>
              {report.linked_order_id ? (
                <div>
                  <div className="text-sm font-medium text-white mb-3">
                    {allOrders.find(o => o.id === report.linked_order_id)?.order_number || 
                     allOrders.find(o => o.id === report.linked_order_id)?.customer_name || 
                     'Order hittades inte'}
                  </div>
                  
                  {orderItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-white/50 mb-2">Artiklar kopplade till Site:</div>
                      {orderItems.map(item => {
                        const article = articles.find(a => a.id === item.article_id);
                        return (
                          <Link
                            key={item.id}
                            to={createPageUrl(`Inventory?articleId=${item.article_id}`)}
                            className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">{item.article_name}</div>
                              <div className="text-xs text-white/40">
                                {article?.sku && <span>Artikelnr: {article.sku}</span>}
                                {article?.sku && item.article_batch_number && <span> • </span>}
                                {item.article_batch_number && <span>Batch: {item.article_batch_number}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <div className="text-sm font-medium text-white/70">
                                {item.quantity_ordered} st
                              </div>
                              <ExternalLink className="w-4 h-4 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-white/60">Ingen order kopplad</div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-2xl font-bold text-white">{images.length}</div>
            <div className="text-xs text-white/50">Totalt bilder</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="text-2xl font-bold text-amber-400">{pendingImages.length}</div>
            <div className="text-xs text-amber-400/70">Väntar</div>
          </div>
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">{confirmedImages.length}</div>
            <div className="text-xs text-green-400/70">Bekräftade</div>
          </div>
        </div>

        {/* All Images Gallery - Swipeable on mobile */}
        {images.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Alla bilder från site ({images.length})
            </h2>
            
            {/* Mobile: Swipeable view */}
            <div className="md:hidden">
              <SwipeNavigation
                items={images}
                renderItem={(image) => (
                  <div className="relative">
                    <LazyImage 
                      src={image.image_url} 
                      alt="Site" 
                      className="w-full h-80 rounded-2xl object-cover"
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={() => window.open(image.image_url, '_blank')}
                        className="p-3 rounded-xl bg-black/50 backdrop-blur hover:bg-black/70 transition-colors"
                      >
                        <ExternalLink className="w-5 h-5 text-white" />
                      </button>
                      <a
                        href={image.image_url}
                        download={`site-bild-${image.id}.jpg`}
                        className="p-3 rounded-xl bg-black/50 backdrop-blur hover:bg-black/70 transition-colors"
                      >
                        <Download className="w-5 h-5 text-white" />
                      </a>
                    </div>
                    {image.match_status === 'confirmed' && (
                      <div className="absolute top-4 left-4">
                        <div className="px-3 py-1.5 rounded-full bg-green-500/20 backdrop-blur border border-green-500/30 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-green-400">Bekräftad</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
            
            {/* Desktop: Grid view */}
            <div className="hidden md:grid grid-cols-4 gap-3">
              {images.map(image => (
                <div key={image.id} className="relative group">
                  <LazyImage 
                    src={image.image_url} 
                    alt="Site" 
                    className="w-full h-32 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(image.image_url, '_blank');
                      }}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <ExternalLink className="w-5 h-5 text-white" />
                    </button>
                    <a
                      href={image.image_url}
                      download={`site-bild-${image.id}.jpg`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Download className="w-5 h-5 text-white" />
                    </a>
                  </div>
                  {image.match_status === 'confirmed' && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400 bg-black/50 rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {pendingImages.length > 0 && (
          <div className="mb-6">
            <Button
              onClick={handleRunMatching}
              disabled={processing || runMatchingMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {processing || runMatchingMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Matchar bilder...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  Kör AI-matchning
                </>
              )}
            </Button>
          </div>
        )}

        {/* Matched Images - Ready for Review */}
        {matchedImages.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Redo för granskning</h2>
            <div className="space-y-4">
              {matchedImages.map(image => {
                const matchedArticle = articles.find(a => a.id === image.matched_article_id);
                return (
                  <ImageMatchCard
                    key={image.id}
                    image={image}
                    article={matchedArticle}
                    onConfirm={(formData) => confirmMatchMutation.mutate({ 
                      imageId: image.id, 
                      formData 
                    })}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Confirmed Images */}
        {confirmedImages.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Bekräftade matchningar</h2>
            <div className="space-y-2">
              {confirmedImages.map(image => {
                const matchedArticle = articles.find(a => a.id === image.matched_article_id);
                return (
                  <div key={image.id} className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-4">
                    <img src={image.image_url} alt="Site" className="w-16 h-16 rounded-lg object-cover" />
                    <div className="flex-1">
                      <div className="font-medium text-white">{matchedArticle?.name}</div>
                      <div className="text-sm text-white/50">
                        Status: {image.component_status === 'ok' ? 'OK' :
                                 image.component_status === 'needs_replacement' ? 'Behöver bytas' :
                                 image.component_status === 'needs_repair' ? 'Behöver repareras' : 'Dokumenterad'}
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {imagesLoading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-white/30 animate-spin mx-auto mb-4" />
            <p className="text-white/50">Laddar bilder...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ImageMatchCard({ image, article, onConfirm }) {
  const [formData, setFormData] = useState({
    component_status: 'documented',
    pixel_pitch: article?.pixel_pitch_mm || '',
    batch_number: article?.batch_number || '',
    mask_type: '',
    watt: '',
    volt: '',
    length: '',
    connector_type: ''
  });

  const getFormTemplate = () => {
    if (!article) return null;
    
    if (article.category === 'LED Module') return 'led_module';
    if (article.category === 'Power Supply') return 'power_supply';
    if (article.category === 'Cable') return 'cable';
    return 'other';
  };

  const template = getFormTemplate();

  return (
    <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Site Image */}
        <div>
          <div className="text-sm font-medium text-white/70 mb-2 flex items-center justify-between">
            <span>Bild från site</span>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(image.image_url, '_blank')}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Öppna
              </button>
              <a
                href={image.image_url}
                download={`site-bild-${image.id}.jpg`}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Ladda ner
              </a>
            </div>
          </div>
          <img 
            src={image.image_url} 
            alt="Site" 
            className="w-full h-64 rounded-xl object-cover bg-slate-900 cursor-pointer"
            onClick={() => window.open(image.image_url, '_blank')}
          />
        </div>

        {/* Matched Article Image */}
        <div>
          <div className="text-sm font-medium text-white/70 mb-2 flex items-center justify-between">
            <div>
              Matchad artikel
              <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500/30">
                {Math.round(image.match_confidence * 100)}% säkerhet
              </Badge>
            </div>
            {(article?.image_urls?.[0] || article?.image_url) && (
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(article?.image_urls?.[0] || article?.image_url, '_blank')}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Öppna
                </button>
                <a
                  href={article?.image_urls?.[0] || article?.image_url}
                  download={`artikel-${article?.sku || article?.id}.jpg`}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Ladda ner
                </a>
              </div>
            )}
          </div>
          <img 
            src={article?.image_urls?.[0] || article?.image_url} 
            alt={article?.name}
            className="w-full h-64 rounded-xl object-cover bg-slate-900 cursor-pointer"
            onClick={() => window.open(article?.image_urls?.[0] || article?.image_url, '_blank')}
          />
        </div>
      </div>

      {/* Article Info */}
      <div className="mb-6 p-4 rounded-xl bg-white/5">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <div className="font-semibold text-white">{article?.name}</div>
            {article?.batch_number && (
              <div className="text-sm text-white/50">Batch: {article.batch_number}</div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Form */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm font-medium text-white/70 mb-2 block">
            Status på komponenten
          </label>
          <Select 
            value={formData.component_status} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, component_status: value }))}
          >
            <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white">
              <SelectItem value="ok">OK - Fungerar</SelectItem>
              <SelectItem value="needs_replacement">Behöver bytas ut</SelectItem>
              <SelectItem value="needs_repair">Behöver repareras</SelectItem>
              <SelectItem value="documented">Endast dokumenterad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Template-specific fields */}
        {template === 'led_module' && (
          <>
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">Pixel Pitch</label>
              <Input
                value={formData.pixel_pitch}
                onChange={(e) => setFormData(prev => ({ ...prev, pixel_pitch: e.target.value }))}
                placeholder="t.ex. 2.6"
                className="bg-zinc-900 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">Mask-typ</label>
              <Input
                value={formData.mask_type}
                onChange={(e) => setFormData(prev => ({ ...prev, mask_type: e.target.value }))}
                placeholder="t.ex. SMD"
                className="bg-zinc-900 border-white/10 text-white"
              />
            </div>
          </>
        )}

        {template === 'power_supply' && (
          <>
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">Watt</label>
              <Input
                value={formData.watt}
                onChange={(e) => setFormData(prev => ({ ...prev, watt: e.target.value }))}
                placeholder="t.ex. 500W"
                className="bg-zinc-900 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">Volt</label>
              <Input
                value={formData.volt}
                onChange={(e) => setFormData(prev => ({ ...prev, volt: e.target.value }))}
                placeholder="t.ex. 12V"
                className="bg-zinc-900 border-white/10 text-white"
              />
            </div>
          </>
        )}

        {template === 'cable' && (
          <>
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">Längd</label>
              <Input
                value={formData.length}
                onChange={(e) => setFormData(prev => ({ ...prev, length: e.target.value }))}
                placeholder="t.ex. 5m"
                className="bg-zinc-900 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">Kontakttyp</label>
              <Input
                value={formData.connector_type}
                onChange={(e) => setFormData(prev => ({ ...prev, connector_type: e.target.value }))}
                placeholder="t.ex. RJ45"
                className="bg-zinc-900 border-white/10 text-white"
              />
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => onConfirm(formData)}
          className="flex-1 bg-green-600 hover:bg-green-500"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Bekräfta matchning
        </Button>
        <Button
          variant="outline"
          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Avvisa
        </Button>
      </div>
    </div>
  );
}