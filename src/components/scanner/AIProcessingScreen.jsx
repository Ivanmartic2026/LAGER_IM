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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center z-50 overflow-hidden"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ 
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(ellipse at 20% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 40%), radial-gradient(ellipse at 80% 70%, rgba(139, 92, 246, 0.15) 0%, transparent 40%)',
            backgroundSize: '200% 200%',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
      </div>

      <div className="relative w-full max-w-md px-6">
        {/* Animated Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-10"
        >
          {/* Premium Icon with Glow */}
             <motion.div
               animate={{ 
                 rotate: 360,
                 scale: [1, 1.08, 1]
               }}
               transition={{ 
                 rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                 scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
               }}
               className="relative w-24 h-24 mx-auto mb-8"
             >
               {/* Outer glow pulse */}
               <motion.div
                 animate={{ scale: [1, 1.2, 1] }}
                 transition={{ duration: 2.5, repeat: Infinity }}
                 className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-400 opacity-30 blur-xl"
               />
               {/* Icon container */}
               <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-400 flex items-center justify-center shadow-2xl shadow-blue-500/60 backdrop-blur-xl">
                 <Sparkles className="w-12 h-12 text-white animate-pulse" />
               </div>
             </motion.div>
          
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
            AI Analyserar Bild
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Identifierar nummer, koder och produkttyp
          </p>
        </motion.div>

        {/* Premium Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-gradient-to-br from-white/8 via-white/4 to-white/2 border border-cyan-500/30 rounded-2xl p-8 backdrop-blur-2xl shadow-2xl shadow-cyan-500/20 mb-8"
        >
          {/* Progress Section */}
          <div className="mb-8">
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-white text-sm font-medium">Förlopp</span>
              <span className="text-cyan-400 text-lg font-bold font-mono">
                {Math.round(progress)}%
              </span>
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

          {/* Processing Steps */}
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
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all font-bold ${
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
                <span className={`text-sm font-medium transition-colors ${
                  idx <= currentStep ? 'text-white' : 'text-slate-500'
                }`}>
                  {step.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Animated Bottom Text */}
         <motion.div
           animate={{ opacity: [0.5, 1, 0.5] }}
           transition={{ duration: 2, repeat: Infinity }}
           className="text-center text-cyan-400/60 text-xs tracking-widest font-medium"
         >
           ✨ Analyserar innehål...
         </motion.div>
      </div>
    </motion.div>
  );
}