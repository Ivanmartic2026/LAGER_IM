import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap } from 'lucide-react';

const PROCESSING_STEPS = [
  { label: 'Laddar upp bild', duration: 2 },
  { label: 'Analyserar innehål', duration: 3 },
  { label: 'Läser nummer & koder', duration: 3 },
  { label: 'Klassificerar produkt', duration: 2 },
  { label: 'Sparar resultat', duration: 1 }
];

export default function AIProcessingScreen({ progress = 0 }) {
  const [currentStep, setCurrentStep] = useState(0);
  
  useEffect(() => {
    // Update current step based on progress
    const step = Math.floor((progress / 100) * PROCESSING_STEPS.length);
    setCurrentStep(Math.min(step, PROCESSING_STEPS.length - 1));
  }, [progress]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center z-40">
      <div className="w-full max-w-md px-6">
        {/* Animated Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            AI Analyserar Bild
          </h2>
          <p className="text-slate-400 text-sm">
            Identifierar nummer, koder och produkttyp
          </p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500"
            />
          </div>
          <div className="mt-3 text-right text-slate-400 text-sm font-mono">
            {Math.round(progress)}%
          </div>
        </div>

        {/* Processing Steps */}
        <div className="space-y-3 mb-8">
          {PROCESSING_STEPS.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: idx <= currentStep ? 1 : 0.3, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                idx < currentStep 
                  ? 'bg-emerald-500' 
                  : idx === currentStep 
                  ? 'bg-blue-500'
                  : 'bg-slate-700'
              }`}>
                {idx < currentStep ? (
                  <span className="text-white text-xs font-bold">✓</span>
                ) : idx === currentStep ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Zap className="w-3 h-3 text-white" />
                  </motion.div>
                ) : null}
              </div>
              <span className={`text-sm transition-colors ${
                idx <= currentStep ? 'text-white' : 'text-slate-500'
              }`}>
                {step.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Animated Bottom Text */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-center text-slate-400 text-xs"
        >
          Vänta medan AI analyserar bilden...
        </motion.div>
      </div>

      {/* Background Animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ 
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
            backgroundSize: '200% 200%',
          }}
        />
      </div>
    </div>
  );
}