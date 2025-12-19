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
    <div className={cn(
      "p-4 rounded-xl border transition-all duration-200",
      needsReview 
        ? "bg-amber-500/5 border-amber-500/30" 
        : "bg-slate-800/50 border-slate-700/50"
    )}>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium text-slate-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </Label>
        {confidence !== undefined && (
          <ConfidenceIndicator confidence={confidence} />
        )}
      </div>

      {type === "select" ? (
        <Select value={value || ""} onValueChange={(val) => onChange(field, val)}>
          <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
            <SelectValue placeholder={placeholder || "Välj..."} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
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
            "bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500",
            needsReview && "border-amber-500/50 focus:border-amber-400"
          )}
        />
      )}
    </div>
  );
}