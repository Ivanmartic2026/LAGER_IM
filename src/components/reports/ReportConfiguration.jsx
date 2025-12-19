import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const REPORT_TYPES = [
  { value: "stock_summary", label: "Lagersaldo - Sammanfattning", description: "Översikt av nuvarande lagersaldo" },
  { value: "stock_movements", label: "Lagerrörelser", description: "Alla in- och uttag under perioden" },
  { value: "low_stock", label: "Lågt lager - Varning", description: "Artiklar med lågt eller slut i lager" },
  { value: "full_inventory", label: "Fullständig inventering", description: "Komplett lista över alla artiklar" }
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Dagligen" },
  { value: "weekly", label: "Veckovis" },
  { value: "monthly", label: "Månadsvis" }
];

export default function ReportConfiguration({ onSave, onCancel, initialData = null }) {
  const [config, setConfig] = useState(initialData || {
    name: "",
    report_type: "stock_summary",
    frequency: "weekly",
    email_recipients: [],
    filters: {},
    date_range: {}
  });

  const [emailInput, setEmailInput] = useState("");

  const handleAddEmail = () => {
    if (emailInput && emailInput.includes('@')) {
      setConfig(prev => ({
        ...prev,
        email_recipients: [...(prev.email_recipients || []), emailInput]
      }));
      setEmailInput("");
    }
  };

  const handleRemoveEmail = (email) => {
    setConfig(prev => ({
      ...prev,
      email_recipients: prev.email_recipients.filter(e => e !== email)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(config);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label className="text-slate-300">Namn på rapport</Label>
        <Input
          value={config.name}
          onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
          placeholder="T.ex. Veckorapport lager"
          required
          className="bg-slate-900/50 border-slate-600 text-white"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300">Rapporttyp</Label>
        <Select
          value={config.report_type}
          onValueChange={(value) => setConfig(prev => ({ ...prev, report_type: value }))}
        >
          <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {REPORT_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value} className="text-white">
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-slate-400">{type.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300">Frekvens</Label>
        <Select
          value={config.frequency}
          onValueChange={(value) => setConfig(prev => ({ ...prev, frequency: value }))}
        >
          <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {FREQUENCY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-white">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300">E-postmottagare</Label>
        <div className="flex gap-2">
          <Input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="namn@företag.se"
            className="bg-slate-900/50 border-slate-600 text-white flex-1"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
          />
          <Button type="button" onClick={handleAddEmail} variant="outline" className="bg-slate-800 border-slate-600">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {(config.email_recipients || []).map((email, idx) => (
            <Badge key={idx} variant="secondary" className="bg-blue-500/20 text-blue-300 pl-3 pr-1 py-1">
              <Mail className="w-3 h-3 mr-1" />
              {email}
              <button
                type="button"
                onClick={() => handleRemoveEmail(email)}
                className="ml-2 hover:bg-blue-500/30 rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Filtrera kategori (valfritt)</Label>
          <Input
            value={config.filters?.category || ""}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              filters: { ...prev.filters, category: e.target.value }
            }))}
            placeholder="T.ex. LED Module"
            className="bg-slate-900/50 border-slate-600 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Filtrera lager (valfritt)</Label>
          <Input
            value={config.filters?.warehouse || ""}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              filters: { ...prev.filters, warehouse: e.target.value }
            }))}
            placeholder="T.ex. Huvudlager"
            className="bg-slate-900/50 border-slate-600 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Från datum (valfritt)</Label>
          <Input
            type="date"
            value={config.date_range?.start_date || ""}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              date_range: { ...prev.date_range, start_date: e.target.value }
            }))}
            className="bg-slate-900/50 border-slate-600 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Till datum (valfritt)</Label>
          <Input
            type="date"
            value={config.date_range?.end_date || ""}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              date_range: { ...prev.date_range, end_date: e.target.value }
            }))}
            className="bg-slate-900/50 border-slate-600 text-white"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
        >
          Avbryt
        </Button>
        <Button
          type="submit"
          disabled={!config.name || !config.email_recipients?.length}
          className="flex-1 bg-blue-600 hover:bg-blue-500"
        >
          {initialData ? 'Uppdatera' : 'Skapa'} schema
        </Button>
      </div>
    </form>
  );
}