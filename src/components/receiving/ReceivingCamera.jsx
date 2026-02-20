import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReceivingCamera({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [showFlash, setShowFlash] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => setCameraReady(true);
        }
      } catch (error) {
        console.error('Kamera åtkomst nekad:', error);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 300);

      canvasRef.current.toBlob((blob) => {
        const file = new File([blob], `receiving-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCapturedImage({ file, dataUrl: canvasRef.current.toDataURL() });
      }, 'image/jpeg', 0.95);
    }
  };

  const retake = () => {
    setCapturedImage(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      <AnimatePresence mode="wait">
        {!capturedImage ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 relative flex items-center justify-center overflow-hidden"
          >
            {/* Camera Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Animated Focus Frame */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 0 0px rgba(34, 197, 94, 0.7)',
                    '0 0 0 40px rgba(34, 197, 94, 0)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-64 h-80 border-2 border-green-500 rounded-2xl"
              />
            </motion.div>

            {/* Corner Brackets */}
            <div className="absolute inset-0 pointer-events-none">
              {[
                'top-8 left-8',
                'top-8 right-8',
                'bottom-8 left-8',
                'bottom-8 right-8',
              ].map((pos, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className={`absolute w-6 h-6 ${pos} ${
                    i % 2 === 0 ? 'border-l-2 border-t-2' : 'border-r-2 border-t-2'
                  } ${i > 1 ? (i === 2 ? 'border-l-2 border-b-2' : 'border-r-2 border-b-2') : ''} border-green-400`}
                />
              ))}
            </div>

            {/* Flash Effect */}
            <AnimatePresence>
              {showFlash && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 bg-white z-40"
                />
              )}
            </AnimatePresence>

            {/* Instructions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 text-center"
            >
              <p className="text-white text-lg font-semibold mb-2">
                Fotografera paket eller etikett
              </p>
              <p className="text-slate-400 text-sm">
                Se till att allt är tydligt inom ramen
              </p>
            </motion.div>

            {/* Close Button */}
            <Button
              onClick={onClose}
              size="icon"
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm"
            >
              <X className="w-5 h-5 text-white" />
            </Button>

            {/* Capture Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-2xl shadow-green-500/50 flex items-center justify-center hover:from-green-400 hover:to-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-10 h-10 text-white" />
              </motion.button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-md"
            >
              <img src={capturedImage?.dataUrl} alt="Captured" className="w-full rounded-2xl" />
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50"
              >
                <CheckCircle2 className="w-10 h-10 text-white" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 flex gap-4"
            >
              <Button
                onClick={retake}
                variant="outline"
                className="bg-white/10 border-white/20 hover:bg-white/20 text-white px-8"
              >
                Fotografera igen
              </Button>
              <Button
                onClick={() => {
                  if (capturedImage?.file) {
                    onCapture(capturedImage.file);
                  }
                }}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white px-8 shadow-lg shadow-green-500/50"
              >
                Använd bild
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}