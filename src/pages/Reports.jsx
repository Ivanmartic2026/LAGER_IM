import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileText, Plus, Send, Trash2, Calendar, Mail,
  Clock, Play, CheckCircle2, TrendingUp, DollarSign, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReportConfiguration from "@/components/reports/ReportConfiguration";
import ReportPreview from "@/components/reports/ReportPreview";
import InventoryValuation from "@/components/reports/InventoryValuation";
import ArticleTurnover from "@/components/reports/ArticleTurnover";

const REPORT_TYPE_LABELS = {
  stock_summary: "Lagersaldo - Sammanfattning",
  stock_movements: "Lagerrörelser",
  low_stock: "Lågt lager - Varning",
  full_inventory: "Fullständig inventering"
};

const FREQUENCY_LABELS = {
  daily: "Dagligen",
  weekly: "Veckovis",
  monthly: "Månadsvis"
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("live");
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['report-schedules'],
    queryFn: () => base44.entities.ReportSchedule.list('-created_date'),
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data) => base44.entities.ReportSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      setConfigModalOpen(false);
      toast.success("Rapportschema skapat!");
    }
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id) => base44.entities.ReportSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success("Schema borttaget");
    }
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.ReportSchedule.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
    }
  });

  const handleGenerateNow = async (schedule) => {
    setGeneratingReport(schedule.id);
    try {
      const response = await base44.functions.invoke('generateReport', {
        report_type: schedule.report_type,
        filters: schedule.filters || {},
        date_range: schedule.date_range || {},
        email_recipients: schedule.email_recipients || []
      });

      if (response.data.success) {
        setPreviewReport(response.data.report);
        toast.success("Rapport genererad och skickad!");
        
        // Update last_sent
        await base44.entities.ReportSchedule.update(schedule.id, {
          last_sent: new Date().toISOString()
        });
        queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      } else {
        toast.error("Kunde inte generera rapport");
      }
    } catch (error) {
      console.error(error);
      toast.error("Fel vid rapportgenerering");
    } finally {
      setGeneratingReport(null);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">Rapporter</h1>
              <p className="text-white/50">Analys och schemalagda rapporter</p>
            </div>
            {activeTab === "scheduled" && (
              <Button
                onClick={() => setConfigModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nytt schema
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/5 backdrop-blur-xl border border-white/10">
              <TabsTrigger value="live" className="flex items-center gap-2 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                <TrendingUp className="w-4 h-4" />
                Live-rapporter
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="flex items-center gap-2 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                <Clock className="w-4 h-4" />
                Schemalagda
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="live" className="mt-6">
            <Tabs defaultValue="valuation">
              <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
                <TabsTrigger value="valuation" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Lagervärdering
                </TabsTrigger>
                <TabsTrigger value="turnover" className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Artikelomsättning
                </TabsTrigger>
              </TabsList>

              <TabsContent value="valuation">
                <InventoryValuation />
              </TabsContent>

              <TabsContent value="turnover">
                <ArticleTurnover />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="scheduled" className="mt-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{schedules.length}</p>
                    <p className="text-sm text-slate-400">Scheman</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {schedules.filter(s => s.is_active).length}
                    </p>
                    <p className="text-sm text-slate-400">Aktiva</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {schedules.filter(s => s.last_sent).length}
                    </p>
                    <p className="text-sm text-slate-400">Skickade</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedules List */}
            {isLoading ? (
              <div className="grid gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 rounded-2xl bg-slate-800/50 animate-pulse" />
                ))}
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Inga scheman ännu</h3>
                <p className="text-slate-400 mb-6">Skapa ditt första rapportschema för att komma igång</p>
                <Button
                  onClick={() => setConfigModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Skapa schema
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                <AnimatePresence>
                  {schedules.map((schedule) => (
                <motion.div
                  key={schedule.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    "p-5 rounded-2xl border transition-all",
                    schedule.is_active
                      ? "bg-slate-800/50 border-slate-700/50"
                      : "bg-slate-800/20 border-slate-700/20 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{schedule.name}</h3>
                        <Badge
                          className={cn(
                            "border",
                            schedule.is_active
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                          )}
                        >
                          {schedule.is_active ? "Aktiv" : "Pausad"}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm mb-3">
                        {REPORT_TYPE_LABELS[schedule.report_type]}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-4 h-4" />
                          {FREQUENCY_LABELS[schedule.frequency]}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Mail className="w-4 h-4" />
                          {schedule.email_recipients?.length || 0} mottagare
                        </div>
                        {schedule.last_sent && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Calendar className="w-4 h-4" />
                            Senast: {new Date(schedule.last_sent).toLocaleDateString('sv-SE')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleGenerateNow(schedule)}
                        disabled={generatingReport === schedule.id}
                        className="bg-blue-600 hover:bg-blue-500"
                      >
                        {generatingReport === schedule.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Genererar...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Skicka nu
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleScheduleMutation.mutate({
                          id: schedule.id,
                          is_active: !schedule.is_active
                        })}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                      >
                        {schedule.is_active ? "Pausa" : "Aktivera"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                        className="bg-slate-700 border-slate-600 hover:bg-red-900/50 hover:border-red-500/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {schedule.filters && Object.keys(schedule.filters).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <p className="text-xs text-slate-500 mb-1">Filter:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(schedule.filters).map(([key, value]) => (
                          value && (
                            <Badge key={key} variant="outline" className="bg-slate-700/30 text-slate-300 text-xs">
                              {key}: {value}
                            </Badge>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Configuration Modal */}
        <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Skapa rapportschema
              </DialogTitle>
            </DialogHeader>
            <ReportConfiguration
              onSave={(config) => createScheduleMutation.mutate(config)}
              onCancel={() => setConfigModalOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Preview Modal */}
        {previewReport && (
          <ReportPreview
            report={previewReport}
            onClose={() => setPreviewReport(null)}
          />
        )}
      </div>
    </div>
  );
}