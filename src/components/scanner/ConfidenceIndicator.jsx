import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConfidenceIndicator({ confidence, size = "sm" }) {
  const getConfig = () => {
    if (confidence >= 0.85) {
      return {
        icon: CheckCircle2,
        color: "text-emerald-400",
        bg: "bg-emerald-500/20",
        label: "Hög säkerhet"
      };
    } else if (confidence >= 0.6) {
      return {
        icon: AlertTriangle,
        color: "text-amber-400",
        bg: "bg-amber-500/20",
        label: "Verifiera"
      };
    } else {
      return {
        icon: HelpCircle,
        color: "text-red-400",
        bg: "bg-red-500/20",
        label: "Låg säkerhet"
      };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full",
      config.bg
    )}>
      <Icon className={cn(sizeClasses[size], config.color)} />
      <span className={cn("text-xs font-medium", config.color)}>
        {Math.round(confidence * 100)}%
      </span>
    </div>
  );
}