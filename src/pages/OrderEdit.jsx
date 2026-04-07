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
    status: 'SÄLJ',
    priority: 'normal',
    delivery_date: '',
    delivery_address: '',
    notes: '',
    site_visit_info: '',
    sales_completed: false
  });

  const [orderItems, setOrderItems] = useState([]);
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
        status: order.status || 'SÄLJ',
        priority: order.priority || 'normal',
        delivery_date: order.delivery_date || '',
        delivery_address: order.delivery_address || '',
        notes: order.notes || '',
        site_visit_info: order.site_visit_info || '',
        sales_completed: order.sales_completed || false
      });
    }
  }, [order]);

  useEffect(() => {
    if (orderId && existingItems.length > 0) {
      setOrderItems(existingItems);
    }
  }, [orderId, existingItems]);

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
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name) {
      toast.error("Kundnamn krävs");
      return;
    }

    saveOrderMutation.mutate(formData);
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
          {/* Basic Info */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Orderdetaljer</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Ordernummer
                </label>
                <Input
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                  placeholder="T.ex. ORD-2025-001"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Kundnamn *
                </label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Kundnamn"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Fortnox Kund
                </label>
                <FortnoxCustomerSelect
                  value={formData.fortnox_customer_number}
                  onSelect={(customer) => setFormData({
                    ...formData,
                    fortnox_customer_number: customer.CustomerNumber,
                    customer_name: customer.Name
                  })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Kundreferens
                </label>
                <Input
                  value={formData.customer_reference}
                  onChange={(e) => setFormData({ ...formData, customer_reference: e.target.value })}
                  placeholder="Referens"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

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

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Leveransdatum
                </label>
                <Input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Status
                </label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SÄLJ">SÄLJ</SelectItem>
                    <SelectItem value="KONSTRUKTION">KONSTRUKTION</SelectItem>
                    <SelectItem value="PRODUKTION">PRODUKTION</SelectItem>
                    <SelectItem value="LAGER">LAGER</SelectItem>
                    <SelectItem value="MONTERING">MONTERING</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Prioritet
                </label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Låg</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Hög</SelectItem>
                    <SelectItem value="urgent">Brådskande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pipeline Progress */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Pipeline</h2>
            {(() => {
              const STAGES = ['SÄLJ', 'KONSTRUKTION', 'PRODUKTION', 'LAGER', 'MONTERING'];
              const STAGE_COLORS = {
                'SÄLJ': '#8b5cf6',
                'KONSTRUKTION': '#3b82f6',
                'PRODUKTION': '#f97316',
                'LAGER': '#eab308',
                'MONTERING': '#22c55e',
              };
              const currentIdx = STAGES.indexOf(formData.status);
              const progress = currentIdx >= 0 ? ((currentIdx + 1) / STAGES.length) * 100 : 0;
              return (
                <div className="space-y-4">
                  {/* Progress bar */}
                  <div className="flex gap-2">
                    {STAGES.map((stage, i) => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: stage })}
                        title={stage}
                        style={{ backgroundColor: i <= currentIdx ? STAGE_COLORS[stage] : '#1e293b' }}
                        className="flex-1 h-2 rounded-full transition-all hover:opacity-80"
                      />
                    ))}
                  </div>
                  {/* Stage checkboxes */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {STAGES.map((stage, i) => {
                      const isActive = i === currentIdx;
                      return (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => setFormData({ ...formData, status: stage })}
                          className="flex items-center gap-2 p-2 rounded-lg border transition-all hover:opacity-80"
                          style={{
                            borderColor: isActive ? STAGE_COLORS[stage] + '60' : '#1e293b',
                            backgroundColor: isActive ? STAGE_COLORS[stage] + '20' : 'transparent',
                          }}
                        >
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: isActive ? STAGE_COLORS[stage] : '#1e293b' }}
                          >
                            {isActive && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                          </div>
                          <span className="text-xs font-medium" style={{ color: isActive ? STAGE_COLORS[stage] : '#64748b' }}>
                            {stage}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Address & Notes */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Adresser & Anteckningar</h2>
            
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Leveransadress
              </label>
              <Textarea
                value={formData.delivery_address}
                onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                placeholder="Fullständig leveransadress..."
                className="bg-slate-800 border-slate-700 text-white h-20"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                🗺️ Site Visit
              </label>
              <Textarea
                value={formData.site_visit_info}
                onChange={(e) => setFormData({ ...formData, site_visit_info: e.target.value })}
                placeholder="Datum, kontaktperson, vad som ska göras på platsen..."
                className="bg-slate-800 border-slate-700 text-white h-20"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Anteckningar
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Interna anteckningar..."
                className="bg-slate-800 border-slate-700 text-white h-20"
              />
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
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
                        onChange={(e) => {
                          const newItems = [...orderItems];
                          newItems[index].quantity_ordered = parseInt(e.target.value) || 1;
                          setOrderItems(newItems);
                        }}
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