import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, AlertCircle, RefreshCw, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PROCESSING_STEPS = [
  { label: 'Laddar upp bild', duration: 2 },
  { label: 'Analyserar innehåll', duration: 3 },
  { label: 'Läser nummer & koder', duration: 3 },
  { label: 'Klassificerar produkt', duration: 2 },
  { label: 'Sparar resultat', duration: 1 }
];

export default function AIProcessingScreen({ progress = 0, error = null, onRetry, onManual }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [slowWarning, setSlowWarning] = useState(false);

  useEffect(() => {
    const step = Math.floor((progress / 100) * PROCESSING_STEPS.length);
    setCurrentStep(Math.min(step, PROCESSING_STEPS.length - 1));
  }, [progress]);

  // Show "tar längre tid" after 15s
  useEffect(() => {
    if (error) return;
    const timer = setTimeout(() => setSlowWarning(true), 15000);
    return () => clearTimeout(timer);
  }, [error]);

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center z-50 px-6"
      >
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">AI-analys misslyckades</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              {typeof error === 'string' ? error : 'Ett fel uppstod vid analys av bilden.'}
            </p>
          </div>
          <div className="space-y-3">
            {onRetry && (
              <Button onClick={onRetry} className="w-full bg-signal hover:bg-signal-hover h-12 text-base">
                <RefreshCw className="w-4 h-4 mr-2" />
                Försök igen
              </Button>
            )}
            {onManual && (
              <Button onClick={onManual} variant="outline"
                className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 h-12">
                <Edit3 className="w-4 h-4 mr-2" />
                Fyll i manuellt
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center z-50 overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(ellipse at 20% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 40%), radial-gradient(ellipse at 80% 70%, rgba(139, 92, 246, 0.15) 0%, transparent 40%)',
            backgroundSize: '200% 200%',
          }}
        />
      </div>

      <div className="relative w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.08, 1] }}
            transition={{
              rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
              scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            }}
            className="relative w-24 h-24 mx-auto mb-8"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-400 opacity-30 blur-xl"
            />
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-400 flex items-center justify-center shadow-2xl shadow-blue-500/60">
              <Sparkles className="w-12 h-12 text-white animate-pulse" />
            </div>
          </motion.div>

          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">AI Analyserar Bild</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Identifierar nummer, koder och produkttyp
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-gradient-to-br from-white/8 via-white/4 to-white/2 border border-cyan-500/30 rounded-2xl p-8 backdrop-blur-2xl shadow-2xl shadow-cyan-500/20 mb-8"
        >
          <div className="mb-8">
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-white text-sm font-medium">Förlopp</span>
              <span className="text-cyan-400 text-lg font-bold font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 shadow-2xl shadow-cyan-500/60 rounded-full"
              />
            </div>
          </div>

          <div className="space-y-3">
            {PROCESSING_STEPS.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="flex items-center gap-3"
              >
                <motion.div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${
                    idx < currentStep
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/50'
                      : idx === currentStep
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/50'
                      : 'bg-white/10'
                  }`}
                  animate={idx === currentStep ? { scale: [1, 1.15, 1] } : {}}
                  transition={idx === currentStep ? { duration: 1.5, repeat: Infinity } : {}}
                >
                  {idx < currentStep ? (
                    <span className="text-white text-xs">✓</span>
                  ) : idx === currentStep ? (
                    <Zap className="w-3.5 h-3.5 text-white" />
                  ) : null}
                </motion.div>
                <span className={`text-sm font-medium ${idx <= currentStep ? 'text-white' : 'text-slate-500'}`}>
                  {step.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Slow warning */}
        {slowWarning ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <p className="text-amber-400 text-sm">⏳ Tar längre tid än vanligt...</p>
            {onManual && (
              <button
                onClick={onManual}
                className="text-slate-400 hover:text-white text-xs underline underline-offset-2 transition-colors"
              >
                Fyll i manuellt istället
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-center text-cyan-400/60 text-xs tracking-widest font-medium"
          >
            ✨ Analyserar innehåll...
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}