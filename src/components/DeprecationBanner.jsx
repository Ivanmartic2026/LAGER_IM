import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DeprecationBanner({ message, link, linkText, onClose }) {
  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-start gap-3 justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-200 text-sm">
              {message}
              {link && (
                <>
                  {' '}
                  <a href={link} className="font-semibold underline text-yellow-300 hover:text-yellow-100">
                    {linkText || 'Gå här'}
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-yellow-400 hover:text-yellow-300 h-auto p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}