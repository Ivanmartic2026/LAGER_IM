/**
 * IM Vision Section Heading — Ropa Sans uppercase med optional triangel-accent.
 */
import React from 'react';
import { cn } from '@/lib/utils';

export default function SectionHeading({ children, level = 2, triangle = false, className }) {
  const Tag = `h${level}`;
  const sizes = {
    1: 'text-3xl',
    2: 'text-xl',
    3: 'text-base',
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {triangle && (
        <span
          className="inline-block flex-shrink-0"
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '14px solid #6300FF',
          }}
        />
      )}
      <Tag
        className={cn(
          'font-brand tracking-wide text-foreground leading-tight',
          sizes[level] || sizes[2]
        )}
      >
        {children}
      </Tag>
    </div>
  );
}