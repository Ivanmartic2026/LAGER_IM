import React, { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, Clock, CheckCircle2, Truck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: '📝' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: '📬' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700', icon: '✓' },
  waiting_for_supplier_documentation: { label: 'Pending Docs', color: 'bg-amber-100 text-amber-700', icon: '⏳' },
  in_production: { label: 'In Production', color: 'bg-purple-100 text-purple-700', icon: '⚙️' },
  shipped: { label: 'Shipped', color: 'bg-cyan-100 text-cyan-700', icon: '🚚' },
  ready_for_reception: { label: 'Ready', color: 'bg-indigo-100 text-indigo-700', icon: '📦' },
  received: { label: 'Received', color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: '✕' }
};

export default function SupplierDashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders-all'],
    queryFn: async () => {
      const response = await base44.entities.PurchaseOrder.list();
      return response || [];
    }
  });

  // Group by supplier
  const supplierData = useMemo(() => {
    const grouped = {};
    
    purchaseOrders.forEach(po => {
      const supplierName = po.supplier_name || 'Unknown';
      if (!grouped[supplierName]) {
        grouped[supplierName] = {
          supplier_name: supplierName,
          supplier_id: po.supplier_id,
          orders: [],
          stats: {
            total: 0,
            pending: 0,
            confirmed: 0,
            shipped: 0,
            received: 0
          }
        };
      }
      grouped[supplierName].orders.push(po);
      grouped[supplierName].stats.total++;

      if (['draft', 'sent'].includes(po.status)) {
        grouped[supplierName].stats.pending++;
      } else if (['confirmed', 'waiting_for_supplier_documentation'].includes(po.status)) {
        grouped[supplierName].stats.confirmed++;
      } else if (['in_production', 'ready_for_reception'].includes(po.status)) {
        grouped[supplierName].stats.shipped++;
      } else if (po.status === 'received') {
        grouped[supplierName].stats.received++;
      }
    });

    return Object.values(grouped);
  }, [purchaseOrders]);

  const filtered = useMemo(() => {
    if (!searchQuery) return supplierData;
    return supplierData.filter(s => 
      s.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [supplierData, searchQuery]);

  const totals = useMemo(() => ({
    suppliers: supplierData.length,
    orders: purchaseOrders.length,
    pending: supplierData.reduce((sum, s) => sum + s.stats.pending, 0),
    confirmed: supplierData.reduce((sum, s) => sum + s.stats.confirmed, 0),
  }), [supplierData, purchaseOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Supplier Dashboard</h1>
          </div>
          <p className="text-slate-600">Manage and monitor all supplier purchase orders</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Suppliers', value: totals.suppliers, icon: '👥', color: 'bg-blue-50 border-blue-200' },
            { label: 'Total Orders', value: totals.orders, icon: '📦', color: 'bg-purple-50 border-purple-200' },
            { label: 'Pending', value: totals.pending, icon: '⏳', color: 'bg-amber-50 border-amber-200' },
            { label: 'Confirmed', value: totals.confirmed, icon: '✓', color: 'bg-green-50 border-green-200' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -2 }}
              className={cn('p-4 rounded-xl border', stat.color)}
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              <p className="text-xs text-slate-600 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search suppliers..."
            className="pl-10 h-10 bg-white border-slate-300"
          />
        </div>

        {/* Suppliers Grid */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {filtered.map((supplier, idx) => (
            <motion.div
              key={supplier.supplier_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="mb-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{supplier.supplier_name}</h3>
                  <p className="text-sm text-slate-600">Total Orders: {supplier.stats.total}</p>
                </div>

                {/* Status Stats Row */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Pending', value: supplier.stats.pending, icon: Clock, color: 'text-amber-600' },
                    { label: 'Confirmed', value: supplier.stats.confirmed, icon: CheckCircle2, color: 'text-green-600' },
                    { label: 'Shipped', value: supplier.stats.shipped, icon: Truck, color: 'text-blue-600' },
                    { label: 'Received', value: supplier.stats.received, icon: Package, color: 'text-emerald-600' },
                  ].map((stat, i) => (
                    <div key={i} className="text-center">
                      <div className={cn('text-xl mb-1', stat.color)}>
                        <stat.icon className="w-5 h-5 mx-auto" />
                      </div>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Orders */}
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Recent Orders</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {supplier.orders.slice(0, 5).map(order => {
                      const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
                      return (
                        <div key={order.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                          <span className="text-slate-700 font-medium truncate">{order.po_number || `PO-${order.id.slice(0, 6)}`}</span>
                          <Badge className={cn('text-xs py-0.5 px-2', status.color)}>
                            {status.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No suppliers found</p>
          </div>
        )}
      </div>
    </div>
  );
}