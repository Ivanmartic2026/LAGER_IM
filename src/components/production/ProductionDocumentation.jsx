import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, X, ChevronLeft, ChevronRight, Trash2, 
  CheckCircle2, AlertCircle, ZoomIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export default function ProductionDocumentation({ 
  productionRecord, 
  onChecklistChange, 
  onUpdateField,
  onImageUpload,
  onImageDelete,
  uploadingImages
}) {
  const [expandedImageType, setExpandedImageType] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const imageGalleries = [
    { 
      type: 'assembly_images', 
      label: 'Färdigmonterad enhet', 
      icon: '🔧',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      type: 'serial_number_images', 
      label: 'Serienummeretikett', 
      icon: '🏷️',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const handleImageNavigation = (type, direction) => {
    const images = productionRecord?.[type] || [];
    const current = currentImageIndex[type] || 0;
    let next = current + direction;
    
    if (next < 0) next = images.length - 1;
    if (next >= images.length) next = 0;
    
    setCurrentImageIndex({ ...currentImageIndex, [type]: next });
  };

  return (
    <div className="space-y-6">
      {/* Checklist Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Checklista</h3>
        </div>
        
        <div className="space-y-3">
          {[
            { field: 'assembled', label: 'Monterad', icon: '⚙️' },
            { field: 'tested', label: 'Testad', icon: '✓' },
            { field: 'ready_for_installation', label: 'Klar för installation', icon: '📦' }
          ].map(({ field, label, icon }) => (
            <motion.label
              key={field}
              whileHover={{ x: 4 }}
              className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Checkbox
                checked={productionRecord?.checklist?.[field] || false}
                onCheckedChange={() => onChecklistChange(field)}
              />
              <span className="text-lg mr-1">{icon}</span>
              <span className="text-white font-medium">{label}</span>
              {productionRecord?.checklist?.[field] && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-2 h-2 rounded-full bg-emerald-400"
                />
              )}
            </motion.label>
          ))}
        </div>
      </motion.div>

      {/* Notes & Deviations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Comments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <label className="text-sm font-semibold text-white mb-3 block flex items-center gap-2">
            💬 Kommentarer
          </label>
          <Textarea
            value={productionRecord?.notes || ''}
            onChange={(e) => onUpdateField('notes', e.target.value)}
            placeholder="Anteckningar från produktion..."
            className="bg-white/5 border-white/10 text-white min-h-[100px] focus:border-blue-400/50"
          />
        </motion.div>

        {/* Deviations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <label className="text-sm font-semibold text-white mb-3 block flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Avvikelser
          </label>
          <Textarea
            value={productionRecord?.deviations || ''}
            onChange={(e) => onUpdateField('deviations', e.target.value)}
            placeholder="Avvikelser som upptäckts..."
            className="bg-white/5 border-white/10 text-white min-h-[100px] focus:border-amber-400/50"
          />
        </motion.div>
      </div>

      {/* Image Galleries */}
      <div className="space-y-4">
        {imageGalleries.map(({ type, label, icon, color }, idx) => {
          const images = productionRecord?.[type] || [];
          const currentIdx = currentImageIndex[type] || 0;
          const currentImage = images[currentIdx];

          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              {/* Header */}
              <div className={`bg-gradient-to-r ${color} bg-opacity-10 p-5 border-b border-white/10`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{icon}</div>
                    <div>
                      <h4 className="font-semibold text-white">{label}</h4>
                      <p className="text-sm text-white/50">{images.length} bild{images.length !== 1 ? 'er' : ''}</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => onImageUpload(e, type)}
                    className="hidden"
                    id={`images-${type}`}
                    disabled={uploadingImages}
                  />
                  <label
                    htmlFor={`images-${type}`}
                    className={cn(
                      "text-sm px-4 py-2 rounded-full border-2 border-white/30 hover:border-white/50 text-white cursor-pointer flex items-center gap-2 transition-all hover:bg-white/5",
                      uploadingImages && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Camera className="w-4 h-4" />
                    Ladda upp
                  </label>
                </div>
              </div>

              {/* Gallery */}
              {images.length > 0 ? (
                <div className="p-5">
                  {/* Main Image Viewer */}
                  <div className="mb-4 rounded-xl overflow-hidden bg-black/30 relative group">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentImage}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative w-full"
                      >
                        <img
                          src={currentImage}
                          alt={`${label} ${currentIdx + 1}`}
                          className="w-full max-h-96 object-cover cursor-pointer"
                          onClick={() => setFullscreenImage(currentImage)}
                        />
                        
                        {/* Image Counter */}
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-sm text-white">
                          {currentIdx + 1} / {images.length}
                        </div>

                        {/* Action Buttons */}
                        <motion.button
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                          className="absolute top-3 left-3 bg-blue-500/80 hover:bg-blue-600 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setFullscreenImage(currentImage)}
                          title="Zooma"
                        >
                          <ZoomIn className="w-4 h-4 text-white" />
                        </motion.button>

                        <motion.button
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                          className="absolute top-3 right-3 bg-red-500/80 hover:bg-red-600 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onImageDelete(type, currentIdx)}
                          title="Ta bort"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </motion.button>

                        {/* Navigation */}
                        {images.length > 1 && (
                          <>
                            <button
                              onClick={() => handleImageNavigation(type, -1)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ChevronLeft className="w-5 h-5 text-white" />
                            </button>
                            <button
                              onClick={() => handleImageNavigation(type, 1)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ChevronRight className="w-5 h-5 text-white" />
                            </button>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Thumbnail Strip */}
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {images.map((url, idx) => (
                        <motion.button
                          key={idx}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => setCurrentImageIndex({ ...currentImageIndex, [type]: idx })}
                          className={cn(
                            "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all",
                            currentIdx === idx ? "ring-2 ring-blue-400" : "opacity-60 hover:opacity-100"
                          )}
                        >
                          <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-3">{icon}</div>
                  <p className="text-white/50">Inga bilder uppladdade ännu</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Fullscreen Image Modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setFullscreenImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-6xl w-full h-full flex items-center justify-center"
            >
              <img
                src={fullscreenImage}
                alt="Fullscreen"
                className="max-w-full max-h-full object-contain"
              />
              <button
                onClick={() => setFullscreenImage(null)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
                title="Stäng"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}