import { AlertTriangle } from "lucide-react";

export default function CriticalNotesBanner({ text }) {
  if (!text) return null;
  return (
    <div className="bg-amber-500/15 border-2 border-amber-500/50 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
      </div>
      <div>
        <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">⚠️ Kritisk information — Läs noggrant</p>
        <p className="text-sm text-amber-100 whitespace-pre-wrap font-medium leading-relaxed">{text}</p>
      </div>
    </div>
  );
}