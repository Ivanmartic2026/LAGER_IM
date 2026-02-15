import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import PullToRefresh from "@/components/utils/PullToRefresh";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  PackageSearch, AlertCircle, Camera, CheckCircle2, 
  ArrowLeft, User, Calendar, MapPin, Edit2, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { ListSkeleton } from "@/components/ui/list-skeleton";

export default function UnknownDeliveriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: unknownArticles = [], isLoading, refetch } = useQuery({
    queryKey: ['unknown-deliveries'],
    queryFn: async () => {
      const articles = await base44.entities.Article.list('-created_date', 100);
      return articles.filter(a => 
        a.status === 'unknown_delivery' || a.status === 'pending_verification'
      );
    },
    staleTime: 10000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateArticleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Article.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unknown-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success("Artikel uppdaterad");
      setSelectedArticle(null);
    }
  });

  const deleteArticleMutation = useMutation({
    mutationFn: (id) => base44.entities.Article.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unknown-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success("Artikel borttagen");
      setSelectedArticle(null);
    }
  });

  const handleResolve = (article) => {
    setSelectedArticle(article);
  };

  const handleConfirmResolve = async (status) => {
    if (!selectedArticle) return;

    await updateArticleMutation.mutateAsync({
      id: selectedArticle.id,
      data: { 
        status: status,
        assigned_to: null
      }
    });
  };

  const filteredArticles = unknownArticles.filter(article => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      article.name?.toLowerCase().includes(query) ||
      article.batch_number?.toLowerCase().includes(query) ||
      article.manufacturer?.toLowerCase().includes(query) ||
      article.unknown_delivery_reference?.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: unknownArticles.length,
    unassigned: unknownArticles.filter(a => !a.assigned_to).length,
    underInvestigation: unknownArticles.filter(a => a.assigned_to).length
  };

  return (
    <PullToRefresh onRefresh={async () => {
      await refetch();
      toast.success('Uppdaterad!');
    }}>
      <div className="min-h-screen bg-black p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Inventory")}>
              <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tillbaka
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Okända Inleveranser
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Varor som anlänt utan matchning eller order
              </p>
            </div>
          </div>

          <Link to={createPageUrl("Scan")}>
            <Button className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/50">
              <Camera className="w-4 h-4 mr-2" />
              Registrera ny
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xl">
            <div className="text-3xl font-bold text-white mb-1">{stats.total}</div>
            <div className="text-sm text-slate-400">Totalt antal</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 backdrop-blur-xl">
            <div className="text-3xl font-bold text-amber-400 mb-1">{stats.unassigned}</div>
            <div className="text-sm text-slate-400">Ej tilldelade</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 backdrop-blur-xl">
            <div className="text-3xl font-bold text-blue-400 mb-1">{stats.underInvestigation}</div>
            <div className="text-sm text-slate-400">Under utredning</div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sök på namn, batch, tillverkare eller referens..."
            className="bg-white/5 border-white/10 hover:bg-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Articles List */}
        {isLoading ? (
          <ListSkeleton count={4} />
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <PackageSearch className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchQuery ? "Inga matchande leveranser" : "Inga okända leveranser"}
            </h3>
            <p className="text-white/50 mb-6">
              {searchQuery 
                ? "Prova ett annat sökord" 
                : "Alla inleveranser har identifierats"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredArticles.map((article) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="group p-4 rounded-xl cursor-pointer transition-all bg-white/5 backdrop-blur-xl border border-amber-500/30 hover:border-amber-500/50 hover:bg-white/10"
                  onClick={() => handleResolve(article)}
                >
                  <div className="flex items-start gap-4">
                    {/* Image */}
                    {article.image_urls?.[0] ? (
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-900/50">
                        <img 
                          src={article.image_urls[0]} 
                          alt={article.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-white/5 flex items-center justify-center">
                        <PackageSearch className="w-8 h-8 text-white/30" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-base mb-1 line-clamp-2">
                            {article.name || "Okänd artikel"}
                          </h3>
                          
                          <div className="flex items-center gap-3 text-sm text-slate-400 mb-2">
                            {article.unknown_delivery_reference && (
                              <span className="font-mono text-amber-400">
                                #{article.unknown_delivery_reference}
                              </span>
                            )}
                            {article.batch_number && (
                              <span className="font-mono">Batch: {article.batch_number}</span>
                            )}
                            {article.manufacturer && (
                              <span>{article.manufacturer}</span>
                            )}
                          </div>
                        </div>

                        <Badge className={cn(
                          "text-xs flex-shrink-0",
                          article.assigned_to
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        )}>
                          {article.assigned_to ? "Under utredning" : "Ej tilldelad"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {article.delivery_date && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>
                              {format(new Date(article.delivery_date), "d MMM yyyy", { locale: sv })}
                            </span>
                          </div>
                        )}
                        
                        {article.warehouse && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{article.warehouse}</span>
                          </div>
                        )}

                        {article.stock_qty !== undefined && (
                          <div className="text-slate-400">
                            <span className="text-white font-semibold">{article.stock_qty}</span> st
                          </div>
                        )}

                        {article.assigned_to && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <User className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">
                              {users.find(u => u.email === article.assigned_to)?.full_name || article.assigned_to}
                            </span>
                          </div>
                        )}
                      </div>

                      {article.notes && (
                        <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                          {article.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Resolve Modal */}
        <AnimatePresence>
          {selectedArticle && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedArticle(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Hantera okänd leverans
                    </h3>
                    <p className="text-sm text-slate-300">
                      Välj hur denna leverans ska hanteras
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-6">
                  <p className="font-medium text-white mb-1">{selectedArticle.name}</p>
                  {selectedArticle.unknown_delivery_reference && (
                    <p className="text-sm text-slate-400 font-mono mb-2">
                      #{selectedArticle.unknown_delivery_reference}
                    </p>
                  )}
                  {selectedArticle.notes && (
                    <p className="text-sm text-slate-400 mt-2">
                      {selectedArticle.notes}
                    </p>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <Button
                    onClick={() => handleConfirmResolve('active')}
                    disabled={updateArticleMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-500 text-white justify-start"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Identifierad - Lägg till i lager
                  </Button>

                  <Link 
                    to={`${createPageUrl("Inventory")}?articleId=${selectedArticle.id}`}
                    className="block w-full"
                  >
                    <Button
                      variant="outline"
                      className="w-full bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20 justify-start"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Redigera detaljer
                    </Button>
                  </Link>

                  <Button
                    onClick={() => {
                      if (confirm('Är du säker på att du vill ta bort denna artikel?')) {
                        deleteArticleMutation.mutate(selectedArticle.id);
                      }
                    }}
                    disabled={deleteArticleMutation.isPending}
                    variant="outline"
                    className="w-full bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-600/20 justify-start"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Ta bort / Returnera
                  </Button>
                </div>

                <Button
                  onClick={() => setSelectedArticle(null)}
                  variant="outline"
                  className="w-full bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                >
                  Stäng
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </PullToRefresh>
  );
}