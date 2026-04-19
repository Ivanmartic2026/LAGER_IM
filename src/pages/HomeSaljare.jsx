import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Plus, FileText, ShoppingCart, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export default function HomeSaljare() {
  const [me, setMe] = useState(null);
  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);

  const { data: orders = [] } = useQuery({
    queryKey: ['home-saljare-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100)
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['home-saljare-tasks'],
    queryFn: () => base44.entities.Task.filter({ assigned_to: me?.email, status: 'to_do' }),
    enabled: !!me
  });

  const myPipeline = orders.filter(o => !o.sales_completed && o.status === 'SÄLJ');
  const waitingKonstruktion = orders.filter(o => o.status === 'KONSTRUKTION');

  const topCustomers = Object.entries(
    orders.filter(o => {
      const d = new Date(o.created_date);
      return d > new Date(Date.now() - 365 * 24 * 3600 * 1000);
    }).reduce((acc, o) => {
      acc[o.customer_name] = (acc[o.customer_name] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">👋 Min säljvy</h1>
          <div className="flex gap-2">
            <Link to="/Orders">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1" /> Ny order
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-400" /> Min pipeline ({myPipeline.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myPipeline.length === 0 ? <p className="text-white/40 text-sm">Inga aktiva ordrar</p> : (
                <div className="space-y-2">
                  {myPipeline.slice(0, 5).map(o => (
                    <Link key={o.id} to={`/OrderDetail?id=${o.id}`} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <span className="text-sm text-white">{o.customer_name}</span>
                      <Badge variant="outline" className="text-xs text-white/60 border-white/20">{o.order_number || o.id.slice(0,6)}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" /> Väntar på konstruktion ({waitingKonstruktion.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {waitingKonstruktion.length === 0 ? <p className="text-white/40 text-sm">Inga ordrar</p> : (
                <div className="space-y-2">
                  {waitingKonstruktion.slice(0, 5).map(o => (
                    <Link key={o.id} to={`/OrderDetail?id=${o.id}`} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <span className="text-sm text-white">{o.customer_name}</span>
                      <span className="text-xs text-white/40">{o.delivery_date || '—'}</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <User className="w-4 h-4 text-green-400" /> Topp 5 kunder
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topCustomers.length === 0 ? <p className="text-white/40 text-sm">Ingen data</p> : (
                <div className="space-y-2">
                  {topCustomers.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-sm text-white">{name}</span>
                      <Badge className="bg-blue-600/20 text-blue-300 border-0">{count} ordrar</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" /> Min att-göra ({tasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? <p className="text-white/40 text-sm">Inga uppgifter</p> : (
                <div className="space-y-2">
                  {tasks.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-sm text-white">{t.name}</span>
                      <Badge variant="outline" className={`text-xs border-0 ${t.priority === 'urgent' ? 'bg-red-500/20 text-red-300' : t.priority === 'high' ? 'bg-orange-500/20 text-orange-300' : 'bg-white/10 text-white/50'}`}>
                        {t.priority}
                      </Badge>
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