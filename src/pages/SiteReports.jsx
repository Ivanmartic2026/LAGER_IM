import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import PullToRefresh from "@/components/utils/PullToRefresh";
import BatchProcessingControl from "@/components/sitereports/BatchProcessingControl";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, Calendar, User, CheckCircle2, XCircle, 
  Loader2, ArrowLeft, Wrench, FileCheck, Search, History
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "sonner";
import SiteReportReview from "@/components/sitereports/SiteReportReview";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import SwipeableCard from "@/components/utils/SwipeableCard";
import { useIsMobile } from "@/components/utils/MobileOptimized";

export default function SiteReportsPage() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ['siteReports'],
    queryFn: () => base44.entities.SiteReport.list('-created_date')
  });

  useEffect(() => {
    const savedReportId = localStorage.getItem('selectedReportId');
    if (savedReportId && reports.length > 0) {
      const report = reports.find(r => r.id === savedReportId);
      if (report) {
        setSelectedReport(report);
        localStorage.removeItem('selectedReportId');
      }
    }
  }, [reports.length]);
  
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.site_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.technician_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <PullToRefresh onRefresh={async () => {
      await refetch();
      toast.success('Uppdaterad!');
    }}>
      <div className="min-h-screen bg-black p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Site-rapporter</h1>
              <p className="text-slate-400">Granska och matcha komponenter från site-besök</p>
            </div>
            <Link to={createPageUrl('SiteHistory')}>
              <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                <History className="w-4 h-4 mr-2" />
                Site-historik
              </Button>
            </Link>
          </div>
          
          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Sök på plats, adress eller tekniker..."
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
            >
              <option value="all">Alla status</option>
              <option value="pending_review">Väntar granskning</option>
              <option value="in_review">Granskas</option>
              <option value="completed">Klar</option>
              <option value="archived">Arkiverad</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <ListSkeleton count={5} />
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm || filterStatus !== 'all' ? 'Inga resultat' : 'Inga site-rapporter ännu'}
            </h3>
            <p className="text-white/50">
              {searchTerm || filterStatus !== 'all' 
                ? 'Försök med andra sökkriterier' 
                : 'Tekniker kan skapa rapporter via scan-läget'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report, index) => {
              const reportDate = format(new Date(report.report_date), "d MMM yyyy HH:mm", { locale: sv });
              
              const ReportCard = (
                <div className="p-5 md:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3 md:mb-2">
                        <h3 className="font-semibold text-white text-xl md:text-lg tracking-tight">
                          {report.site_name}
                        </h3>
                        <Badge className={statusColors[report.status]}>
                          {report.status === 'pending_review' ? 'Väntar granskning' :
                           report.status === 'in_review' ? 'Granskas' :
                           report.status === 'completed' ? 'Klar' : 'Arkiverad'}
                        </Badge>
                      </div>

                      <div className="space-y-2 md:space-y-1 text-base md:text-sm text-white/60">
                        {report.site_address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 md:w-4 md:h-4" />
                            <span>{report.site_address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 md:w-4 md:h-4" />
                          <span>{report.technician_name || report.technician_email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 md:w-4 md:h-4" />
                          <span>{reportDate}</span>
                        </div>
                      </div>

                      {report.notes && (
                        <p className="mt-3 md:mt-2 text-base md:text-sm text-white/50 line-clamp-2">
                          {report.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {report.status === 'completed' && (
                        <CheckCircle2 className="w-6 h-6 md:w-5 md:h-5 text-green-400" />
                      )}
                      {report.status === 'pending_review' && (
                        <Wrench className="w-6 h-6 md:w-5 md:h-5 text-amber-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
              
              return isMobile ? (
                <SwipeableCard
                  key={report.id}
                  onTap={() => setSelectedReport(report)}
                  onSwipeLeft={() => {
                    if (index < filteredReports.length - 1) {
                      setSelectedReport(filteredReports[index + 1]);
                    }
                  }}
                  onSwipeRight={() => {
                    if (index > 0) {
                      setSelectedReport(filteredReports[index - 1]);
                    }
                  }}
                >
                  {ReportCard}
                </SwipeableCard>
              ) : (
                <div 
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="cursor-pointer"
                >
                  {ReportCard}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </PullToRefresh>
  );
}