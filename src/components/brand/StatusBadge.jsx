/**
 * IM Vision Status Badge
 * Använd denna för alla status-visningar i appen.
 * Semantiska färger — INTE lila (lila är signalfärg, inte status).
 */
import React from 'react';
import { cn } from '@/lib/utils';

const STATUS_MAP = {
  // Batch / Article status
  verified:           { label: 'Verifierad',    cls: 'bg-green-100 text-green-800 border-green-200' },
  active:             { label: 'Aktiv',          cls: 'bg-green-100 text-green-800 border-green-200' },
  completed:          { label: 'Klar',           cls: 'bg-green-100 text-green-800 border-green-200' },
  passed:             { label: 'Godkänd',        cls: 'bg-green-100 text-green-800 border-green-200' },
  received:           { label: 'Mottagen',       cls: 'bg-green-100 text-green-800 border-green-200' },

  pending_verification: { label: 'Väntar',       cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  pending:            { label: 'Väntar',         cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  in_progress:        { label: 'Pågående',       cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  draft:              { label: 'Utkast',         cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  sent:               { label: 'Skickad',        cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmed:          { label: 'Bekräftad',      cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  shipped:            { label: 'Levererad',      cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  in_transit:         { label: 'I transit',      cls: 'bg-sky-100 text-sky-800 border-sky-200' },

  quarantine:         { label: 'Karantän',       cls: 'bg-red-100 text-red-800 border-red-200' },
  rejected:           { label: 'Avvisad',        cls: 'bg-red-100 text-red-800 border-red-200' },
  failed:             { label: 'Fel',            cls: 'bg-red-100 text-red-800 border-red-200' },
  cancelled:          { label: 'Annullerad',     cls: 'bg-red-100 text-red-800 border-red-200' },
  discarded:          { label: 'Kasserad',       cls: 'bg-red-100 text-red-800 border-red-200' },
  out_of_stock:       { label: 'Slut',           cls: 'bg-red-100 text-red-800 border-red-200' },

  blocked:            { label: 'Blockerad',      cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  low_stock:          { label: 'Lågt lager',     cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  on_repair:          { label: 'På reparation',  cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  needs_review:       { label: 'Granskas',       cls: 'bg-orange-100 text-orange-800 border-orange-200' },

  info:               { label: 'Info',           cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  partial:            { label: 'Delvis',         cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  manual_review:      { label: 'Manuell',        cls: 'bg-sky-100 text-sky-800 border-sky-200' },

  discontinued:       { label: 'Utgången',       cls: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  unknown_delivery:   { label: 'Okänd lev.',     cls: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
};

export default function StatusBadge({ status, label, className }) {
  const entry = STATUS_MAP[status] || { label: label || status || '—', cls: 'bg-zinc-100 text-zinc-700 border-zinc-200' };

  return (
    <span
      className={cn(
        'inline-flex items-center border rounded px-2.5 py-0.5 font-brand text-[11px] tracking-[0.05em] uppercase',
        entry.cls,
        className
      )}
    >
      {label || entry.label}
    </span>
  );
}