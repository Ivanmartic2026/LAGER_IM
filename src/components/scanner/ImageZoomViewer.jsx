import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, Copy } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ImageZoomViewer({ imageUrl, onClose, onAnalyzeZoomArea }) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState(null);
  const containerRef = useRef(null);
  const [zoomBoxSelection, setZoomBoxSelection] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate dimensions
    const scaledWidth = image.width * zoom;
    const scaledHeight = image.height * zoom;
    const x = (canvas.width - scaledWidth) / 2 + pan.x;
    const y = (canvas.height - scaledHeight) / 2 + pan.y;

    // Draw image
    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

    // Draw selection box if selecting
    if (isSelecting && zoomBoxSelection) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        zoomBoxSelection.startX,
        zoomBoxSelection.startY,
        zoomBoxSelection.width,
        zoomBoxSelection.height
      );
      ctx.setLineDash([]);
    }
  }, [zoom, pan, image, isSelecting, zoomBoxSelection]);

  const handleMouseDown = (e) => {
    if (isSelecting) {
      const rect = canvasRef.current.getBoundingClientRect();
      setZoomBoxSelection({
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
        width: 0,
        height: 0
      });
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isSelecting && zoomBoxSelection) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      setZoomBoxSelection(prev => ({
        ...prev,
        width: currentX - prev.startX,
        height: currentY - prev.startY
      }));
    } else if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (direction) => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? prev + 0.5 : Math.max(1, prev - 0.5);
      return newZoom;
    });
  };

  const handleAnalyzeZoomArea = async () => {
    if (!zoomBoxSelection || (zoomBoxSelection.width === 0 && zoomBoxSelection.height === 0)) {
      toast.error('Markera ett område att analysera');
      return;
    }

    // Get the canvas and crop the selected area
    const canvas = canvasRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    
    const croppedCanvas = document.createElement('canvas');
    const padding = 20;
    
    const x = Math.min(zoomBoxSelection.startX, zoomBoxSelection.startX + zoomBoxSelection.width) - padding;
    const y = Math.min(zoomBoxSelection.startY, zoomBoxSelection.startY + zoomBoxSelection.height) - padding;
    const width = Math.abs(zoomBoxSelection.width) + padding * 2;
    const height = Math.abs(zoomBoxSelection.height) + padding * 2;

    croppedCanvas.width = width;
    croppedCanvas.height = height;
    const croppedCtx = croppedCanvas.getContext('2d');

    // Draw cropped area
    const imageData = canvas.getContext('2d').getImageData(x, y, width, height);
    croppedCtx.putImageData(imageData, 0, 0);

    const croppedImage = croppedCanvas.toDataURL('image/png');
    onAnalyzeZoomArea(croppedImage);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col h-full max-w-4xl mx-auto w-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-bold text-white">Zooma och läs detaljer</h2>
              <p className="text-sm text-slate-400 mt-1">
                {isSelecting 
                  ? 'Dra för att välja område att analysera' 
                  : 'Dra för att panorera, scrolla för att zooma'}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Canvas Container */}
          <div
            ref={containerRef}
            className="flex-1 relative overflow-hidden bg-black cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full"
            />

            {/* Zoom Info */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white px-3 py-2 rounded-lg text-sm font-mono">
              Zoom: {zoom.toFixed(1)}x
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 border-t border-white/10 space-y-3">
            {/* Zoom Controls */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleZoom('out')}
                disabled={zoom <= 1}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
              >
                <ZoomOut className="w-4 h-4 mr-2" />
                Zooma ut
              </Button>
              <Button
                onClick={() => handleZoom('in')}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
              >
                <ZoomIn className="w-4 h-4 mr-2" />
                Zooma in
              </Button>

              {/* Toggle Selection Mode */}
              <Button
                onClick={() => {
                  setIsSelecting(!isSelecting);
                  setZoomBoxSelection(null);
                }}
                variant={isSelecting ? "default" : "outline"}
                size="sm"
                className={isSelecting 
                  ? "bg-blue-600 hover:bg-blue-500" 
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-white"}
              >
                <Copy className="w-4 h-4 mr-2" />
                {isSelecting ? 'Avbryt markering' : 'Markera område'}
              </Button>
            </div>

            {/* Analyze Button */}
            {isSelecting && zoomBoxSelection && (zoomBoxSelection.width !== 0 || zoomBoxSelection.height !== 0) && (
              <Button
                onClick={handleAnalyzeZoomArea}
                className="w-full bg-blue-600 hover:bg-blue-500"
              >
                Analysera markerat område
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}