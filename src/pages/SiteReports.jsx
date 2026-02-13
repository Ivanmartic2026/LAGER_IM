import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, Calendar, User, CheckCircle2, XCircle, 
  Loader2, ArrowLeft, Wrench, FileCheck
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "sonner";
import SiteReportReview from "@/components/sitereports/SiteReportReview";

export default function SiteReportsPage() {
  const [selectedReport, setSelectedReport] = useState(null);
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['siteReports'],
    queryFn: () => base44.entities.SiteReport.list('-created_date')
  });

  const statusColors = {
    pending_review: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    in_review: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    archived: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  };

  if (selectedReport) {
    return (
      <SiteReportReview 
        report={selectedReport}
        onBack={() => {
          setSelectedReport(null);
          queryClient.invalidateQueries({ queryKey: ['siteReports'] });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Site-rapporter</h1>
          <p className="text-slate-400">Granska och matcha komponenter från site-besök</p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Inga site-rapporter ännu</h3>
            <p className="text-white/50">Tekniker kan skapa rapporter via scan-läget</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => {
              const reportDate = format(new Date(report.report_date), "d MMM yyyy HH:mm", { locale: sv });
              
              return (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white text-lg tracking-tight">
                          {report.site_name}
                        </h3>
                        <Badge className={statusColors[report.status]}>
                          {report.status === 'pending_review' ? 'Väntar granskning' :
                           report.status === 'in_review' ? 'Granskas' :
                           report.status === 'completed' ? 'Klar' : 'Arkiverad'}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-white/60">
                        {report.site_address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{report.site_address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{report.technician_name || report.technician_email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{reportDate}</span>
                        </div>
                      </div>

                      {report.notes && (
                        <p className="mt-2 text-sm text-white/50 line-clamp-2">
                          {report.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {report.status === 'completed' && (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      )}
                      {report.status === 'pending_review' && (
                        <Wrench className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}