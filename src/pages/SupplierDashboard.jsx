import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Search, LogOut, ExternalLink, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  sent: { label: 'Skickad', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  confirmed: { label: 'Bekräftad', color: 'bg-green-100 text-green-800 border-green-300' },
  waiting_for_supplier_documentation: { label: 'Väntar på dokument', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  in_production: { label: 'I produktion', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  shipped: { label: 'Skickad', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  ready_for_reception: { label: 'Redo för mottagning', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  received: { label: 'Mottagen', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  cancelled: { label: 'Avbokad', color: 'bg-red-100 text-red-800 border-red-300' },
};

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const supplierId = localStorage.getItem('supplier_id');
  const supplierFullName = localStorage.getItem('supplier_full_name');

  useEffect(() => {
    if (!supplierId) {
      navigate('/SupplierLogin');
    }
  }, [supplierId, navigate]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['supplierPurchaseOrders', supplierId],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSupplierPurchaseOrders', { supplierId });
      return response.data;
    },
    enabled: !!supplierId,
  });

  const purchaseOrders = data?.purchaseOrders || [];

  const filteredOrders = purchaseOrders.filter(order =>
    (order.po_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (order.customer_reference || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    localStorage.removeItem('supplier_id');
    localStorage.removeItem('supplier_email');
    localStorage.removeItem('supplier_full_name');
    navigate('/SupplierLogin');
    toast.info('Du har loggats ut.');
  };

  if (!supplierId) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              Mina Inköpsorder
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">Välkommen, {supplierFullName}!</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="border-slate-300 bg-white">
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Uppdatera
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100">
              <LogOut className="w-4 h-4 mr-2" />
              Logga ut
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Sök på PO-nummer eller kundreferens..."
            className="pl-10 h-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
            <p className="text-sm">Laddar inköpsorder...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-600">
            <AlertCircle className="w-8 h-8 mb-4" />
            <p className="text-sm">Kunde inte ladda inköpsorder. Försök igen.</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Package className="w-12 h-12 mb-4 text-slate-300" />
            <p className="text-lg font-semibold mb-1">Inga inköpsorder hittades</p>
            <p className="text-sm">Kontakta IMvision om du tror att detta är fel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrders.map(order => {
              const currentStatus = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-slate-100 text-slate-700 border-slate-300' };
              return (
                <Card
                  key={order.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/SupplierPOView?po=${order.id}&token=${order.supplier_portal_token}`)}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-bold text-slate-900">
                      {order.po_number || `PO-${order.id.slice(0, 8)}`}
                    </CardTitle>
                    <ExternalLink className="h-4 w-4 text-slate-400 flex-shrink-0 mt-1" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge className={cn("text-xs font-medium border", currentStatus.color)}>
                      {currentStatus.label}
                    </Badge>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {order.customer_reference && (
                        <div>
                          <p className="text-slate-500 text-xs mb-0.5">Kundreferens</p>
                          <p className="text-slate-800 font-medium">{order.customer_reference}</p>
                        </div>
                      )}
                      {order.expected_delivery_date && (
                        <div>
                          <p className="text-slate-500 text-xs mb-0.5">Förväntat leveransdatum</p>
                          <p className="text-slate-800 font-medium">{format(new Date(order.expected_delivery_date), 'd MMM yyyy', { locale: sv })}</p>
                        </div>
                      )}
                      {order.fortnox_project_number && (
                        <div>
                          <p className="text-slate-500 text-xs mb-0.5">Projektnummer</p>
                          <p className="text-slate-800 font-medium">{order.fortnox_project_number}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}