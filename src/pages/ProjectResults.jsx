import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProjectResults() {
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['projectFinancials'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getProjectFinancials', {});
      return response.data;
    }
  });

  const toggleProject = (projectNumber) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectNumber)) {
      newExpanded.delete(projectNumber);
    } else {
      newExpanded.add(projectNumber);
    }
    setExpandedProjects(newExpanded);
  };

  const formatKr = (amount) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const projects = data?.projects || [];
  const totalRevenue = projects.reduce((sum, p) => sum + p.revenue, 0);
  const totalCosts = projects.reduce((sum, p) => sum + p.costs, 0);
  const totalResult = totalRevenue - totalCosts;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Projektresultat</h1>
        <Button
          onClick={() => refetch()}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Hämtar...' : 'Hämta från Fortnox'}
        </Button>
      </div>

      {isLoading && projects.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-900">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Projektnummer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Projektnamn</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-green-600">Intäkter</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-red-600">Kostnader</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Resultat</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <React.Fragment key={project.projectNumber}>
                    <tr className="border-b hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{project.projectNumber}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{project.projectName}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{formatKr(project.revenue)}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">{formatKr(project.costs)}</td>
                      <td className={cn(
                        'px-4 py-3 text-sm text-right font-medium',
                        project.result >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {formatKr(project.result)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleProject(project.projectNumber)}
                          className="text-slate-500 hover:text-foreground transition-colors"
                        >
                          {expandedProjects.has(project.projectNumber) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {expandedProjects.has(project.projectNumber) && (
                      <tr className="bg-slate-50 dark:bg-slate-900">
                        <td colSpan="6" className="px-4 py-4">
                          <div className="space-y-4">
                            {project.customerInvoices.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm text-green-600 mb-2">Kundfakturor</h4>
                                <div className="space-y-1 text-sm">
                                  {project.customerInvoices.map((inv, idx) => (
                                    <div key={idx} className="flex justify-between text-slate-600">
                                      <span>{inv.invoiceNumber} ({inv.date})</span>
                                      <span className="text-green-600">{formatKr(inv.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {project.supplierInvoices.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm text-red-600 mb-2">Leverantörsfakturor</h4>
                                <div className="space-y-1 text-sm">
                                  {project.supplierInvoices.map((inv, idx) => (
                                    <div key={idx} className="flex justify-between text-slate-600">
                                      <span>{inv.invoiceNumber} ({inv.date})</span>
                                      <span className="text-red-600">{formatKr(inv.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {project.customerInvoices.length === 0 && project.supplierInvoices.length === 0 && (
                              <p className="text-sm text-slate-500">Inga fakturor för denna projekt</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}

                {/* Totals row */}
                {projects.length > 0 && (
                  <tr className="bg-slate-100 dark:bg-slate-800 font-semibold">
                    <td colSpan="2" className="px-4 py-3 text-sm">Totalt</td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">{formatKr(totalRevenue)}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">{formatKr(totalCosts)}</td>
                    <td className={cn(
                      'px-4 py-3 text-sm text-right',
                      totalResult >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {formatKr(totalResult)}
                    </td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {projects.length === 0 && !isLoading && (
            <div className="px-4 py-8 text-center text-slate-500">
              Inga projekt med ekonomi hittades
            </div>
          )}
        </Card>
      )}
    </div>
  );
}