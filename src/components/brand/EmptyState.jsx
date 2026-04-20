/**
 * IM Vision Empty State — triangulär illustration + Ropa Sans rubrik.
 */
import React from 'react';
import { cn } from '@/lib/utils';

export default function EmptyState({ title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {/* Triangular brand illustration */}
      <div className="relative flex items-end justify-center gap-2 mb-6 opacity-20">
        <span style={{ width:0, height:0, borderLeft:'14px solid transparent', borderRight:'14px solid transparent', borderBottom:'24px solid #6300FF' }} />
        <span style={{ width:0, height:0, borderLeft:'22px solid transparent', borderRight:'22px solid transparent', borderBottom:'38px solid #6300FF' }} />
        <span style={{ width:0, height:0, borderLeft:'14px solid transparent', borderRight:'14px solid transparent', borderBottom:'24px solid #6300FF' }} />
      </div>

      {title && (
        <h3 className="font-brand text-xl tracking-wide text-foreground mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-muted-foreground text-sm font-body max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">{action}</div>
      )}
    </div>
  );
}