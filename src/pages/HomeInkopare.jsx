import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw, MessageSquare, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

export default function HomeInkopare() {
  const [me, setMe] = useState(null);
  const { toast } = useToast();
  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);

  const { data: pos = [] } = useQuery({ queryKey: ['hi-pos'], queryFn: () => base44.entities.PurchaseOrder.list('-created_date', 100) });
  const { data: docs = [] } = useQuery({ queryKey: ['hi-docs'], queryFn: () => base44.entities.SupplierDocument.list('-created_date', 50).catch(() => []) });
  const { data: tasks = [] } = useQuery({
    queryKey: ['hi-tasks', me?.email],
    queryFn: () => base44.entities.Task.filter({ assigned_to: me?.email }),
    enabled: !!me
  });

  const today = new Date().toISOString().split('T')[0];
  const openPOs = pos.filter(p => ['sent', 'confirmed', 'in_production'].includes(p.status));
  const docsPending = pos.filter(p => p.documentation_status !== 'complete' && ['sent','confirmed','in_production'].includes(p.status));
  const latePOs = pos.filter(p => ['sent','confirmed'].includes(p.status) && p.expected_delivery_date && p.expected_delivery_date < today);
  const recentDocs = docs.filter(d => {
    const t = new Date(d.created_date);
    return t > new Date(Date.now() - 24 * 3600 * 1000);
  });
  const myTasks = tasks.filter(t => ['to_do', 'in_progress'].includes(t.status));

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🛒 Inköpsvy</h1>
          <div className="flex gap-2">
            <Link to="/PurchaseOrders"><Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" />Ny PO</Button></Link>
            <Link to="/FortnoxSync"><Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10"><RefreshCw className="w-4 h-4 mr-1" />Synka Fortnox</Button></Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" /> Öppna PO ({openPOs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {openPOs.length === 0 ? <p className="text-white/40 text-sm">Inga öppna</p> : (
                <div className="space-y-2">
                  {openPOs.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-sm text-white truncate">{p.supplier_name}</span>
                      <Badge variant="outline" className="text-xs text-white/60 border-white/20 flex-shrink-0 ml-1">{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" /> Försenade PO ({latePOs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latePOs.length === 0 ? <p className="text-white/40 text-sm">Inga försenade</p> : (
                <div className="space-y-2">
                  {latePOs.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-red-900/20">
                      <span className="text-sm text-white truncate">{p.supplier_name}</span>
                      <span className="text-xs text-red-300 flex-shrink-0 ml-1">{p.expected_delivery_date}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" /> Väntar på dok ({docsPending.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {docsPending.length === 0 ? <p className="text-white/40 text-sm">Allt klart</p> : (
                <div className="space-y-2">
                  {docsPending.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-yellow-900/20">
                      <span className="text-sm text-white truncate">{p.supplier_name}</span>
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-0 text-xs flex-shrink-0">{p.documentation_status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" /> Leverantörsdok senaste 24h ({recentDocs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentDocs.length === 0 ? <p className="text-white/40 text-sm">Inga nya dokument</p> : (
                <div className="space-y-2">
                  {recentDocs.slice(0, 5).map(d => (
                    <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-purple-900/20">
                      <span className="text-sm text-white truncate">{d.document_type || 'Dokument'}</span>
                      <span className="text-xs text-white/40 flex-shrink-0 ml-1">{new Date(d.created_date).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">📋 Min att-göra ({myTasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {myTasks.length === 0 ? <p className="text-white/40 text-sm">Inga uppgifter</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {myTasks.slice(0, 6).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-sm text-white truncate">{t.name}</span>
                      <Badge className={`text-xs ml-2 flex-shrink-0 border-0 ${t.priority === 'urgent' ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white/50'}`}>{t.priority}</Badge>
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