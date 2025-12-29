import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Button } from "@/components/ui/button";
import { Camera, X, Maximize2, Minimize2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function BarcodeScanner({ onBarcodeDetected, onClose }) {
  const videoRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const readerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const startScanning = async () => {
      try {
        setIsScanning(true);
        const videoInputDevices = await reader.listVideoInputDevices();
        
        if (videoInputDevices.length === 0) {
          throw new Error('Ingen kamera hittades');
        }

        // Prefer back camera on mobile
        const selectedDevice = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        ) || videoInputDevices[0];

        await reader.decodeFromVideoDevice(
          selectedDevice.deviceId,
          videoRef.current,
          (result, error) => {
            if (!isMounted) return;
            
            if (result) {
              const code = result.getText();
              // Prevent duplicate scans within 2 seconds
              if (code !== lastScan) {
                setLastScan(code);
                onBarcodeDetected(code, result.getBarcodeFormat());
                
                // Reset after 2 seconds to allow rescanning
                setTimeout(() => {
                  if (isMounted) setLastScan(null);
                }, 2000);
              }
            }
          }
        );
      } catch (err) {
        console.error('Scanner error:', err);
        setError(err.message);
        setIsScanning(false);
      }
    };

    startScanning();

    return () => {
      isMounted = false;
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, [onBarcodeDetected, lastScan]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-3">
          <X className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-white font-semibold mb-2">Kunde inte starta kameran</h3>
        <p className="text-red-300 text-sm mb-4">{error}</p>
        <Button onClick={onClose} variant="outline" className="bg-slate-800 border-slate-600 text-white">
          Stäng
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative rounded-2xl overflow-hidden bg-black",
        isFullscreen && "rounded-none"
      )}
    >
      {/* Video Feed */}
      <video
        ref={videoRef}
        className="w-full h-auto max-h-[500px] object-cover"
        playsInline
        muted
      />

      {/* Scanning Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Scanning Line Animation */}
        <motion.div
          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
          animate={{
            top: ['20%', '80%', '20%']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Corner Brackets */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="relative w-full max-w-sm aspect-square">
            {/* Top Left */}
            <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-blue-400 rounded-tl-xl" />
            {/* Top Right */}
            <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-blue-400 rounded-tr-xl" />
            {/* Bottom Left */}
            <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-blue-400 rounded-bl-xl" />
            {/* Bottom Right */}
            <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-blue-400 rounded-bl-xl" />
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-center">
          <p className="text-white font-medium mb-1">Rikta kameran mot streckkoden</p>
          <p className="text-slate-300 text-sm">QR-koder, EAN, Code128 och fler format stöds</p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10 pointer-events-auto">
        <Button
          size="icon"
          variant="secondary"
          onClick={toggleFullscreen}
          className="bg-slate-900/80 hover:bg-slate-800 backdrop-blur-sm border border-slate-700"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={onClose}
          className="bg-slate-900/80 hover:bg-slate-800 backdrop-blur-sm border border-slate-700"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Scanning Status */}
      {isScanning && (
        <div className="absolute top-4 left-4 z-10">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-700">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-white text-sm font-medium">Skannar...</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}