import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, Calendar, Package, Wrench, Search, 
  ArrowRight, History, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SiteHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['siteReports'],
    queryFn: () => base44.entities.SiteReport.list('-report_date')
  });

  const { data: images = [] } = useQuery({
    queryKey: ['siteReportImages'],
    queryFn: () => base44.entities.SiteReportImage.list()
  });

  // Gruppera rapporter per site
  const siteGroups = {};
  reports.forEach(report => {
    const siteName = report.site_name.toLowerCase();
    if (!siteGroups[siteName]) {
      siteGroups[siteName] = {
        site_name: report.site_name,
        site_address: report.site_address,
        reports: [],
        total_visits: 0,
        last_visit: null,
        parts_replaced_count: 0
      };
    }
    siteGroups[siteName].reports.push(report);
    siteGroups[siteName].total_visits += 1;
    
    if (!siteGroups[siteName].last_visit || new Date(report.report_date) > new Date(siteGroups[siteName].last_visit)) {
      siteGroups[siteName].last_visit = report.report_date;
    }
    
    if (report.parts_replaced && report.parts_replaced.length > 0) {
      siteGroups[siteName].parts_replaced_count += report.parts_replaced.length;
    }
  });

  const sites = Object.values(siteGroups);
  
  const filteredSites = sites.filter(site =>
    site.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.site_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Site-historik</h1>
          <p className="text-slate-400">Se alla site-besök och servicehistorik per plats</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Sök på platsnamn eller adress..."
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>

        {/* Sites List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm ? 'Inga resultat' : 'Inga site-besök ännu'}
            </h3>
            <p className="text-white/50">
              {searchTerm ? 'Försök med en annan sökterm' : 'Site-besök kommer att visas här'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSites.map(site => (
              <SiteCard key={site.site_name} site={site} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SiteCard({ site }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all">
      <div 
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{site.site_name}</h3>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                {site.total_visits} besök
              </Badge>
            </div>
            {site.site_address && (
              <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
                <MapPin className="w-4 h-4" />
                <span>{site.site_address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Calendar className="w-4 h-4" />
              <span>Senaste besök: {format(new Date(site.last_visit), "d MMM yyyy", { locale: sv })}</span>
            </div>
          </div>

          <div className="text-right">
            {site.parts_replaced_count > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-400 mb-2">
                <Wrench className="w-4 h-4" />
                <span>{site.parts_replaced_count} delar bytta</span>
              </div>
            )}
            <ArrowRight className={`w-5 h-5 text-white/40 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="pt-4 border-t border-white/10 space-y-3">
          <h4 className="font-medium text-white flex items-center gap-2 mb-3">
            <History className="w-4 h-4" />
            Besökshistorik
          </h4>
          {site.reports.map(report => (
            <Link
              key={report.id}
              to={createPageUrl('SiteReports')}
              onClick={() => localStorage.setItem('selectedReportId', report.id)}
            >
              <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white mb-1">
                      {format(new Date(report.report_date), "d MMMM yyyy HH:mm", { locale: sv })}
                    </div>
                    <div className="text-xs text-white/50">
                      Tekniker: {report.technician_name || report.technician_email}
                    </div>
                    {report.problem_description && (
                      <div className="text-xs text-white/60 mt-2 flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{report.problem_description}</span>
                      </div>
                    )}
                    {report.parts_replaced && report.parts_replaced.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {report.parts_replaced.map((part, idx) => (
                          <div key={idx} className="text-xs text-cyan-400 flex items-center gap-2">
                            <Package className="w-3 h-3" />
                            <span>{part.article_name} (Batch: {part.batch_number}) - {part.quantity}st</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge className={
                    report.status === 'completed' 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }>
                    {report.status === 'completed' ? 'Klar' : 'Pågående'}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}