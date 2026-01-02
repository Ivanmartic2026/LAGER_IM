import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CameraCapture({ onImageCaptured, isProcessing, progress = 0 }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [previews, setPreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const processFiles = (files) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const previewPromises = imageFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previewPromises).then(urls => {
      setPreviews(urls);
    });

    onImageCaptured(imageFiles);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
    }
  };

  const clearPreview = () => {
    setPreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {previews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-2xl p-8 md:p-12
              transition-all duration-300 cursor-pointer
              ${dragActive 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-white/10 hover:border-white/20 bg-white/5 backdrop-blur-xl'
              }
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className={`
                w-20 h-20 rounded-2xl flex items-center justify-center
                transition-colors duration-300
                ${dragActive ? 'bg-blue-500/20' : 'bg-slate-800'}
              `}>
                <Camera className={`w-10 h-10 ${dragActive ? 'text-blue-400' : 'text-slate-400'}`} />
              </div>
              
              <div>
                <p className="text-lg font-medium text-white mb-1">
                  Ta foto eller ladda upp bild
                </p>
                <p className="text-sm text-slate-400">
                  Fotografera etikett, följesedel eller produktmärkning
                </p>
              </div>

              <div className="flex gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Kamera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Välj fil
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-2xl overflow-hidden bg-slate-900"
          >
            <div className={previews.length > 1 ? "grid grid-cols-2 gap-2 p-2" : ""}>
              {previews.map((preview, index) => (
                <img
                  key={index}
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className={previews.length > 1 ? "w-full h-32 object-contain rounded-lg" : "w-full h-auto max-h-[400px] object-contain"}
                />
              ))}
            </div>
            
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 max-w-xs w-full px-4">
                  <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <div className="w-full">
                    <p className="text-white font-medium text-center mb-2">
                      Analyserar {previews.length} bild{previews.length > 1 ? 'er' : ''} med AI...
                    </p>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-slate-300 text-sm text-center mt-1">{progress}%</p>
                  </div>
                </div>
              </div>
            )}

            {!isProcessing && (
              <div className="absolute top-3 right-3 flex gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="bg-slate-800/90 hover:bg-slate-700 backdrop-blur-sm"
                  onClick={clearPreview}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}