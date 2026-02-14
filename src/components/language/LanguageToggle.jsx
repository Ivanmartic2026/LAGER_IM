import React from 'react';
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="text-white/70 hover:text-white relative"
      title={language === 'sv' ? 'Switch to English' : 'Byt till Svenska'}
    >
      <Languages className="w-5 h-5" />
      <span className="absolute -bottom-1 right-1 text-[10px] font-bold text-white/50">
        {language.toUpperCase()}
      </span>
    </Button>
  );
}