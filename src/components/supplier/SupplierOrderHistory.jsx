import React from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Package } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function SupplierOrderHistory({ supplierId }) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['supplier-orders', supplierId],
    queryFn: () => base44.entities.PurchaseOrder.filter({ supplier_id: supplierId }),
  });

  const { data: allOrderItems = [] } = useQuery({
    queryKey: ['supplier-order-items', supplierId],
    queryFn: async () => {
      const items = await base44.entities.PurchaseOrderItem.list('-created_date', 1000);
      return items.filter(item => 
        orders.some(order => order.id === item.purchase_order_id)
      );
    },
    enabled: orders.length > 0
  });

  const sortedOrders = [...orders].sort((a, b) => 
    new Date(b.created_date) - new Date(a.created_date)
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Ingen orderhistorik
          </h3>
          <p className="text-slate-600">
            Inga inköpsorder har skapats än
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-700';
      case 'ordered': return 'bg-blue-100 text-blue-700';
      case 'partially_received': return 'bg-amber-100 text-amber-700';
      case 'received': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft': return 'Utkast';
      case 'ordered': return 'Beställd';
      case 'partially_received': return 'Delvis mottagen';
      case 'received': return 'Mottagen';
      case 'cancelled': return 'Avbruten';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      {sortedOrders.map(order => {
        const orderItems = allOrderItems.filter(item => item.purchase_order_id === order.id);
        const totalItems = orderItems.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0);

        return (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {order.po_number || 'Inköpsorder'}
                    </h3>
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    Skapad: {format(new Date(order.created_date), 'PPP', { locale: sv })}
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">
                    {order.total_cost ? `${order.total_cost.toLocaleString('sv-SE')} kr` : '—'}
                  </div>
                  <p className="text-sm text-slate-600">
                    {totalItems} {totalItems === 1 ? 'artikel' : 'artiklar'}
                  </p>
                </div>
              </div>

              {order.expected_delivery_date && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Förväntat leveransdatum:</span>{' '}
                    {format(new Date(order.expected_delivery_date), 'PPP', { locale: sv })}
                  </p>
                </div>
              )}

              {orderItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Artiklar:</h4>
                  <div className="space-y-2">
                    {orderItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{item.article_name}</span>
                        <span className="font-medium">
                          {item.quantity_received || 0} / {item.quantity_ordered} st
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}