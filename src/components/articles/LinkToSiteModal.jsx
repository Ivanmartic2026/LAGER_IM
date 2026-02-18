import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { MapPin, Search, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

export default function LinkToSiteModal({ isOpen, onClose, article }) {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: siteReports = [], isLoading } = useQuery({
    queryKey: ['allSiteReports'],
    queryFn: () => base44.entities.SiteReport.list('-report_date', 100),
    enabled: isOpen,
  });

  const createSiteImageMutation = useMutation({
    mutationFn: (data) => base44.entities.SiteReportImage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteReportImages'] });
      toast.success("Artikel kopplad till installation");
      onClose();
    },
    onError: (error) => {
      toast.error("Kunde inte koppla artikel: " + error.message);
    }
  });

  const handleLinkToSite = async (siteReport) => {
    await createSiteImageMutation.mutateAsync({
      site_report_id: siteReport.id,
      image_url: article.image_urls?.[0] || "https://via.placeholder.com/400x300?text=No+Image",
      image_description: `Manuellt kopplad: ${article.name}`,
      matched_article_id: article.id,
      match_status: "confirmed",
      match_confidence: 1.0,
      component_status: "documented"
    });
  };

  const filteredReports = siteReports.filter(report => 
    !searchQuery || 
    report.site_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.site_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.technician_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">Koppla till installation</DialogTitle>
          <p className="text-sm text-slate-400">
            Välj en befintlig installation att koppla {article.name} till
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Sök installation, adress eller tekniker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">
                  {searchQuery ? "Inga installationer matchade din sökning" : "Inga installationer hittades"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {filteredReports.map((report) => (
                  <motion.button
                    key={report.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleLinkToSite(report)}
                    disabled={createSiteImageMutation.isPending}
                    className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all text-left disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white mb-1">{report.site_name}</h4>
                        {report.site_address && (
                          <p className="text-sm text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{report.site_address}</span>
                          </p>
                        )}
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex-shrink-0">
                        {report.status === 'pending_review' ? 'Väntar' :
                         report.status === 'in_review' ? 'Granskas' :
                         report.status === 'completed' ? 'Klar' : 'Arkiverad'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(report.report_date), "d MMM yyyy", { locale: sv })}
                      </span>
                      {report.technician_name && (
                        <>
                          <span>•</span>
                          <span>{report.technician_name}</span>
                        </>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              Avbryt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}