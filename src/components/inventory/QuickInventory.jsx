import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Package, Search, CheckCircle2, 
  AlertCircle, Loader2, ScanLine
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function QuickInventory({ articles }) {
  const [shelfAddress, setShelfAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundArticles, setFoundArticles] = useState([]);
  const [verifiedArticles, setVerifiedArticles] = useState(new Set());

  const handleSearch = async () => {
    if (!shelfAddress.trim()) return;
    
    setIsSearching(true);
    try {
      const results = articles.filter(article => 
        article.shelf_address?.toLowerCase().includes(shelfAddress.toLowerCase())
      );
      
      setFoundArticles(results);
      setVerifiedArticles(new Set());
      
      if (results.length === 0) {
        toast.error("Inga artiklar hittades på denna hyllplats");
      } else {
        toast.success(`Hittade ${results.length} artikel${results.length !== 1 ? 'ar' : ''}`);
      }
    } catch (error) {
      toast.error("Kunde inte söka artiklar");
    } finally {
      setIsSearching(false);
    }
  };

  const handleVerify = (articleId) => {
    const newVerified = new Set(verifiedArticles);
    if (newVerified.has(articleId)) {
      newVerified.delete(articleId);
    } else {
      newVerified.add(articleId);
    }
    setVerifiedArticles(newVerified);
  };

  const handleComplete = async () => {
    const unverified = foundArticles.filter(a => !verifiedArticles.has(a.id));
    
    if (unverified.length > 0) {
      const confirmed = window.confirm(
        `${unverified.length} artikel${unverified.length !== 1 ? 'ar' : ''} är inte verifierad${unverified.length !== 1 ? 'e' : ''}. Fortsätt ändå?`
      );
      if (!confirmed) return;
    }

    // Create inventory movements for verified articles
    try {
      for (const article of foundArticles) {
        if (verifiedArticles.has(article.id)) {
          await base44.entities.StockMovement.create({
            article_id: article.id,
            movement_type: "inventory",
            quantity: 0,
            previous_qty: article.stock_qty,
            new_qty: article.stock_qty,
            reason: `Snabbinventering av ${shelfAddress}`
          });
        }
      }
      
      toast.success("Inventering slutförd!");
      setShelfAddress("");
      setFoundArticles([]);
      setVerifiedArticles(new Set());
    } catch (error) {
      toast.error("Kunde inte spara inventering");
    }
  };

  const progress = foundArticles.length > 0 
    ? Math.round((verifiedArticles.size / foundArticles.length) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={shelfAddress}
            onChange={(e) => setShelfAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ange hyllplats (t.ex. F3-H1)..."
            className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={!shelfAddress.trim() || isSearching}
          className="bg-blue-600 hover:bg-blue-500"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Sök
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {foundArticles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Progress */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">
                  {verifiedArticles.size} av {foundArticles.length} verifierade
                </span>
                <span className="text-sm font-semibold text-white">{progress}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>

            {/* Articles */}
            <div className="space-y-2">
              {foundArticles.map((article) => {
                const isVerified = verifiedArticles.has(article.id);
                
                return (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer",
                      isVerified
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
                    )}
                    onClick={() => handleVerify(article.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          isVerified ? "bg-emerald-500/20" : "bg-slate-700"
                        )}>
                          {isVerified ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Package className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">
                            {article.name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>#{article.batch_number}</span>
                            <span>Lager: {article.stock_qty || 0}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Badge className={cn(
                        "border",
                        isVerified
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-700 text-slate-400 border-slate-600"
                      )}>
                        {isVerified ? "Verifierad" : "Väntar"}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setFoundArticles([]);
                  setVerifiedArticles(new Set());
                }}
                variant="outline"
                className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleComplete}
                disabled={verifiedArticles.size === 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Slutför inventering
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}