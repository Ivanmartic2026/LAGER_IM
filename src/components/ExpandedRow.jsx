import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const fmtNum = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 });

import LoggaTidModal from './LoggaTidModal';

function InvoiceStatusBadge({ inv }) {
  const TODAY = new Date();
  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < TODAY;
  if (inv.isPaid) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">Betald</span>;
  if (!inv.isPaid && isOverdue(inv.dueDate)) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">Förfallen</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">Obetald</span>;
}

export default function ExpandedRow({ project, onInvoiceClick }) {
  const { data: timeEntries = [], refetch: refetchTime } = useQuery({
    queryKey: ['projectTime', project.projectNumber],
    queryFn: async () => {
      const res = await base44.entities.ProjectTime.filter({ projectNumber: project.projectNumber });
      return res || [];
    }
  });
  const [showTimeLog, setShowTimeLog] = useState(false);

  return (
    <tr>
      <td colSpan={11} className="bg-white/[0.02] border-b border-white/5 px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer invoices */}
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Kundfakturor</p>
            {project.customerInvoices.length ? (
              <table className="w-full text-xs">
                <thead><tr className="text-white/30 border-b border-white/10">
                  <th className="text-left py-1">Nr</th>
                  <th className="text-left py-1">Kund</th>
                  <th className="text-left py-1">Datum</th>
                  <th className="text-left py-1">Förfaller</th>
                  <th className="text-right py-1">Belopp</th>
                  <th className="text-right py-1">Återstår</th>
                  <th className="text-left py-1 pl-2">Status</th>
                </tr></thead>
                <tbody>
                  {project.customerInvoices.map((inv, i) => (
                    <tr key={i} onClick={() => onInvoiceClick(inv, 'customer', project)} className="border-b border-white/5 text-white/70 cursor-pointer hover:bg-white/5 transition-colors">
                      <td className="py-1.5 font-mono">{inv.invoiceNumber}</td>
                      <td className="py-1.5 truncate max-w-[90px]">{inv.customerName}</td>
                      <td className="py-1.5">{inv.invoiceDate}</td>
                      <td className="py-1.5">{inv.dueDate}</td>
                      <td className="py-1.5 text-right text-green-400/80">{fmtNum(inv.total)}</td>
                      <td className="py-1.5 text-right">{fmtNum(inv.balance)}</td>
                      <td className="py-1.5 pl-2"><InvoiceStatusBadge inv={inv} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-white/25 italic text-xs">Inga fakturor</p>}
          </div>

          {/* Supplier invoices */}
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Leverantörsfakturor</p>
            {project.supplierInvoices.length ? (
              <table className="w-full text-xs">
                <thead><tr className="text-white/30 border-b border-white/10">
                  <th className="text-left py-1">Nr</th>
                  <th className="text-left py-1">Leverantör</th>
                  <th className="text-left py-1">Datum</th>
                  <th className="text-left py-1">Förfaller</th>
                  <th className="text-right py-1">Belopp</th>
                  <th className="text-right py-1">Återstår</th>
                  <th className="text-left py-1 pl-2">Status</th>
                </tr></thead>
                <tbody>
                  {project.supplierInvoices.map((inv, i) => (
                    <tr key={i} onClick={() => onInvoiceClick(inv, 'supplier', project)} className="border-b border-white/5 text-white/70 cursor-pointer hover:bg-white/5 transition-colors">
                      <td className="py-1.5 font-mono">{inv.invoiceNumber}</td>
                      <td className="py-1.5 truncate max-w-[90px]">{inv.supplierName}</td>
                      <td className="py-1.5">{inv.invoiceDate}</td>
                      <td className="py-1.5">{inv.dueDate}</td>
                      <td className="py-1.5 text-right text-orange-400/80">{fmtNum(inv.total)}</td>
                      <td className="py-1.5 text-right">{fmtNum(inv.balance)}</td>
                      <td className="py-1.5 pl-2"><InvoiceStatusBadge inv={inv} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-white/25 italic text-xs">Inga fakturor</p>}
          </div>
        </div>

        {/* Tidslogg section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Tidslogg</p>
            <Button onClick={() => setShowTimeLog(true)} variant="outline" size="sm" className="text-xs border-white/20 text-white/60 bg-white/5 hover:bg-white/10 h-6 px-2">Logga tid</Button>
          </div>
          {timeEntries.length ? (
            <table className="w-full text-xs">
              <thead><tr className="text-white/30 border-b border-white/10">
                <th className="text-left py-1">Datum</th>
                <th className="text-left py-1">Rapportör</th>
                <th className="text-right py-1">Timmar</th>
                <th className="text-left py-1">Beskrivning</th>
                <th className="text-right py-1">Kostnad</th>
              </tr></thead>
              <tbody>
                {timeEntries.map((t, i) => (
                  <tr key={i} className="border-b border-white/5 text-white/70">
                    <td className="py-1.5">{t.date}</td>
                    <td className="py-1.5">{t.reporter || '–'}</td>
                    <td className="py-1.5 text-right">{t.hours} h</td>
                    <td className="py-1.5 truncate max-w-[150px]">{t.description || '–'}</td>
                    <td className="py-1.5 text-right text-orange-400/80">{t.hourlyRate && t.hourlyRate > 0 ? fmtNum(t.hours * t.hourlyRate) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-white/25 italic text-xs">Inga tidsposter</p>}
        </div>
        {showTimeLog && <LoggaTidModal project={project} onClose={() => setShowTimeLog(false)} onSuccess={() => { refetchTime(); }} />}
      </td>
    </tr>
  );
}