import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Play, Loader2, CheckCircle2, AlertCircle, 
  Zap, Clock, Database, Settings
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function BatchProcessingControl() {
  const [selectedReports, setSelectedReports] = useState([]);
  const [autoConfirmThreshold, setAutoConfirmThreshold] = useState(0.85);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const queryClient = useQueryClient();

  const { data: pendingReports = [] } = useQuery({
    queryKey: ['pendingReports'],
    queryFn: async () => {
      const reports = await base44.entities.SiteReport.filter({ 
        status: 'pending_review' 
      }, '-created_date');
      
      // Räkna pending bilder per rapport
      const reportsWithCounts = await Promise.all(
        reports.map(async (report) => {
          const images = await base44.entities.SiteReportImage.filter({
            site_report_id: report.id,
            match_status: 'pending'
          });
          return { ...report, pending_images: images.length };
        })
      );
      
      return reportsWithCounts.filter(r => r.pending_images > 0);
    }
  });

  const batchProcessMutation = useMutation({
    mutationFn: async (reportIds) => {
      const response = await base44.functions.invoke('batchMatchSiteImages', {
        site_report_ids: reportIds,
        auto_confirm_threshold: autoConfirmThreshold
      });
      return response.data;
    },
    onSuccess: (data) => {
      setProgress(data);
      toast.success(
        `Bearbetning klar! ${data.auto_confirmed} auto-bekräftade, ${data.needs_review} kräver granskning.`
      );
      queryClient.invalidateQueries({ queryKey: ['pendingReports'] });
      queryClient.invalidateQueries({ queryKey: ['siteReports'] });
      setSelectedReports([]);
    },
    onError: (error) => {
      toast.error('Batch-bearbetning misslyckades: ' + error.message);
    }
  });

  const handleSelectAll = () => {
    if (selectedReports.length === pendingReports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(pendingReports.map(r => r.id));
    }
  };

  const handleToggleReport = (reportId) => {
    if (selectedReports.includes(reportId)) {
      setSelectedReports(selectedReports.filter(id => id !== reportId));
    } else {
      setSelectedReports([...selectedReports, reportId]);
    }
  };

  const handleStartBatch = async () => {
    if (selectedReports.length === 0) {
      toast.error('Välj minst en rapport att bearbeta');
      return;
    }

    setProcessing(true);
    setProgress(null);
    setProcessingProgress(0);
    
    // Simulera progress under bearbetning
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95; // Stannar på 95% tills backend svarar
        }
        return prev + 5;
      });
    }, 200);
    
    try {
      await batchProcessMutation.mutateAsync(selectedReports);
      setProcessingProgress(100);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setProcessing(false);
        setProcessingProgress(0);
      }, 500);
    }
  };

  const totalPendingImages = pendingReports.reduce((sum, r) => sum + r.pending_images, 0);
  const selectedPendingImages = pendingReports
    .filter(r => selectedReports.includes(r.id))
    .reduce((sum, r) => sum + r.pending_images, 0);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="w-6 h-6 text-blue-400" />
              Batch-bearbetning
            </h2>
            <p className="text-white/60 text-sm">
              Bearbeta flera rapporter samtidigt för snabbare granskning
            </p>
          </div>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-lg px-4 py-2">
            {totalPendingImages} bilder väntar
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-2xl font-bold text-white mb-1">{pendingReports.length}</div>
            <div className="text-xs text-white/50">Rapporter</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-2xl font-bold text-white mb-1">{selectedReports.length}</div>
            <div className="text-xs text-white/50">Valda</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-2xl font-bold text-white mb-1">{selectedPendingImages}</div>
            <div className="text-xs text-white/50">Bilder att bearbeta</div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <Settings className="w-5 h-5 text-white/70" />
          <h3 className="font-semibold text-white">Inställningar</h3>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-white/70">
            Auto-bekräfta matchningar med säkerhet över:
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.7"
              max="0.95"
              step="0.05"
              value={autoConfirmThreshold}
              onChange={(e) => setAutoConfirmThreshold(parseFloat(e.target.value))}
              className="flex-1"
            />
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 min-w-[60px] justify-center">
              {Math.round(autoConfirmThreshold * 100)}%
            </Badge>
          </div>
          <p className="text-xs text-white/40">
            Högre värde = färre auto-bekräftade, men högre säkerhet
          </p>
        </div>
      </div>

      {/* Progress Display */}
      {progress && (
        <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            <h3 className="font-semibold text-white">Batch-bearbetning klar</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-xl font-bold text-white">{progress.total_images}</div>
              <div className="text-xs text-white/50">Bilder totalt</div>
            </div>
            <div className="p-3 rounded-lg bg-green-500/20">
              <div className="text-xl font-bold text-green-400">{progress.auto_confirmed}</div>
              <div className="text-xs text-green-400/70">Auto-bekräftade</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/20">
              <div className="text-xl font-bold text-amber-400">{progress.needs_review}</div>
              <div className="text-xs text-amber-400/70">Kräver granskning</div>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-xl font-bold text-white">{progress.processing_speed_images_per_sec}</div>
              <div className="text-xs text-white/50">Bilder/sek</div>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-white/5 flex items-center gap-2 text-sm text-white/70">
            <Clock className="w-4 h-4" />
            Bearbetningstid: {(progress.processing_time_ms / 1000).toFixed(1)} sekunder
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">Välj rapporter att bearbeta</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSelectAll}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            {selectedReports.length === pendingReports.length ? 'Avmarkera alla' : 'Markera alla'}
          </Button>
        </div>

        {pendingReports.length === 0 ? (
          <div className="text-center py-12 text-white/50">
            Inga rapporter väntar på bearbetning
          </div>
        ) : (
          pendingReports.map((report) => (
            <div
              key={report.id}
              onClick={() => handleToggleReport(report.id)}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer",
                selectedReports.includes(report.id)
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedReports.includes(report.id)}
                  onCheckedChange={() => handleToggleReport(report.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-white mb-1">{report.site_name}</div>
                  <div className="text-sm text-white/60">
                    {report.technician_name} • {new Date(report.report_date).toLocaleDateString('sv-SE')}
                  </div>
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  {report.pending_images} bilder
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Button */}
      <div className="space-y-3">
        <Button
          onClick={handleStartBatch}
          disabled={selectedReports.length === 0 || processing}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white h-12 text-base"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Bearbetar {selectedPendingImages} bilder...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Starta batch-bearbetning ({selectedPendingImages} bilder)
            </>
          )}
        </Button>

        {/* Progress Bar */}
        {processing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Bearbetning pågår...</span>
              <span className="text-white font-semibold">{processingProgress}%</span>
            </div>
            <Progress value={processingProgress} className="h-2" />
          </div>
        )}
      </div>
    </div>
  );
}