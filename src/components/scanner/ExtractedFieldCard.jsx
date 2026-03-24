import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfidenceIndicator from './ConfidenceIndicator';
import { cn } from "@/lib/utils";

export default function ExtractedFieldCard({ 
  field, 
  label, 
  value, 
  confidence, 
  onChange, 
  type = "text",
  options = [],
  required = false,
  placeholder = ""
}) {
  const needsReview = confidence < 0.85;

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      className={cn(
      "relative p-4 rounded-xl border-2 transition-all duration-200 backdrop-blur-xl",
      needsReview 
        ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10" 
        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
    )}>
      <div className="flex items-center justify-between mb-3">
        <Label className="text-sm font-semibold text-white">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </Label>
        {confidence !== undefined && (
          <ConfidenceIndicator confidence={confidence} />
        )}
      </div>

      {type === "select" ? (
        <Select value={value || ""} onValueChange={(val) => onChange(field, val)}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all">
            <SelectValue placeholder={placeholder || "Välj..."} />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10">
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-white">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={type}
          value={value || ""}
          onChange={(e) => onChange(field, e.target.value)}
          placeholder={placeholder}
          className={cn(
            "bg-white/5 border-white/10 text-white placeholder:text-white/40 hover:bg-white/10 hover:border-white/20 transition-all",
            needsReview && "border-amber-500/50 focus:border-amber-400 bg-amber-500/5"
          )}
        />
      )}
    </div>
  );
}