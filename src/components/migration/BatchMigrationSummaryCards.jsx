import React from 'react';
import { cn } from '@/lib/utils';

const CARDS = [
  { key: 'auto', label: 'Auto-placeholder', countKey: 'auto_placeholder_count', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { key: 'junk', label: 'Skräpdata (JUNK)', countKey: 'junk_count', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  { key: 'real', label: 'Verkliga (REAL)', countKey: 'real_singles_count', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  { key: 'true_dup', label: 'Sanna dubletter', countKey: 'true_duplicate_groups', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', suffix: 'grupper' },
  { key: 'false_dup', label: 'Falska dubletter', countKey: 'false_duplicate_groups', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', suffix: 'grupper' },
];

export default function BatchMigrationSummaryCards({ preview }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {CARDS.map(c => (
        <div key={c.key} className={cn("p-4 rounded-xl border", c.bg)}>
          <p className={cn("text-2xl font-bold", c.color)}>{preview[c.countKey] ?? 0}</p>
          <p className="text-xs text-white/40 mt-1">{c.label}</p>
          {c.suffix && <p className="text-xs text-white/30">{c.suffix}</p>}
        </div>
      ))}
    </div>
  );
}