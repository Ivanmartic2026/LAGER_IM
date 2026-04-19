import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, MapPin, FileText, AlertTriangle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export default function HomeTekniker() {
  const [me, setMe] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);

  const { data: siteReports = [] } = useQuery({ queryKey: ['ht-sr'], queryFn: () => base44.entities.SiteReport.list('-created_date', 50).catch(() => []) });
  const { data: tasks = [] } = useQuery({
    queryKey: ['ht-tasks', me?.email],
    queryFn: () => base44.entities.Task.filter({ assigned_to: me?.email }),
    enabled: !!me
  });

  const myReports = siteReports.filter(r => r.created_by === me?.email || r.assigned_to === me?.email);
  const incomplete = myReports.filter(r => r.status !== 'completed' && r.status !== 'approved');
  const myTasks = tasks.filter(t => ['to_do', 'in_progress'].includes(t.status));

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">🔧 Teknikervy</h1>
        </div>

        {/* Big action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/SiteReports">
            <button className="w-full h-16 rounded-2xl bg-green-700 hover:bg-green-600 active:bg-green-800 transition-colors flex items-center justify-center gap-3 text-white font-semibold" style={{ minHeight: 64 }}>
              <Plus className="w-6 h-6" />
              <span>Ny site-rapport</span>
            </button>
          </Link>
          <button
            onClick={() => navigate('/Scan')}
            className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors flex items-center justify-center gap-3 text-white font-semibold"
            style={{ minHeight: 64 }}
          >
            <Camera className="w-6 h-6" />
            <span>Skanna batch</span>
          </button>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" /> Mina uppdrag ({myReports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myReports.length === 0 ? <p className="text-white/40 text-sm">Inga tilldelade uppdrag</p> : (
              <div className="space-y-2">
                {myReports.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 min-h-[48px]">
                    <span className="text-sm text-white">{r.site_name || r.title || r.id.slice(0, 8)}</span>
                    <Badge className={`border-0 text-xs ${r.status === 'completed' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {incomplete.length > 0 && (
          <Card className="bg-yellow-900/20 border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-300 text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Ofullständiga rapporter ({incomplete.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {incomplete.slice(0, 4).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 min-h-[48px]">
                    <span className="text-sm text-white">{r.site_name || r.title || r.id.slice(0, 8)}</span>
                    <Badge className="bg-yellow-500/20 text-yellow-300 border-0 text-xs">{r.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" /> Min att-göra ({myTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? <p className="text-white/40 text-sm">Inga uppgifter</p> : (
              <div className="space-y-2">
                {myTasks.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 min-h-[48px]">
                    <span className="text-sm text-white">{t.name}</span>
                    <Badge className={`text-xs border-0 ${t.priority === 'urgent' ? 'bg-red-500/20 text-red-300' : t.priority === 'high' ? 'bg-orange-500/20 text-orange-300' : 'bg-white/10 text-white/50'}`}>{t.priority}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}