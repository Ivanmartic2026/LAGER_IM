import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Search, Edit2, Download, Package } from "lucide-react";
import SupplierProductEdit from "./SupplierProductEdit";

export default function SupplierProductList({ supplierId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingArticle, setEditingArticle] = useState(null);
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['supplier-articles', supplierId],
    queryFn: () => base44.entities.Article.filter({ supplier_id: supplierId }),
  });

  const updateArticleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Article.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-articles'] });
      setEditingArticle(null);
      toast.success("Produkt uppdaterad");
    }
  });

  const filteredArticles = articles.filter(article =>
    !searchQuery || 
    article.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.batch_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (editingArticle) {
    return (
      <SupplierProductEdit
        article={editingArticle}
        onSave={(data) => updateArticleMutation.mutate({ id: editingArticle.id, data })}
        onCancel={() => setEditingArticle(null)}
        isSaving={updateArticleMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök produkt, SKU eller batch..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Inga produkter
            </h3>
            <p className="text-slate-600">
              {searchQuery ? "Inga produkter hittades" : "Börja med att ladda upp dina produkter"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredArticles.map(article => (
            <Card key={article.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {article.name}
                      </h3>
                      {article.status !== 'active' && (
                        <Badge variant="outline">
                          {article.status === 'low_stock' ? 'Lågt lager' :
                           article.status === 'out_of_stock' ? 'Slut i lager' :
                           article.status}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-600">
                      {article.sku && (
                        <div>
                          <span className="font-medium">SKU:</span> {article.sku}
                        </div>
                      )}
                      {article.batch_number && (
                        <div>
                          <span className="font-medium">Batch:</span> {article.batch_number}
                        </div>
                      )}
                      {article.supplier_price && (
                        <div>
                          <span className="font-medium">Pris:</span> {article.supplier_price.toLocaleString('sv-SE')} kr
                        </div>
                      )}
                      <div>
                        <span className="font-medium">I lager:</span> {article.stock_qty || 0} st
                      </div>
                      {article.cfg_file_url && (
                        <div>
                          <a 
                            href={article.cfg_file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            CFG-fil
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingArticle(article)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Redigera
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}