import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Shows a native install prompt banner for Android/Chrome.
 * On iOS, shows manual instructions instead.
 */
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isInStandaloneMode = () =>
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (isInStandaloneMode()) return;
    // Don't show if dismissed recently
    const lastDismissed = localStorage.getItem('pwa-install-dismissed');
    if (lastDismissed && Date.now() - Number(lastDismissed) < 7 * 24 * 60 * 60 * 1000) return;

    setIsIOSDevice(isIOS());

    if (isIOS()) {
      // Show iOS instructions after a short delay
      setTimeout(() => setShow(true), 3000);
    } else {
      // Show when browser fires installable event
      const handleInstallable = () => setTimeout(() => setShow(true), 2000);
      window.addEventListener('pwa-installable', handleInstallable);
      // Also check if prompt already captured
      if (window.installPrompt) handleInstallable();
      return () => window.removeEventListener('pwa-installable', handleInstallable);
    }
  }, []);

  const handleInstall = async () => {
    if (!window.installPrompt) return;
    window.installPrompt.prompt();
    const { outcome } = await window.installPrompt.userChoice;
    if (outcome === 'accepted') {
      window.installPrompt = null;
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', String(Date.now()));
  };

  if (!show || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed bottom-24 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80"
      >
        <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Installera IMvision</p>
              {isIOSDevice ? (
                <p className="text-xs text-white/50 mt-1">
                  Tryck på <span className="text-white/80">dela-ikonen</span> längst ner och välj <span className="text-white/80">"Lägg till på hemskärmen"</span>
                </p>
              ) : (
                <p className="text-xs text-white/50 mt-1">
                  Lägg till på hemskärmen för snabbare åtkomst och app-känsla
                </p>
              )}
            </div>
          </div>

          {!isIOSDevice && (
            <Button
              onClick={handleInstall}
              size="sm"
              className="w-full mt-3 bg-blue-600 hover:bg-blue-500 gap-2"
            >
              <Download className="w-4 h-4" />
              Installera app
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}