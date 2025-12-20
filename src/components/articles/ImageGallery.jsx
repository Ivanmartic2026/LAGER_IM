import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Upload, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ImageGallery({ images = [], onImagesChange, editable = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const hasImages = images && images.length > 0;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleRemoveImage = (index) => {
    if (onImagesChange) {
      const newImages = images.filter((_, i) => i !== index);
      onImagesChange(newImages);
      if (currentIndex >= newImages.length) {
        setCurrentIndex(Math.max(0, newImages.length - 1));
      }
    }
  };

  const handleAddImages = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !onImagesChange) return;

    // Upload files and get URLs
    const { base44 } = await import("@/api/base44Client");
    const uploadPromises = files.map(file => 
      base44.integrations.Core.UploadFile({ file })
    );
    
    const results = await Promise.all(uploadPromises);
    const newUrls = results.map(r => r.file_url);
    onImagesChange([...images, ...newUrls]);
  };

  if (!hasImages && !editable) {
    return null;
  }

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden bg-slate-800/50 border border-slate-700/50">
        {hasImages ? (
          <>
            {/* Main Image */}
            <div className="relative h-64 md:h-80">
              <img
                src={images[currentIndex]}
                alt={`Bild ${currentIndex + 1}`}
                className="w-full h-full object-contain cursor-pointer"
                onClick={() => setShowFullscreen(true)}
              />
              
              {editable && (
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 backdrop-blur-sm"
                  onClick={() => handleRemoveImage(currentIndex)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-sm"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-sm"
                    onClick={handleNext}
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </Button>
                </>
              )}

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm">
                  <span className="text-sm text-white">
                    {currentIndex + 1} / {images.length}
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto bg-slate-800/30">
                {images.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                      currentIndex === index
                        ? "border-blue-500 ring-2 ring-blue-500/30"
                        : "border-slate-600 hover:border-slate-500"
                    )}
                  >
                    <img
                      src={url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
                
                {editable && (
                  <label className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-slate-600 hover:border-blue-500 transition-all cursor-pointer flex items-center justify-center bg-slate-800/50">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleAddImages}
                    />
                  </label>
                )}
              </div>
            )}
          </>
        ) : (
          // Empty state with upload
          editable && (
            <label className="flex flex-col items-center justify-center h-64 cursor-pointer hover:bg-slate-800/70 transition-colors">
              <Upload className="w-12 h-12 text-slate-500 mb-3" />
              <p className="text-slate-400 text-sm">Klicka för att ladda upp bilder</p>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAddImages}
              />
            </label>
          )
        )}
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {showFullscreen && hasImages && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-6xl w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={images[currentIndex]}
                alt={`Bild ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />

              <Button
                size="icon"
                variant="ghost"
                className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-800"
                onClick={() => setShowFullscreen(false)}
              >
                <X className="w-5 h-5 text-white" />
              </Button>

              {images.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-800"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-800"
                    onClick={handleNext}
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </Button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-900/80 backdrop-blur-sm">
                    <span className="text-white">
                      {currentIndex + 1} / {images.length}
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}