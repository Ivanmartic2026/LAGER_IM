import React from 'react';
import { cn } from '@/lib/utils';

export function ListSkeleton({ count = 5, className }) {
  return (
    <div className={cn("space-y-3", className)}>
      {[...Array(count)].map((_, i) => (
        <div 
          key={i}
          className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 animate-pulse-light"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-white/10 rounded w-3/4" />
              <div className="h-4 bg-white/10 rounded w-1/2" />
              <div className="flex gap-2 mt-3">
                <div className="h-6 bg-white/10 rounded-full w-16" />
                <div className="h-6 bg-white/10 rounded-full w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 6, className }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {[...Array(count)].map((_, i) => (
        <div 
          key={i}
          className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 animate-pulse-light"
        >
          <div className="space-y-3">
            <div className="h-6 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-full" />
            <div className="h-4 bg-white/10 rounded w-5/6" />
            <div className="flex gap-2 mt-4">
              <div className="h-8 bg-white/10 rounded-full w-20" />
              <div className="h-8 bg-white/10 rounded-full w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}