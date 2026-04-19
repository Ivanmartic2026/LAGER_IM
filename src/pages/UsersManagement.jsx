import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState } from 'react';
import { Pencil, Save, X, Shield, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';

const ROLES = ['säljare', 'konstruktor', 'inkopare', 'lager', 'produktion', 'tekniker', 'ivan', 'admin'];
const ROLE_COLORS = {
  admin: 'bg-red-500/20 text-red-300',
  ivan: 'bg-purple-500/20 text-purple-300',
  konstruktor: 'bg-blue-500/20 text-blue-300',
  inkopare: 'bg-green-500/20 text-green-300',
  lager: 'bg-yellow-500/20 text-yellow-300',
  produktion: 'bg-orange-500/20 text-orange-300',
  tekniker: 'bg-cyan-500/20 text-cyan-300',
  säljare: 'bg-pink-500/20 text-pink-300'
};

export default function UsersManagement() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-mgmt'],
    queryFn: () => base44.entities.User.list()
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.auth.updateMe ? base44.entities.User.update(id, data) : Promise.resolve(),
    onSuccess: () => {
      qc.invalidateQueries(['users-mgmt']);
      setEditingId(null);
      toast({ title: 'Användare uppdaterad' });
    },
    onError: (e) => toast({ title: 'Fel', description: e.message, variant: 'destructive' })
  });

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditData({
      role: user.role || 'lager',
      home_page_override: user.home_page_override || '',
      mobile_preferred: user.mobile_preferred || false,
      is_active: user.is_active !== false
    });
  };

  const save = () => {
    update.mutate({ id: editingId, data: editData });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl font-bold">Användarhantering</h1>
          <Badge className="bg-white/10 text-white/60 border-0">{users.length} användare</Badge>
        </div>

        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className={`p-4 rounded-xl border transition-colors ${editingId === user.id ? 'bg-white/10 border-blue-500/30' : 'bg-white/5 border-white/10'}`}>
              {editingId === user.id ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{user.full_name}</p>
                      <p className="text-white/40 text-sm">{user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8" onClick={save} disabled={update.isPending}>
                        <Save className="w-4 h-4 mr-1" />Spara
                      </Button>
                      <Button size="sm" variant="outline" className="border-white/20 text-white h-8" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-white/40 block mb-1">Roll</label>
                      <Select value={editData.role} onValueChange={v => setEditData(d => ({ ...d, role: v }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-white/40 block mb-1">Startsida (override)</label>
                      <Input
                        value={editData.home_page_override}
                        onChange={e => setEditData(d => ({ ...d, home_page_override: e.target.value }))}
                        placeholder="/home/lager"
                        className="bg-white/10 border-white/20 text-white h-9 text-sm"
                      />
                    </div>
                    <div className="flex flex-col justify-between">
                      <label className="text-xs text-white/40 mb-1">Mobilvy</label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editData.mobile_preferred}
                          onCheckedChange={v => setEditData(d => ({ ...d, mobile_preferred: v }))}
                        />
                        <span className="text-sm text-white/60">{editData.mobile_preferred ? 'Ja' : 'Nej'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between">
                      <label className="text-xs text-white/40 mb-1">Aktiv</label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editData.is_active}
                          onCheckedChange={v => setEditData(d => ({ ...d, is_active: v }))}
                        />
                        <span className="text-sm text-white/60">{editData.is_active ? 'Aktiv' : 'Inaktiv'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white/60" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.full_name}</p>
                      <p className="text-white/40 text-xs">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`border-0 text-xs ${ROLE_COLORS[user.role] || 'bg-white/10 text-white/60'}`}>
                      {user.role || 'ej satt'}
                    </Badge>
                    {user.is_active === false && <Badge className="border-0 text-xs bg-red-500/20 text-red-300">Inaktiv</Badge>}
                    {user.mobile_preferred && <Badge className="border-0 text-xs bg-cyan-500/20 text-cyan-300">📱</Badge>}
                    <Button size="sm" variant="ghost" className="text-white/50 hover:text-white h-8 w-8 p-0" onClick={() => startEdit(user)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}