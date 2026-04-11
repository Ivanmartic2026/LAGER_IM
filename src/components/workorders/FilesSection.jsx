import { useState } from 'react';
import { FileText, Image as ImageIcon, File, ExternalLink, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

function getExt(url = '') {
  return url.split('.').pop()?.toLowerCase().split('?')[0] || '';
}

function isImage(url) {
  return IMAGE_EXTS.includes(getExt(url));
}

function FileRow({ file, index }) {
  const ext = getExt(file.url);
  const img = isImage(file.url);
  const typeLabel = file.type === 'drawing' ? 'Ritning' : file.type === 'site_image' ? 'Platsbild' : ext.toUpperCase() || 'Fil';
  const typeColor = file.type === 'drawing' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    : file.type === 'site_image' ? 'text-green-400 bg-green-500/10 border-green-500/20'
    : 'text-white/50 bg-white/5 border-white/10';

  return (
    <a href={file.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
      {img ? (
        <img src={file.url} alt={file.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          {ext === 'pdf' ? <FileText className="w-5 h-5 text-red-400" />
            : img ? <ImageIcon className="w-5 h-5 text-green-400" />
            : <File className="w-5 h-5 text-white/40" />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">
          {file.name || file.url.split('/').pop()}
        </p>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeColor}`}>{typeLabel}</span>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 flex-shrink-0" />
    </a>
  );
}

export default function FilesSection({ workOrder, order, onFileAdded }) {
  const [uploading, setUploading] = useState(false);

  // Collect all files: source_document, order files, wo files — deduplicated by URL
  const allFiles = [];
  const seen = new Set();

  const sourceUrl = workOrder?.source_document_url || order?.source_document_url;
  if (sourceUrl) {
    allFiles.push({ url: sourceUrl, name: 'Källdokument (PO/Offert)', type: 'other' });
    seen.add(sourceUrl);
  }
  for (const f of (order?.uploaded_files || [])) {
    if (!seen.has(f.url)) { allFiles.push(f); seen.add(f.url); }
  }
  for (const f of (workOrder?.uploaded_files || [])) {
    if (!seen.has(f.url)) { allFiles.push(f); seen.add(f.url); }
  }

  if (allFiles.length === 0 && !onFileAdded) return null;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onFileAdded) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      onFileAdded({ url: result.file_url, name: file.name, type: 'other' });
      toast.success('Fil uppladdad');
    } catch {
      toast.error('Fel vid uppladdning');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-black rounded-2xl border border-white/10 p-5">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4 text-purple-400" />
        Filer &amp; Ritningar
        {allFiles.length > 0 && <span className="text-xs text-white/40 font-normal ml-1">({allFiles.length} st)</span>}
      </h3>

      {allFiles.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-4">Inga filer uppladdade</p>
      ) : (
        <div className="space-y-2 mb-3">
          {allFiles.map((file, i) => <FileRow key={i} file={file} index={i} />)}
        </div>
      )}

      {onFileAdded && (
        <label className="block cursor-pointer">
          <input type="file" onChange={handleUpload} className="hidden" />
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 transition-all">
            <Plus className="w-4 h-4 text-white/40" />
            <span className="text-sm text-white/40">{uploading ? 'Laddar upp...' : 'Ladda upp fil'}</span>
          </div>
        </label>
      )}
    </div>
  );
}