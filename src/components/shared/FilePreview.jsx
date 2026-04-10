import React, { useState } from 'react';
import { X, Download, Eye, FileText, Image, File } from 'lucide-react';
import { Button } from '@/components/ui/button';

function getFileType(url, name) {
  const str = (name || url || '').toLowerCase();
  if (str.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/)) return 'image';
  if (str.match(/\.pdf(\?|$)/)) return 'pdf';
  return 'other';
}

function getFileName(url, name) {
  if (name) return name;
  try {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1].split('?')[0]) || 'Fil';
  } catch {
    return 'Fil';
  }
}

function PreviewModal({ file, onClose }) {
  const type = getFileType(file.url, file.name);
  const name = getFileName(file.url, file.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="relative bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl flex flex-col"
        style={{ width: '90vw', maxWidth: 1000, height: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <span className="text-white font-medium truncate max-w-lg text-sm">{name}</span>
          <div className="flex items-center gap-2">
            <a href={file.url} download target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-1.5">
                <Download className="w-3.5 h-3.5" /> Ladda ner
              </Button>
            </a>
            <button onClick={onClose} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden rounded-b-2xl">
          {type === 'pdf' && (
            <iframe src={file.url} className="w-full h-full" title={name} />
          )}
          {type === 'image' && (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img src={file.url} alt={name} className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FilePreviewItem({ url, name, onRemove }) {
  const [showPreview, setShowPreview] = useState(false);
  const type = getFileType(url, name);
  const displayName = getFileName(url, name);

  return (
    <>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
        {/* Thumbnail for images */}
        {type === 'image' && (
          <img
            src={url}
            alt={displayName}
            className="w-12 h-8 object-cover rounded cursor-pointer flex-shrink-0 border border-white/10"
            onClick={() => setShowPreview(true)}
          />
        )}
        {type === 'pdf' && <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />}
        {type === 'other' && <File className="w-4 h-4 text-slate-400 flex-shrink-0" />}

        <span
          className={`text-sm flex-1 truncate ${type !== 'other' ? 'text-blue-300 cursor-pointer hover:text-blue-200' : 'text-slate-300'}`}
          onClick={type !== 'other' ? () => setShowPreview(true) : undefined}
        >
          {displayName}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {type !== 'other' && (
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
              title="Förhandsgranska"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            title="Ladda ner"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {showPreview && type !== 'other' && (
        <PreviewModal file={{ url, name: displayName }} onClose={() => setShowPreview(false)} />
      )}
    </>
  );
}