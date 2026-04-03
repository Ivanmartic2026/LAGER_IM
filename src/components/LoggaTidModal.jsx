import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function LoggaTidModal({ project, onClose, onSuccess }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ date: today, hours: 8, description: '', reporter: '', hourlyRate: 0 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.hours || form.hours < 0.5) {
      toast.error('Minst 0.5 timmar krävs');
      return;
    }
    setLoading(true);
    try {
      await base44.entities.ProjectTime.create({
        projectNumber: project.projectNumber,
        projectName: project.projectName,
        date: form.date,
        hours: form.hours,
        description: form.description,
        reporter: form.reporter,
        hourlyRate: form.hourlyRate || 0
      });
      toast.success('Tid loggad');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Fel vid loggning av tid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
        <DialogHeader><DialogTitle className="text-white">Logga tid — {project.projectName}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-xs text-white/50 uppercase">Datum</label>
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="bg-white/5 border-white/20 text-white mt-1" />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase">Timmar</label>
            <Input type="number" step="0.5" min="0.5" value={form.hours} onChange={e => setForm({ ...form, hours: parseFloat(e.target.value) || 0 })} className="bg-white/5 border-white/20 text-white mt-1" />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase">Beskrivning</label>
            <Input placeholder="T.ex. Installation och test" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-white/5 border-white/20 text-white mt-1" />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase">Rapportör</label>
            <Input placeholder="Namn" value={form.reporter} onChange={e => setForm({ ...form, reporter: e.target.value })} className="bg-white/5 border-white/20 text-white mt-1" />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase">Timkostnad (kr/h)</label>
            <Input type="number" placeholder="Valfritt" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: parseFloat(e.target.value) || 0 })} className="bg-white/5 border-white/20 text-white mt-1" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onClose} variant="outline" className="border-white/20 text-white bg-white/5 hover:bg-white/10">Avbryt</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white">{loading ? 'Sparar...' : 'Spara'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}