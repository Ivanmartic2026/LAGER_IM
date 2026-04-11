import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Plus, Trash2, Package, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useSearchParams, useNavigate } from 'react-router-dom';
import FortnoxCustomerSelect from "@/components/orders/FortnoxCustomerSelect";
import ProjectInfoSection from "@/components/orders/ProjectInfoSection";
import OrderTasks from "@/components/orders/OrderTasks";

export default function OrderEdit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id');
  
  const [formData, setFormData] = useState({
    order_number: '',
    customer_name: '',
    customer_reference: '',
    fortnox_customer_number: '',
    rm_system_id: '',
    rm_system_url: '',
    selected_stages: ['SÄLJ'],
    priority: 'normal',
    delivery_date: '',
    delivery_address: '',
    delivery_method: '',
    shipping_company: '',
    notes: '',
    site_visit_info: '',
    fortnox_project_number: '',
    fortnox_project_name: '',
    sales_completed: false,
    delivery_contact_name: '',
    delivery_contact_phone: '',
    installation_date: '',
    installation_type: '',
    screen_dimensions: '',
    pixel_pitch: '',
    module_count: '',
    critical_notes: '',
    uploaded_files: [],
    source_document_url: '',
    financial_status: ''
  });

  const [orderItems, setOrderItems] = useState([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [articleSearch, setArticleSearch] = useState('');
  const [articleDropdownOpen, setArticleDropdownOpen] = useState(false);
  const articleDropdownRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: order = null } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderId ? base44.entities.Order.filter({ id: orderId }).then(res => res[0] || null) : Promise.resolve(null),
    enabled: !!orderId,
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders', orderId],
    queryFn: () => orderId ? base44.entities.WorkOrder.filter({ order_id: orderId }) : Promise.resolve([]),
    enabled: !!orderId,
  });

  const { data: existingItems = [] } = useQuery({
    queryKey: ['orderItems', orderId],
    queryFn: () => orderId ? base44.entities.OrderItem.filter({ order_id: orderId }) : Promise.resolve([]),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (order) {
      setFormData({
        order_number: order.order_number || '',
        customer_name: order.customer_name || '',
        customer_reference: order.customer_reference || '',
        fortnox_customer_number: order.fortnox_customer_number || '',
        rm_system_id: order.rm_system_id || '',
        rm_system_url: order.rm_system_url || '',
        selected_stages: Array.isArray(order.selected_stages) ? order.selected_stages : (order.status ? [order.status] : ['SÄLJ']),
        priority: order.priority || 'normal',
        delivery_date: order.delivery_date || '',
        delivery_address: order.delivery_address || '',
        delivery_method: order.delivery_method || '',
        shipping_company: order.shipping_company || '',
        notes: order.notes || '',
        site_visit_info: order.site_visit_info || '',
        fortnox_project_number: order.fortnox_project_number || '',
        fortnox_project_name: order.fortnox_project_name || '',
        sales_completed: order.sales_completed || false,
        delivery_contact_name: order.delivery_contact_name || '',
        delivery_contact_phone: order.delivery_contact_phone || '',
        installation_date: order.installation_date || '',
        installation_type: order.installation_type || '',
        screen_dimensions: order.screen_dimensions || '',
        pixel_pitch: order.pixel_pitch || '',
        module_count: order.module_count || '',
        critical_notes: order.critical_notes || '',
        uploaded_files: order.uploaded_files || [],
        source_document_url: order.source_document_url || '',
        financial_status: order.financial_status || ''
      });
    }
  }, [order]);

  useEffect(() => {
    if (orderId && existingItems.length > 0 && !itemsLoaded) {
      setOrderItems(existingItems);
      setItemsLoaded(true);
    }
  }, [orderId, existingItems, itemsLoaded]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (articleDropdownRef.current && !articleDropdownRef.current.contains(e.target)) {
        setArticleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredArticles = articles.filter(a =>
    !articleSearch ||
    a.name?.toLowerCase().includes(articleSearch.toLowerCase()) ||
    a.sku?.toLowerCase().includes(articleSearch.toLowerCase()) ||
    a.batch_number?.toLowerCase().includes(articleSearch.toLowerCase()) ||
    a.customer_name?.toLowerCase().includes(articleSearch.toLowerCase())
  );

  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const handleFileUpload = async (type, file) => {
    setIsUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === 'source_document') {
        setFormData(prev => ({ ...prev, source_document_url: file_url }));
      } else {
        setFormData(prev => ({
          ...prev,
          uploaded_files: [...(prev.uploaded_files || []), { url: file_url, name: file.name, type }]
        }));
      }
    } finally {
      setIsUploadingFile(false);
    }
  };

  const saveOrderMutation = useMutation({
    mutationFn: async (data) => {
      let savedOrder;
      if (orderId) {
        await base44.entities.Order.update(orderId, data);
        savedOrder = { ...order, ...data };
      } else {
        savedOrder = await base44.entities.Order.create(data);
      }

      // Delete removed items
      if (orderId) {
        const existingIds = existingItems.map(item => item.id);
        const currentIds = orderItems.filter(item => item.id).map(item => item.id);
        const toDelete = existingIds.filter(id => !currentIds.includes(id));
        await Promise.all(toDelete.map(id => base44.entities.OrderItem.delete(id)));
      }

      // Save order items
      for (const item of orderItems) {
        const article = articles.find(a => a.id === item.article_id);
        const shelfAddress = article?.shelf_address 
          ? (Array.isArray(article.shelf_address) ? article.shelf_address.join(', ') : article.shelf_address)
          : (item.shelf_address || '');

        const itemData = {
          order_id: savedOrder.id,
          article_id: item.article_id,
          article_name: article?.name || item.article_name,
          article_batch_number: article?.batch_number || item.article_batch_number,
          shelf_address: shelfAddress,
          quantity_ordered: item.quantity_ordered,
          quantity_picked: item.quantity_picked || 0,
          status: item.status || 'pending'
        };

        if (item.id) {
          await base44.entities.OrderItem.update(item.id, itemData);
        } else {
          await base44.entities.OrderItem.create(itemData);
        }
      }

      // Always sync reserved stock after saving
      await base44.functions.invoke('syncReservedStock');

      // Sync materials_needed on linked work orders
      const linkedWorkOrders = await base44.entities.WorkOrder.filter({ order_id: savedOrder.id });
      for (const wo of linkedWorkOrders) {
        const updatedMaterials = orderItems.map(item => {
          const article = articles.find(a => a.id === item.article_id);
          const existing = (wo.materials_needed || []).find(m => m.article_id === item.article_id);
          return {
            article_id: item.article_id,
            article_name: article?.name || item.article_name,
            quantity: item.quantity_ordered,
            in_stock: existing?.in_stock ?? (article?.stock_qty || 0),
            missing: existing?.missing ?? 0,
            needs_purchase: existing?.needs_purchase ?? false,
            serial_number: existing?.serial_number || '',
          };
        });
        await base44.entities.WorkOrder.update(wo.id, { materials_needed: updatedMaterials });
      }

      return savedOrder;
    },
    onSuccess: async (savedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      
      // Log activity
      if (orderId) {
        try {
          await base44.functions.invoke('logProductionActivity', {
            order_id: orderId,
            type: 'field_change',
            message: 'Order uppdaterad',
          });
        } catch (e) {
          console.error('Activity log failed:', e);
        }
      }
      
      toast.success(orderId ? "Order uppdaterad" : "Order skapad");
      navigate('/Orders');
    },
    onError: (error) => {
      console.error('Save order error:', error);
      toast.error('Kunde inte spara order: ' + error.message);
    }
  });

  const handleAddArticle = () => {
    if (!selectedArticle) {
      toast.error("Välj en artikel");
      return;
    }

    const article = articles.find(a => a.id === selectedArticle.id);
    if (!article) return;

    const existingItem = orderItems.find(item => item.article_id === selectedArticle.id);
    if (existingItem) {
      setOrderItems(orderItems.map(item => 
        item.article_id === selectedArticle.id
          ? { ...item, quantity_ordered: item.quantity_ordered + quantity }
          : item
      ));
    } else {
      setOrderItems([...orderItems, {
        article_id: article.id,
        article_name: article.name,
        article_batch_number: article.batch_number,
        shelf_address: article.shelf_address,
        quantity_ordered: quantity,
        quantity_picked: 0,
        status: 'pending'
      }]);
    }

    setSelectedArticle(null);
    setArticleSearch('');
    setQuantity(1);
  };

  const handleRemoveItem = (index) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index, value) => {
    setOrderItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity_ordered: parseInt(value) || 1 } : item
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name || !formData.delivery_date || !formData.delivery_address) {
      toast.error("Kundnamn, leveransdatum och leveransadress krävs");
      return;
    }

    const dataToSave = {
      ...formData,
      module_count: formData.module_count !== '' && formData.module_count != null ? parseFloat(formData.module_count) : undefined,
    };
    if (dataToSave.module_count === undefined) delete dataToSave.module_count;
    saveOrderMutation.mutate(dataToSave);
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
         <div className="mb-6 flex items-center gap-4">
           <Button
             variant="ghost"
             size="icon"
             onClick={() => navigate('/Orders')}
             className="text-white/70 hover:text-white"
           >
             <ArrowLeft className="w-5 h-5" />
           </Button>
           <h1 className="text-3xl font-bold text-white">
             {orderId ? 'Redigera order' : 'Ny order'}
           </h1>
           {formData.sales_completed && (
                <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-green-900/30 border border-green-600/50">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-green-400">Försäljning slutförd</span>
                </div>
              )}
            </div>

        {/* Form */}
         <form onSubmit={handleSubmit} className="space-y-6">
           <ProjectInfoSection
             formData={formData}
             setFormData={setFormData}
             workOrders={workOrders}
             onFileUpload={handleFileUpload}
             isUploadingFile={isUploadingFile}
           />

          {/* Order Items */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4" id="articles">
            <h2 className="text-lg font-semibold text-white mb-4">Artiklar</h2>

            <div className="flex gap-2">
              <div className="relative flex-1" ref={articleDropdownRef}>
                <Input
                  placeholder={selectedArticle ? (selectedArticle.customer_name || selectedArticle.name) : "Sök artikel..."}
                  value={articleSearch}
                  onChange={(e) => {
                    setArticleSearch(e.target.value);
                    setSelectedArticle(null);
                    setArticleDropdownOpen(true);
                  }}
                  onFocus={() => setArticleDropdownOpen(true)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                {articleDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    {filteredArticles.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm">Ingen artikel hittades</div>
                    ) : (
                      filteredArticles.map((article) => {
                        const available = (article.stock_qty || 0) - (article.reserved_stock_qty || 0);
                        return (
                          <button
                            key={article.id}
                            type="button"
                            onClick={() => {
                              setSelectedArticle(article);
                              setArticleSearch('');
                              setArticleDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                          >
                            <div className="text-white text-sm font-medium">{article.customer_name || article.name}</div>
                            <div className="text-xs text-slate-400 flex gap-3">
                              {article.batch_number && <span>Batch: {article.batch_number}</span>}
                              {article.sku && <span>SKU: {article.sku}</span>}
                              <span className={available > 0 ? "text-green-400" : "text-red-400"}>
                                Tillgängligt: {available}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <Input
                type="number"
                min="1"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                placeholder="Antal"
                className="w-24 bg-slate-800 border-slate-700 text-white"
              />

              <Button
                type="button"
                onClick={handleAddArticle}
                className="bg-blue-600 hover:bg-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till
              </Button>
            </div>

            {orderItems.length > 0 ? (
              <div className="space-y-2">
                {orderItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Package className="w-4 h-4 text-slate-400" />
                      <div className="flex-1">
                        <div className="font-medium text-white text-sm">
                          {item.article_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.article_batch_number && `Batch: ${item.article_batch_number}`}
                          {item.shelf_address && ` • Hylla: ${item.shelf_address}`}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={item.quantity_ordered}
                        onChange={(e) => handleUpdateQuantity(index, e.target.value)}
                        className="w-20 bg-slate-900 border-slate-700 text-white text-center"
                      />
                      <span className="text-sm text-slate-400">st</span>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-slate-700 rounded-lg">
                <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  Inga artiklar tillagda ännu
                </p>
              </div>
            )}
          </div>

          {/* Tasks */}
          {orderId && (
            <OrderTasks orderId={orderId} />
          )}

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">RM System</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  RM System ID
                </label>
                <Input
                  value={formData.rm_system_id}
                  onChange={(e) => setFormData({ ...formData, rm_system_id: e.target.value })}
                  placeholder="T.ex. RM-12345"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  RM System URL
                </label>
                <Input
                  value={formData.rm_system_url}
                  onChange={(e) => setFormData({ ...formData, rm_system_url: e.target.value })}
                  placeholder="https://rm-system.example.com/order/12345"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/Orders')}
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={saveOrderMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {saveOrderMutation.isPending ? 'Sparar...' : orderId ? 'Uppdatera' : 'Skapa order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}