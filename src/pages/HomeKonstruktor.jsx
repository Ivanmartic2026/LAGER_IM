import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Plus, Package, AlertTriangle, Clock, CheckSquare, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export default function HomeKonstruktor() {
  const [me, setMe] = useState(null);
  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);

  const { data: orders = [] } = useQuery({ queryKey: ['hk-orders'], queryFn: () => base44.entities.Order.list('-created_date', 50) });
  const { data: workOrders = [] } = useQuery({ queryKey: ['hk-wo'], queryFn: () => base44.entities.WorkOrder.list('-created_date', 100) });
  const { data: pos = [] } = useQuery({ queryKey: ['hk-pos'], queryFn: () => base44.entities.PurchaseOrder.list('-created_date', 50) });
  const { data: tasks = [] } = useQuery({
    queryKey: ['hk-tasks', me?.email],
    queryFn: () => base44.entities.Task.filter({ assigned_to: me?.email }),
    enabled: !!me
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const today = new Date().toISOString().split('T')[0];

  const woIds = new Set(workOrders.map(w => w.order_id).filter(Boolean));
  const noWO = orders.filter(o => o.status === 'KONSTRUKTION' && !woIds.has(o.id));
  const myWOs = workOrders.filter(w => w.assigned_to_konstruktion === me?.email);
  const shortageWOs = workOrders.filter(w => w.all_materials_ready === false);
  const blockedPOs = pos.filter(p => ['sent'].includes(p.status) && p.sent_date && p.sent_date < sevenDaysAgo && !p.confirmed_date);
  const myTasks = tasks.filter(t => ['to_do', 'in_progress'].includes(t.status));

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🏗️ Konstruktörvy</h1>
          <div className="flex gap-2">
            <Link to="/WorkOrders"><Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" />WorkOrder</Button></Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" /> Nya ordrar att planera ({noWO.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {noWO.length === 0 ? <p className="text-white/40 text-sm">Inga ordrar väntar</p> : (
                <div className="space-y-2">
                  {noWO.slice(0, 5).map(o => (
                    <Link key={o.id} to={`/OrderDetail?id=${o.id}`} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <span className="text-sm text-white">{o.customer_name}</span>
                      <Badge variant="outline" className="text-xs text-white/60 border-white/20">{o.delivery_date || '—'}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-400" /> Mina WorkOrders ({myWOs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myWOs.length === 0 ? <p className="text-white/40 text-sm">Inga tilldelade</p> : (
                <div className="space-y-2">
                  {myWOs.slice(0, 5).map(w => (
                    <Link key={w.id} to={`/WorkOrders/${w.id}`} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <span className="text-sm text-white">{w.name || w.customer_name}</span>
                      <Badge variant="outline" className="text-xs text-white/60 border-white/20">{w.planned_deadline || '—'}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-red-400" /> Materialbrist ({shortageWOs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shortageWOs.length === 0 ? <p className="text-white/40 text-sm">Allt material OK</p> : (
                <div className="space-y-2">
                  {shortageWOs.slice(0, 5).map(w => {
                    const missing = (w.materials_needed || []).reduce((s, m) => s + (m.missing || 0), 0);
                    return (
                      <Link key={w.id} to={`/WorkOrders/${w.id}`} className="flex items-center justify-between p-2 rounded-lg bg-red-900/20 hover:bg-red-900/30 transition-colors">
                        <span className="text-sm text-white">{w.name || w.customer_name}</span>
                        <Badge className="bg-red-500/30 text-red-300 border-0 text-xs">{missing} saknas</Badge>
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
                <AlertTriangle className="w-4 h-4 text-orange-400" /> Blockerade av leverantör ({blockedPOs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {blockedPOs.length === 0 ? <p className="text-white/40 text-sm">Inga försenade PO</p> : (
                <div className="space-y-2">
                  {blockedPOs.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-900/20">
                      <span className="text-sm text-white">{p.supplier_name}</span>
                      <Badge className="bg-orange-500/30 text-orange-300 border-0 text-xs">{p.po_number}</Badge>
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
                      <Badge variant="outline" className={`text-xs ml-2 flex-shrink-0 border-0 ${t.priority === 'urgent' ? 'bg-red-500/20 text-red-300' : t.priority === 'high' ? 'bg-orange-500/20 text-orange-300' : 'bg-white/10 text-white/50'}`}>{t.priority}</Badge>
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