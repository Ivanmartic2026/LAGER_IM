import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { WifiOff, Wifi, RefreshCw, Database } from "lucide-react";
import { offlineStorage } from "@/components/utils/offlineStorage";
import { syncQueue } from "@/components/utils/syncQueue";
import { motion, AnimatePresence } from "framer-motion";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState(null);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      syncQueue.processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update sync status periodically
    const interval = setInterval(() => {
      setSyncStatus(syncQueue.getStatus());
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (!showStatus && isOnline && (!syncStatus || syncStatus.pending === 0)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 right-4 z-50"
      >
        {!isOnline ? (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 backdrop-blur-xl shadow-lg">
            <WifiOff className="w-3 h-3 mr-1" />
            Offline-läge
            <Database className="w-3 h-3 ml-1" />
          </Badge>
        ) : syncStatus?.pending > 0 ? (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 backdrop-blur-xl shadow-lg">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Synkar {syncStatus.pending} ändringar
          </Badge>
        ) : (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 backdrop-blur-xl shadow-lg">
            <Wifi className="w-3 h-3 mr-1" />
            Online
          </Badge>
        )}
      </motion.div>
    </AnimatePresence>
  );
}