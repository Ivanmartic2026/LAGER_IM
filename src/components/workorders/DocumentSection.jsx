import React from 'react';
import { FileText, Download, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DOCUMENT_TYPES = [
  { key: 'drawing', label: 'Ritning', urlField: 'drawing_url' },
  { key: 'bom', label: 'Stycklista (BOM)', urlField: 'bill_of_materials_url' },
  { key: 'quality', label: 'Kvalitetsrapport', urlField: 'quality_report_url' },
  { key: 'test', label: 'Testprotokoll', urlField: 'test_protocol_url' }
];

export default function DocumentSection({ workOrder, order, onUpload, onRemove }) {
  const inheritedFiles = order?.uploaded_files || [];
  const inheritedSourceDoc = order?.source_document_url;

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
      <h2 className="font-bold text-white mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-400" />
        Dokumentation
      </h2>

      {/* Inherited from order */}
      {(inheritedSourceDoc || inheritedFiles.length > 0) && (
        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400 font-semibold mb-2">📎 Från order:</p>
          <div className="space-y-1">
            {inheritedSourceDoc && (
              <a href={inheritedSourceDoc} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-blue-300 hover:underline">
                <Download className="w-3 h-3" /> Kundorder / PO
              </a>
            )}
            {inheritedFiles.map((f, i) => (
              <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-blue-300 hover:underline">
                <Download className="w-3 h-3" /> {f.name || f.type || 'Dokument'}
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-3">
        {DOCUMENT_TYPES.map(({ key, label, urlField }) => {
          const hasFile = workOrder[urlField];
          return (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-white text-sm font-medium">{label}</span>
              <div className="flex gap-2">
                {hasFile ? (
                  <>
                    <a href={hasFile} target="_blank" rel="noopener noreferrer" 
                      className="text-blue-400 text-xs hover:underline flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      Öppna
                    </a>
                    <button onClick={() => onRemove(urlField)} 
                      className="text-red-400 hover:text-red-300">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <label className="text-blue-400 text-xs hover:underline cursor-pointer flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    Ladda upp
                    <input type="file" className="hidden" onChange={(e) => onUpload(key, e)} />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}