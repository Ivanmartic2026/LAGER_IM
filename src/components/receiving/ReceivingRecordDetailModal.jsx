import React from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export default function ReceivingRecordDetailModal({ receivingRecord, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Mottagningsdetaljer</h2>
            <p className="text-sm text-slate-400 mt-1">Information om mottagen artikel</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Article Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-400">Artikel</p>
              <p className="text-white font-medium">{receivingRecord.article_name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Mottagen kvantitet</p>
              <p className="text-white font-medium">{receivingRecord.quantity_received} st</p>
            </div>
            {receivingRecord.shelf_address && (
              <div>
                <p className="text-sm text-slate-400">Hyllplats</p>
                <p className="text-white font-medium">{receivingRecord.shelf_address}</p>
              </div>
            )}
          </div>

          {/* Status & Who */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-400">Kvalitetskontroll</p>
              <div className="flex items-center gap-2 mt-1">
                {receivingRecord.quality_check_passed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="text-white">
                  {receivingRecord.quality_check_passed ? 'Godkänd' : 'Ej godkänd'}
                </span>
              </div>
            </div>
            {receivingRecord.has_discrepancy && (
              <div>
                <p className="text-sm text-slate-400">Avvikelse</p>
                <div className="flex items-center gap-2 mt-1">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-white">
                    Ja {receivingRecord.discrepancy_reason && `- ${receivingRecord.discrepancy_reason}`}
                  </span>
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-slate-400">Mottagen av</p>
              <p className="text-white font-medium">{receivingRecord.received_by}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Mottagningsdatum</p>
              <p className="text-white font-medium">
                {format(new Date(receivingRecord.created_date), "d MMMM yyyy HH:mm", { locale: sv })}
              </p>
            </div>
          </div>

          {/* Notes */}
          {receivingRecord.notes && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Anteckningar</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                {receivingRecord.notes}
              </p>
            </div>
          )}

          {/* Images */}
          {receivingRecord.image_urls && receivingRecord.image_urls.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Bilder från mottagning</h3>
              <Carousel className="w-full max-w-lg mx-auto">
                <CarouselContent>
                  {receivingRecord.image_urls.map((imageUrl, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <div className="flex aspect-video items-center justify-center p-6 bg-slate-800 rounded-xl">
                          <img src={imageUrl} alt={`Mottagningsbild ${index + 1}`} className="max-w-full max-h-full object-contain rounded" />
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-slate-700 bg-slate-900/50">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-slate-800 border-slate-600 hover:bg-slate-700"
          >
            Stäng
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}