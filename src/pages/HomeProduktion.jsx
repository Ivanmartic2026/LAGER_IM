import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Play, Package, AlertTriangle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect } from 'react';

export default function HomeProduktion() {
  const [me, setMe] = useState(null);
  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);

  const { data: workOrders = [] } = useQuery({ queryKey: ['hp-wo'], queryFn: () => base44.entities.WorkOrder.list('-created_date', 100) });
  const { data: tasks = [] } = useQuery({
    queryKey: ['hp-tasks', me?.email],
    queryFn: () => base44.entities.Task.filter({ assigned_to: me?.email }),
    enabled: !!me
  });

  const myWOs = workOrders.filter(w => w.assigned_to_produktion === me?.email && w.current_stage === 'produktion');
  const shortageWOs = workOrders.filter(w => w.assigned_to_produktion === me?.email && w.all_materials_ready === false);
  const myTasks = tasks.filter(t => ['to_do', 'in_progress'].includes(t.status));

  const checklistProgress = (wo) => {
    const cl = wo.checklist || {};
    const keys = ['picked', 'assembled', 'tested', 'packed', 'ready_for_delivery'];
    const done = keys.filter(k => cl[k]).length;
    return Math.round((done / keys.length) * 100);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🏭 Produktionsvy</h1>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Play className="w-4 h-4 mr-1" />Starta jobb</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Play className="w-4 h-4 text-blue-400" /> Min produktionskö ({myWOs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myWOs.length === 0 ? <p className="text-white/40 text-sm">Ingen aktiv kö</p> : (
                <div className="space-y-3">
                  {myWOs.slice(0, 5).map(w => {
                    const pct = checklistProgress(w);
                    return (
                      <Link key={w.id} to={`/WorkOrders/${w.id}`} className="block p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white">{w.name || w.customer_name}</span>
                          <span className="text-xs text-white/40">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-red-400" /> Väntar på material ({shortageWOs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shortageWOs.length === 0 ? <p className="text-white/40 text-sm">Allt material OK</p> : (
                <div className="space-y-2">
                  {shortageWOs.slice(0, 5).map(w => (
                    <Link key={w.id} to={`/WorkOrders/${w.id}`} className="flex items-center justify-between p-2 rounded-lg bg-red-900/20 hover:bg-red-900/30 transition-colors">
                      <span className="text-sm text-white">{w.name || w.customer_name}</span>
                      <Badge className="bg-red-500/30 text-red-300 border-0 text-xs">Saknar material</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" /> Min att-göra ({myTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myTasks.length === 0 ? <p className="text-white/40 text-sm">Inga uppgifter</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {myTasks.slice(0, 6).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-sm text-white truncate">{t.name}</span>
                      <Badge className={`text-xs ml-2 border-0 ${t.priority === 'urgent' ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white/50'}`}>{t.priority}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}