/**
 * IM Vision Risk Score Badge
 * Används för BatchAnalysis riskpoäng 0-10.
 */
import React from 'react';
import { cn } from '@/lib/utils';

export default function RiskBadge({ score, className }) {
  const n = Number(score ?? 0);

  let cls, label;
  if (n <= 2) {
    cls = 'bg-green-500 text-white';
    label = 'LÅG';
  } else if (n <= 5) {
    cls = 'bg-amber-500 text-zinc-900';
    label = 'MEDIUM';
  } else if (n <= 8) {
    cls = 'bg-red-600 text-white';
    label = 'HÖG';
  } else {
    cls = 'bg-black text-white';
    label = 'KRITISK';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 font-brand text-[11px] tracking-[0.05em]',
        cls,
        className
      )}
    >
      {n}/10 — {label}
    </span>
  );
}