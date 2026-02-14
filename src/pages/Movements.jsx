import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, TrendingUp, TrendingDown, RefreshCw, 
  ClipboardList, Calendar, Package, User, FileText
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function MovementsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isPulling, setIsPulling] = useState(false);
  const pullStartRef = useRef(0);
  const queryClient = useQueryClient();

  const { data: movements = [], isLoading, refetch } = useQuery({
    queryKey: ['movements'],
    queryFn: () => base44.entities.StockMovement.list('-created_date', 100),
  });

  // Pull-to-refresh
  useEffect(() => {
    let touchStartY = 0;
    
    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
      pullStartRef.current = window.scrollY;
    };

    const handleTouchMove = (e) => {
      if (pullStartRef.current === 0 && e.touches[0].clientY > touchStartY + 50) {
        setIsPulling(true);
      } else if (e.touches[0].clientY < touchStartY) {
        setIsPulling(false);
      }
    };

    const handleTouchEnd = async () => {
      if (isPulling) {
        setIsPulling(false);
        await refetch();
        toast.success('Uppdaterad!');
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, refetch]);

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const articlesMap = articles.reduce((acc, article) => {
    acc[article.id] = article;
    return acc;
  }, {});

  const filteredMovements = movements.filter(movement => {
    const article = articlesMap[movement.article_id];
    const matchesSearch = !searchQuery || 
      article?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article?.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || movement.movement_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const typeConfig = {
    inbound: {
      label: "Inleverans",
      icon: TrendingUp,
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    },
    outbound: {
      label: "Utleverans",
      icon: TrendingDown,
      color: "bg-red-500/20 text-red-400 border-red-500/30"
    },
    adjustment: {
      label: "Justering",
      icon: RefreshCw,
      color: "bg-blue-500/20 text-blue-400 border-blue-500/30"
    },
    inventory: {
      label: "Inventering",
      icon: ClipboardList,
      color: "bg-purple-500/20 text-purple-400 border-purple-500/30"
    }
  };

  const stats = {
    total: movements.length,
    inbound: movements.filter(m => m.movement_type === "inbound").length,
    outbound: movements.filter(m => m.movement_type === "outbound").length,
    today: movements.filter(m => {
      const date = new Date(m.created_date);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    }).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Lagerrörelser</h1>
          <p className="text-slate-400">Historik över alla artikelrörelser</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-slate-400">Totalt</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.inbound}</p>
                <p className="text-xs text-slate-400">Inleveranser</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.outbound}</p>
                <p className="text-xs text-slate-400">Utleveranser</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.today}</p>
                <p className="text-xs text-slate-400">Idag</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
         <div className="flex flex-col md:flex-row gap-3 mb-6">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <Input
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder="Sök artikel, batchnummer eller anledning..."
               className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
             />
           </div>
           <Button
             onClick={() => refetch()}
             disabled={isLoading}
             variant="outline"
             className="bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-white"
           >
             <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
             Uppdatera
           </Button>
          
          <Tabs value={typeFilter} onValueChange={setTypeFilter}>
            <TabsList className="bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="all" className="text-xs">Alla</TabsTrigger>
              <TabsTrigger value="inbound" className="text-xs">Inleverans</TabsTrigger>
              <TabsTrigger value="outbound" className="text-xs">Utleverans</TabsTrigger>
              <TabsTrigger value="adjustment" className="text-xs">Justering</TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs">Inventering</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Movements List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Inga rörelser hittades
            </h3>
            <p className="text-slate-400">
              {searchQuery ? "Prova ett annat sökord" : "Börja registrera artikelrörelser"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMovements.map((movement) => {
              const article = articlesMap[movement.article_id];
              const config = typeConfig[movement.movement_type];
              const Icon = config?.icon || Package;
              
              return (
                <motion.div
                  key={movement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", 
                        config?.color || "bg-slate-700")}>
                        <Icon className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white truncate">
                            {article?.name || "Okänd artikel"}
                          </h3>
                          <Badge className={cn("border text-xs", config?.color)}>
                            {config?.label}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {article?.batch_number || "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(movement.created_date), "d MMM yyyy HH:mm", { locale: sv })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {movement.created_by?.split('@')[0] || "System"}
                          </span>
                        </div>
                        
                        {movement.reason && (
                          <p className="text-sm text-slate-400 mt-1 truncate">
                            {movement.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <div className={cn("text-2xl font-bold", 
                        movement.quantity > 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                      </div>
                      <div className="text-xs text-slate-500">
                        {movement.previous_qty} → {movement.new_qty}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}