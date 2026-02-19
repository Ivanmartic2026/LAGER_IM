import React from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, Hash, MapPin } from "lucide-react";

export default function DuplicateWarning({ existingArticles, onUpdate, onCreateNew, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-300 mb-1">
            Varning: Dubbletter hittades
          </h3>
          <p className="text-sm text-amber-200/80">
            {existingArticles.length} artikel{existingArticles.length !== 1 ? 'ar' : ''} med samma batchnummer finns redan i systemet
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {existingArticles.map((article) => (
          <div
            key={article.id}
            className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50"
          >
            <div className="flex items-start gap-3">
              {article.image_urls?.[0] ? (
                <img
                  src={article.image_urls[0]}
                  alt={article.name}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-slate-600" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white mb-1">{article.name}</h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                    <Hash className="w-3 h-3 mr-1" />
                    {article.batch_number}
                  </Badge>
                  {article.shelf_address && (
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                      <MapPin className="w-3 h-3 mr-1" />
                      {article.shelf_address}
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    {article.stock_qty || 0} st i lager
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <Button
          onClick={onUpdate}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12"
        >
          Uppdatera befintlig artikel (lägg till i lager)
        </Button>
        <Button
          onClick={onCreateNew}
          variant="outline"
          className="w-full bg-white/5 border-white/20 hover:bg-white/10 text-white h-12"
        >
          Skapa ny artikel ändå
        </Button>
        <Button
          onClick={onCancel}
          variant="ghost"
          className="w-full text-slate-400 hover:text-white hover:bg-white/5"
        >
          Avbryt
        </Button>
      </div>
    </motion.div>
  );
}