import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function CameraCapture({ onImageCaptured, isProcessing, progress = 0, onManual }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [previews, setPreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const triggerFileInput = (isCameraMode) => {
    try {
      if (isCameraMode) {
        // On Android WebView/APK, create a fresh input element each time to avoid issues
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.style.position = 'fixed';
        input.style.top = '-1000px';
        input.style.left = '-1000px';
        document.body.appendChild(input);
        input.addEventListener('change', (e) => {
          handleFileChange(e);
          document.body.removeChild(input);
        });
        input.click();
      } else {
        const input = fileInputRef.current;
        if (input) {
          input.value = '';
          input.click();
        }
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
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
        const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.raw', '.cr2', '.nef', '.arw', '.dng', '.rw2', '.raf', '.x3f'];
        const hasValidExt = validExtensions.some(ext => f.name.toLowerCase().endsWith(ext));
        const hasValidType = validTypes.includes(f.type) || f.type.startsWith('image/');
        
        if (!hasValidType && !hasValidExt) {
          toast.error(`${f.name} är inte ett bildformat som stöds`);
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
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.raw', '.cr2', '.nef', '.arw', '.dng'];
    const imageFiles = files.filter(f => f.type.startsWith('image/') || imageExtensions.some(ext => f.name.toLowerCase().endsWith(ext)));
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
      
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
        disabled={isProcessing}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        disabled={isProcessing}
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
                  className={previews.length > 1 ? "w-full h-32 object-contain rounded-lg" : "w-full h-auto max-h-[400px] max-w-full object-contain"}
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