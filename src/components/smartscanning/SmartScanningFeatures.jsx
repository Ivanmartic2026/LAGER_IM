import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Package, Clipboard, Activity } from 'lucide-react';

export default function SmartScanningFeatures() {
  const features = [
    {
      icon: Package,
      title: 'Inleverans',
      description: 'Registrera ny artikel eller lägg till lager',
      color: 'blue',
      bgColor: 'bg-blue-500',
      glowColor: 'shadow-blue-500/40'
    },
    {
      icon: Clipboard,
      title: 'Inventering',
      description: 'Justera lagersaldo för befintlig artikel',
      color: 'emerald',
      bgColor: 'bg-emerald-500',
      glowColor: 'shadow-emerald-500/40'
    },
    {
      icon: Activity,
      title: 'Reparation',
      description: 'Skanna modul för reparation och skriv ut bekräftelse',
      color: 'red',
      bgColor: 'bg-red-500',
      glowColor: 'shadow-red-500/40'
    },
    {
      icon: Camera,
      title: 'Site-Dokumentation',
      description: 'Dokumentera komponenter på plats',
      color: 'cyan',
      bgColor: 'bg-cyan-500',
      glowColor: 'shadow-cyan-500/40'
    }
  ];

  return (
    <div className="py-12 px-4 md:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-16 h-16 rounded-3xl bg-blue-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/40"
        >
          <Camera className="w-8 h-8 text-white" />
        </motion.div>
        
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Smart Lagerskanning
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Fotografera en etikett och låt AI fylla i alla fält automatiskt
        </p>
      </motion.div>

      {/* Features Grid */}
      <div className="grid gap-4 max-w-3xl mx-auto">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <motion.button
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="w-full p-6 rounded-2xl backdrop-blur-xl border border-slate-700/50 bg-slate-900/30 hover:bg-slate-900/50 shadow-2xl transition-all text-left group"
              style={{ boxShadow: `0 0 30px rgba(${feature.color === 'blue' ? '59, 130, 246' : feature.color === 'emerald' ? '16, 185, 129' : feature.color === 'red' ? '239, 68, 68' : '34, 211, 238'}, 0.2)` }}
            >
              <div className="flex items-start gap-4">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`flex-shrink-0 w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center shadow-lg ${feature.glowColor}`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-lg group-hover:text-slate-100 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}