import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AIProcessingScreen from "./AIProcessingScreen";
import { toast } from "sonner";

export default function CameraCapture({ onImageCaptured, isProcessing, progress = 0 }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [previews, setPreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const triggerFileInput = (isCameraMode) => {
    try {
      const input = isCameraMode ? cameraInputRef.current : fileInputRef.current;
      if (input) {
        input.click();
      }
    } catch (error) {
      console.error('Error triggering file input:', error);
      toast.error('Kunde inte öppna filväljaren. Försök igen.');
    }
  };

  const handleFileChange = (e) => {
    try {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      
      const validFiles = files.filter(f => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const rawExtensions = ['.raw', '.cr2', '.nef', '.arw', '.dng', '.rw2', '.raf', '.x3f'];
        const isRaw = rawExtensions.some(ext => f.name.toLowerCase().endsWith(ext));
        
        if (!validTypes.includes(f.type) && !isRaw) {
          toast.error(`${f.name} är inte ett stödd bildformat (JPEG, PNG, WebP, RAW)`);
          return false;
        }
        return true;
      });
      if (validFiles.length > 0) {
        processFiles(validFiles);
      }
    } catch (error) {
      console.error('Error handling file change:', error);
      toast.error('Fel vid bearbetning av fil');
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
    <div className="w-full relative">
      <AnimatePresence>
        {isProcessing && <AIProcessingScreen progress={progress} />}
      </AnimatePresence>
      
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*,.raw,.cr2,.nef,.arw,.dng,.rw2,.raf,.x3f"
        capture="environment"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.raw,.cr2,.nef,.arw,.dng,.rw2,.raf,.x3f"
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
                  Fotografera eller ladda upp bild
                </p>
                <p className="text-sm text-slate-400">
                  Fånga etikett, följesedel eller produktmärkning
                </p>
              </div>

              <div className="flex gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerFileInput(true);
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
                    e.preventDefault();
                    e.stopPropagation();
                    triggerFileInput(false);
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