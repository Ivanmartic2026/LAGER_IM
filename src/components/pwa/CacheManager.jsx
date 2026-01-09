import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { offlineStorage } from "@/components/utils/offlineStorage";
import { syncQueue } from "@/components/utils/syncQueue";
import { Database, Trash2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function CacheManager() {
  const [cacheInfo, setCacheInfo] = React.useState([]);
  const [syncStatus, setSyncStatus] = React.useState(null);

  const refreshInfo = () => {
    setCacheInfo(offlineStorage.getCacheInfo());
    setSyncStatus(syncQueue.getStatus());
  };

  React.useEffect(() => {
    refreshInfo();
    const interval = setInterval(refreshInfo, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = (name) => {
    offlineStorage.clear(name.toLowerCase());
    toast.success(`Cache för ${name} rensad`);
    refreshInfo();
  };

  const handleClearAll = () => {
    if (confirm('Är du säker på att du vill rensa all cachad data?')) {
      offlineStorage.clearAll();
      syncQueue.clearAll();
      toast.success('All cache rensad');
      refreshInfo();
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Sync Status */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <RefreshCw className="w-5 h-5" />
            Synkroniseringskö
          </CardTitle>
          <CardDescription className="text-slate-400">
            Ändringar som väntar på att synkas när du är online
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/50">
              <div className="text-2xl font-bold text-white">{syncStatus?.pending || 0}</div>
              <div className="text-sm text-slate-400">Väntande</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50">
              <div className="text-2xl font-bold text-green-400">{syncStatus?.completed || 0}</div>
              <div className="text-sm text-slate-400">Slutförda</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50">
              <div className="text-2xl font-bold text-red-400">{syncStatus?.failed || 0}</div>
              <div className="text-sm text-slate-400">Misslyckade</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50">
              <div className="text-2xl font-bold text-blue-400">{syncStatus?.total || 0}</div>
              <div className="text-sm text-slate-400">Totalt</div>
            </div>
          </div>

          {syncStatus?.pending > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-sm text-blue-300">
                {syncStatus.pending} ändringar synkas automatiskt när du är online
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cache Status */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Database className="w-5 h-5" />
                Cachad data
              </CardTitle>
              <CardDescription className="text-slate-400">
                Offline-tillgänglig data för snabbare laddning
              </CardDescription>
            </div>
            <Button
              onClick={handleClearAll}
              variant="outline"
              size="sm"
              className="bg-red-500/20 border-red-500/30 text-white hover:bg-red-500/30"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Rensa allt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cacheInfo.map((cache) => (
              <div
                key={cache.name}
                className="p-4 rounded-lg bg-slate-800/50 border border-slate-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{cache.name}</h3>
                      {cache.isValid ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Giltig
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Gammal
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-400">
                      {cache.count} poster • {formatSize(cache.size)}
                    </div>
                    {cache.lastSync && (
                      <div className="text-xs text-slate-500 mt-1">
                        Senast synkat: {format(cache.lastSync, "d MMM yyyy HH:mm", { locale: sv })}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => handleClearCache(cache.name)}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}