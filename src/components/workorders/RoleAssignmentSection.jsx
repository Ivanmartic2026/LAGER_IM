import { useState } from 'react';
import { Users, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const TEAM_MEMBERS = [
  'alexander.hansson@imvision.se',
  'emil.norlin@imvision.se',
  'ivan@imvision.se',
  'josefine@imvision.se',
  'lino@imvision.se',
  'mergim@imvision.se',
];

const getName = (email) => email?.split('@')[0]?.replace('.', ' ') || '—';

function RoleRow({ label, color, emailVal, onEmailChange, extraField, extraVal, onExtraChange }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className={`text-xs font-bold uppercase tracking-wider w-28 flex-shrink-0 ${color}`}>{label}</span>
      <select
        value={emailVal || ''}
        onChange={e => onEmailChange(e.target.value)}
        className="flex-1 bg-black border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
        style={{ colorScheme: 'dark', backgroundColor: '#111' }}
      >
        <option value="">— Ej tilldelad —</option>
        {TEAM_MEMBERS.map(m => <option key={m} value={m}>{getName(m)} ({m})</option>)}
      </select>
      {extraField && (
        <Input
          value={extraVal || ''}
          onChange={e => onExtraChange(e.target.value)}
          placeholder={extraField}
          className="w-40 bg-white/5 border-white/10 text-white text-sm h-9"
        />
      )}
    </div>
  );
}

export default function RoleAssignmentSection({ workOrder, onSave }) {
  const [form, setForm] = useState({
    assigned_to_konstruktion: workOrder.assigned_to_konstruktion || '',
    assigned_to_lager: workOrder.assigned_to_lager || '',
    assigned_to_montering: workOrder.assigned_to_montering || '',
    technician_name: workOrder.technician_name || '',
    technician_phone: workOrder.technician_phone || '',
    planned_start_date: workOrder.planned_start_date || '',
    planned_deadline: workOrder.planned_deadline || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        assigned_to_konstruktion: form.assigned_to_konstruktion,
        assigned_to_konstruktion_name: getName(form.assigned_to_konstruktion),
        assigned_to_lager: form.assigned_to_lager,
        assigned_to_lager_name: getName(form.assigned_to_lager),
        assigned_to_montering: form.assigned_to_montering,
        assigned_to_montering_name: getName(form.assigned_to_montering),
        technician_name: form.technician_name,
        technician_phone: form.technician_phone,
        planned_start_date: form.planned_start_date,
        planned_deadline: form.planned_deadline,
      };
      await base44.entities.WorkOrder.update(workOrder.id, payload);
      toast.success('Rollfördelning sparad');
      onSave?.();
    } catch {
      toast.error('Fel vid sparning');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-black rounded-2xl border border-white/10 p-5">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-400" />
        Rollfördelning
      </h3>

      <div className="space-y-3">
        <RoleRow label="Konstruktör" color="text-purple-400"
          emailVal={form.assigned_to_konstruktion} onEmailChange={set('assigned_to_konstruktion')} />
        <RoleRow label="Lager" color="text-yellow-400"
          emailVal={form.assigned_to_lager} onEmailChange={set('assigned_to_lager')} />
        <RoleRow label="Tekniker" color="text-green-400"
          emailVal={form.assigned_to_montering} onEmailChange={set('assigned_to_montering')}
          extraField="Telefon" extraVal={form.technician_phone} onExtraChange={set('technician_phone')} />

        <div className="flex gap-3 pt-1">
          <div className="flex-1">
            <label className="text-xs text-white/40 mb-1 block">Planerat startdatum</label>
            <Input type="date" value={form.planned_start_date} onChange={e => set('planned_start_date')(e.target.value)}
              className="bg-white/5 border-white/10 text-white text-sm h-9" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-white/40 mb-1 block">Deadline</label>
            <Input type="date" value={form.planned_deadline} onChange={e => set('planned_deadline')(e.target.value)}
              className="bg-white/5 border-white/10 text-white text-sm h-9" />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}
        className="mt-4 bg-blue-600 hover:bg-blue-500 text-white gap-2 h-9 text-sm">
        <Save className="w-3.5 h-3.5" />
        {saving ? 'Sparar...' : 'Spara rollfördelning'}
      </Button>
    </div>
  );
}