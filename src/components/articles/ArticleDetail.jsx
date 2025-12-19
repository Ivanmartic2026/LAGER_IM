import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, MapPin, Calendar, Hash, Factory, Ruler, 
  Scale, Grid3X3, ArrowLeft, Edit, Trash2, Plus, Minus, Printer
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import PrintLabelModal from "@/components/labels/PrintLabelModal";

export default function ArticleDetail({ 
  article, 
  onBack, 
  onEdit, 
  onDelete,
  onAdjustStock 
}) {
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const getStatusConfig = (status) => {
    switch (status) {
      case "low_stock":
        return { label: "Lågt lager", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
      case "out_of_stock":
        return { label: "Slut i lager", color: "bg-red-500/20 text-red-400 border-red-500/30" };
      case "discontinued":
        return { label: "Utgått", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" };
      default:
        return { label: "I lager", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    }
  };

  const statusConfig = getStatusConfig(article.status);

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div className="flex items-center gap-3 text-slate-400">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-medium text-white">{value || "—"}</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tillbaka
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPrintModalOpen(true)}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700"
            title="Skriv ut hylletikett"
          >
            <Printer className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onEdit}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onDelete}
            className="bg-slate-800 border-slate-600 hover:bg-red-900/50 hover:border-red-500/50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {article.image_url ? (
          <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden bg-slate-800 flex-shrink-0">
            <img 
              src={article.image_url} 
              alt={article.name}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full md:w-48 h-48 rounded-2xl bg-slate-800/50 flex items-center justify-center flex-shrink-0">
            <Package className="w-16 h-16 text-slate-600" />
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{article.name}</h1>
              <p className="text-slate-400 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                {article.batch_number}
              </p>
            </div>
            <Badge className={cn("border text-sm", statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-blue-300 mb-1">I lager</p>
              <p className="text-3xl font-bold text-white">{article.stock_qty || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Min. lagernivå</p>
              <p className="text-3xl font-bold text-white">{article.min_stock_level || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => onAdjustStock("add")}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Lägg till lager
        </Button>
        <Button
          onClick={() => onAdjustStock("remove")}
          variant="outline"
          className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700"
        >
          <Minus className="w-4 h-4 mr-2" />
          Ta ut från lager
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <h3 className="font-semibold text-white mb-4">Artikelinformation</h3>
          <div className="space-y-0">
            <InfoRow icon={Factory} label="Tillverkare" value={article.manufacturer} />
            <InfoRow icon={Calendar} label="Tillverkningsdatum" value={
              article.manufacturing_date 
                ? format(new Date(article.manufacturing_date), "d MMM yyyy", { locale: sv })
                : null
            } />
            <InfoRow icon={Grid3X3} label="Pixel Pitch" value={
              article.pixel_pitch_mm ? `${article.pixel_pitch_mm} mm` : null
            } />
            <InfoRow icon={Package} label="Kategori" value={article.category} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <h3 className="font-semibold text-white mb-4">Lagerplats & Mått</h3>
          <div className="space-y-0">
            <InfoRow icon={MapPin} label="Hyllplats" value={article.shelf_address} />
            <InfoRow icon={MapPin} label="Lager" value={article.warehouse} />
            <InfoRow icon={Ruler} label="Dimensioner" value={
              article.dimensions_width_mm || article.dimensions_height_mm || article.dimensions_depth_mm
                ? `${article.dimensions_width_mm || "—"} × ${article.dimensions_height_mm || "—"} × ${article.dimensions_depth_mm || "—"} mm`
                : null
            } />
            <InfoRow icon={Scale} label="Vikt" value={
              article.weight_kg ? `${article.weight_kg} kg` : null
            } />
          </div>
        </div>
      </div>

      {article.notes && (
        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <h3 className="font-semibold text-white mb-3">Anteckningar</h3>
          <p className="text-slate-300">{article.notes}</p>
        </div>
      )}

      <PrintLabelModal 
        article={article}
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
      />
    </motion.div>
  );
}