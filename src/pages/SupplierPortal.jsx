import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Package, ShoppingCart, Upload, LogOut, FileText } from "lucide-react";
import { createPageUrl } from "@/utils";
import SupplierProductList from "@/components/supplier/SupplierProductList";
import SupplierOrderHistory from "@/components/supplier/SupplierOrderHistory";
import SupplierProductUpload from "@/components/supplier/SupplierProductUpload";

export default function SupplierPortal() {
  const [session, setSession] = useState(null);
  const [supplier, setSupplier] = useState(null);

  useEffect(() => {
    const storedSession = localStorage.getItem('supplier_session');
    if (!storedSession) {
      window.location.href = createPageUrl("SupplierLogin");
      return;
    }
    
    const parsedSession = JSON.parse(storedSession);
    setSession(parsedSession);
    
    // Fetch supplier details
    base44.entities.Supplier.filter({ id: parsedSession.supplier_id })
      .then(suppliers => {
        if (suppliers.length > 0) {
          setSupplier(suppliers[0]);
        }
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('supplier_session');
    toast.success("Utloggad");
    window.location.href = createPageUrl("SupplierLogin");
  };

  if (!session || !supplier) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Välkommen, {supplier.name}
            </h1>
            <p className="text-slate-600">
              Inloggad som {session.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logga ut
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Mina Produkter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold">
                  <SupplierProductCount supplierId={session.supplier_id} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Pågående Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold">
                  <SupplierOrderCount supplierId={session.supplier_id} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Totalt värde
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-2xl font-bold">
                  <SupplierTotalValue supplierId={session.supplier_id} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products">
              <Package className="w-4 h-4 mr-2" />
              Produkter
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-2" />
              Ladda upp
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Orderhistorik
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <SupplierProductList supplierId={session.supplier_id} />
          </TabsContent>

          <TabsContent value="upload">
            <SupplierProductUpload supplierId={session.supplier_id} />
          </TabsContent>

          <TabsContent value="orders">
            <SupplierOrderHistory supplierId={session.supplier_id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SupplierProductCount({ supplierId }) {
  const { data: articles = [] } = useQuery({
    queryKey: ['supplier-articles', supplierId],
    queryFn: () => base44.entities.Article.filter({ supplier_id: supplierId }),
  });
  return articles.length;
}

function SupplierOrderCount({ supplierId }) {
  const { data: orders = [] } = useQuery({
    queryKey: ['supplier-orders', supplierId],
    queryFn: () => base44.entities.PurchaseOrder.filter({ 
      supplier_id: supplierId,
      status: ['ordered', 'partially_received']
    }),
  });
  return orders.length;
}

function SupplierTotalValue({ supplierId }) {
  const { data: articles = [] } = useQuery({
    queryKey: ['supplier-articles', supplierId],
    queryFn: () => base44.entities.Article.filter({ supplier_id: supplierId }),
  });
  
  const total = articles.reduce((sum, article) => {
    return sum + ((article.supplier_price || 0) * (article.stock_qty || 0));
  }, 0);
  
  return `${Math.round(total).toLocaleString('sv-SE')} kr`;
}