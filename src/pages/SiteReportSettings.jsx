import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import BatchProcessingControl from "@/components/sitereports/BatchProcessingControl";
import { ArrowLeft, Settings, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function SiteReportSettingsPage() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Redirect if not admin
  if (user && user.role !== 'admin') {
    window.location.href = createPageUrl('Home');
    return null;
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl('Admin')}>
            <Button variant="ghost" className="text-white/70 hover:text-white mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till Admin
            </Button>
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
              <Settings className="w-7 h-7 text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Site-rapport Inställningar</h1>
              <p className="text-slate-400">Konfigurera batch-bearbetning och automatisk matchning</p>
            </div>
          </motion.div>
        </div>

        {/* Batch Processing Control */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <BatchProcessingControl />
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Om Batch-bearbetning</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Batch-bearbetning gör det möjligt att automatiskt matcha komponenter från flera site-rapporter samtidigt. 
                AI:n analyserar bilderna och försöker hitta matchande artiklar i lagret. Matchningar med hög säkerhet 
                bekräftas automatiskt, medan osäkra matchningar skickas till manuell granskning.
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}