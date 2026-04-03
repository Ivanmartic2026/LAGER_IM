import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function LoggaTidModal({ projectNumber, projectName, onClose, onSuccess }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    description: '',
    reporter: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.date || !form.hours || form.hours <= 0) {
      toast.error('Datum och timmar krävs');
      return;
    }

    setLoading(true);
    try {
      await base44.entities.ProjectTime.create({
        projectNumber,
        projectName,
        date: form.date,
        hours: parseFloat(form.hours),
        description: form.description || '',
        reporter: form.reporter || '',
        hourlyRate: 0,
      });
      toast.success('Tid loggad');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Fel vid loggning av tid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Logga tid — {projectName}</DialogTitle>
          <DialogDescription className="sr-only">Formulär för att logga arbetstid på projektet</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-xs text-white/50 uppercase">Datum</label>
            <Input 
              type="date" 
              value={form.date} 
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="bg-white/5 border-white/20 text-white mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase">Timmar</label>
            <Input 
              type="number" 
              step="0.5"
              min="0"
              value={form.hours} 
              onChange={e => setForm({ ...form, hours: e.target.value })}
              className="bg-white/5 border-white/20 text-white mt-1"
              placeholder="T.ex. 8.5"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase">Rapportör (valfritt)</label>
            <Input 
              type="text"
              value={form.reporter} 
              onChange={e => setForm({ ...form, reporter: e.target.value })}
              className="bg-white/5 border-white/20 text-white mt-1"
              placeholder="Ditt namn"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase">Beskrivning (valfritt)</label>
            <Input 
              type="text"
              value={form.description} 
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="bg-white/5 border-white/20 text-white mt-1"
              placeholder="T.ex. Installationsarbete"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onClose} variant="outline" className="border-white/20 text-white bg-white/5 hover:bg-white/10">Avbryt</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white">{loading ? 'Sparar...' : 'Logga tid'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}