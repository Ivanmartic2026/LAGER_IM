import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fmtNum = (n) => (n || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 });
const fmtPct = (n) => (n != null && isFinite(n) && !isNaN(n) ? n.toFixed(1) + ' %' : '–');
const tb = (rev, res) => rev > 0 ? (res / rev) * 100 : null;

function StatusBadge({ status }) {
  const STATUS_MAP = {
    ONGOING: { label: 'Pågående', cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
    COMPLETED: { label: 'Avslutad', cls: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
    NOTSTARTED: { label: 'Ej startad', cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  };
  const s = STATUS_MAP[(status || '').toUpperCase()] ||
    { label: status || '–', cls: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export default function ProjectTableRow({ p, isExp, tbPct, toggleRow, setSlutModal, onInvoiceClick }) {
  // Fetch time entries for this project
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['projectTime', p.projectNumber],
    queryFn: () => base44.entities.ProjectTime.filter({ projectNumber: p.projectNumber }),
    enabled: isExp,
  });

  const totalHours = timeEntries.reduce((sum, t) => sum + (t.hours || 0), 0);
  const hoursDisplay = totalHours > 0 ? `${totalHours}h` : '–';

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.04] transition-colors">
      <td className="px-3 py-3 text-white/30 cursor-pointer" onClick={() => toggleRow(p.projectNumber)}>
        {isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </td>
      <td className="px-3 py-3 text-white/50 font-mono text-xs">{p.projectNumber}</td>
      <td className="px-3 py-3 text-white font-medium max-w-[160px] truncate">{p.projectName}</td>
      <td className="px-3 py-3 text-white/60 max-w-[100px] truncate text-xs">{p.customerName || '–'}</td>
      <td className="px-3 py-3"><StatusBadge status={p.projectStatus} /></td>
      <td className="px-3 py-3 text-right text-white/80">{fmtNum(p.revenue)}</td>
      <td className="px-3 py-3 text-right text-white/80">{fmtNum(p.costs)}</td>
      <td className={`px-3 py-3 text-right font-semibold ${p.result >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtNum(p.result)}</td>
      <td className={`px-3 py-3 text-right text-xs ${tbPct == null ? 'text-white/30' : tbPct >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>{fmtPct(tbPct)}</td>
      <td className="px-3 py-3 text-right text-white/70 text-sm font-medium">{hoursDisplay}</td>
      <td className="px-3 py-3 text-center">
        <Button variant="outline" size="sm" onClick={() => setSlutModal(p)}
          className="text-xs border-white/20 text-white/60 bg-white/5 hover:bg-white/10 hover:text-white h-7 px-2">
          Slutrapport
        </Button>
      </td>
    </tr>
  );
}