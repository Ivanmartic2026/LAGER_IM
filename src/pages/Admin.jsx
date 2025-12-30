import React from 'react';
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Settings, Users, TrendingUp, FileText, Calendar,
  ArrowRight, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const adminSections = [
    {
      name: "Suppliers",
      label: "Leverantörer",
      description: "Hantera leverantörer och kontakter",
      icon: Users,
      color: "from-blue-600 to-blue-700",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400"
    },
    {
      name: "Movements",
      label: "Rörelser",
      description: "Se alla lagerrörelser och historik",
      icon: Activity,
      color: "from-emerald-600 to-emerald-700",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-400"
    },
    {
      name: "Analytics",
      label: "Analys",
      description: "Statistik och rapporter",
      icon: TrendingUp,
      color: "from-purple-600 to-purple-700",
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-400"
    },
    {
      name: "Reports",
      label: "Schemalagda",
      description: "Automatiska rapporter och schema",
      icon: Calendar,
      color: "from-amber-600 to-amber-700",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
              <Settings className="w-6 h-6 text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Administration</h1>
              <p className="text-sm text-slate-400">Hantera system och rapporter</p>
            </div>
          </div>
        </motion.div>

        {/* Admin Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {adminSections.map((section, index) => (
            <Link 
              key={section.name}
              to={createPageUrl(section.name)}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all p-6 cursor-pointer"
              >
                {/* Gradient Background Effect */}
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity",
                  `bg-gradient-to-br ${section.color}`
                )} />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center", section.iconBg)}>
                      <section.icon className={cn("w-7 h-7", section.iconColor)} />
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {section.label}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {section.description}
                  </p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-6 rounded-2xl bg-slate-800/30 border border-slate-700/30"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Om Administration</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Här hittar du alla administrativa funktioner för systemet. Hantera leverantörer, 
                se lagerrörelser, analysera data och konfigurera automatiska rapporter.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}