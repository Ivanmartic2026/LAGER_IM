import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Package, AlertTriangle, CheckCircle2, Plus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

function CollapsibleWidget({ title, icon: IconComp, iconColor, count, children }) {
  const Icon = IconComp;
  const [open, setOpen] = useState(true);
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <CardTitle className="text-white text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            {title} {count !== undefined && <Badge className="bg-white/10 text-white/70 border-0 text-xs">{count}</Badge>}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
        </CardTitle>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

export default function HomeLager() {
  const [me, setMe] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);

  const today = new Date().toISOString().split('T')[0];

  const { data: pos = [] } = useQuery({ queryKey: ['hl-pos'], queryFn: () => base44.entities.PurchaseOrder.list('-created_date', 50) });
  const { data: quarantine = [] } = useQuery({ queryKey: ['hl-quarantine'], queryFn: () => base44.entities.Batch.filter({ status: 'quarantine' }) });
  const { data: pending = [] } = useQuery({ queryKey: ['hl-pending'], queryFn: () => base44.entities.Batch.filter({ status: 'pending_verification' }) });
  const { data: scans = [] } = useQuery({ queryKey: ['hl-scans'], queryFn: () => base44.entities.LabelScan.list('-created_date', 10) });
  const { data: orderItems = [] } = useQuery({
    queryKey: ['hl-orderitems', me?.email],
    queryFn: () => base44.entities.OrderItem.filter({ status: 'pending' }),
    enabled: !!me
  });

  const todayPOs = pos.filter(p => p.expected_delivery_date === today);
  const pendingSorted = [...pending].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white">📦 Lagervy</h1>
        </div>

        {/* PRIMARY CTA - big scan button */}
        <button
          onClick={() => navigate('/Scan')}
          className="w-full h-20 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors flex items-center justify-center gap-4 text-white shadow-lg shadow-blue-500/30"
          style={{ minHeight: 80 }}
        >
          <Camera className="w-8 h-8" />
          <span className="text-2xl font-bold tracking-tight">SKANNA ETIKETT</span>
        </button>

        {/* Quick actions */}
        <div className="flex gap-3">
          <Link to="/ReceivePurchaseOrder" className="flex-1">
            <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 h-12">
              <Plus className="w-4 h-4 mr-2" />Inleverans
            </Button>
          </Link>
          <Link to="/Inventory" className="flex-1">
            <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 h-12">
              <RefreshCw className="w-4 h-4 mr-2" />Uttag
            </Button>
          </Link>
        </div>

        {/* Quarantine - prominent */}
        {quarantine.length > 0 && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-red-300 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> {quarantine.length} batcher i KARANTÄN
              </span>
              <Link to="/BatchReview">
                <Button size="sm" className="bg-red-600 hover:bg-red-500 h-9">Verifiera</Button>
              </Link>
            </div>
            {quarantine.slice(0, 3).map(b => (
              <div key={b.id} className="flex items-center justify-between py-1 border-t border-red-500/20 first:border-0">
                <span className="text-sm text-white">{b.batch_number}</span>
                <span className="text-xs text-red-300">{b.article_name || b.article_sku || '—'}</span>
              </div>
            ))}
          </div>
        )}

        <CollapsibleWidget title="Förväntade idag" icon={Package} iconColor="text-green-400" count={todayPOs.length}>
          {todayPOs.length === 0 ? <p className="text-white/40 text-sm">Inga leveranser idag</p> : (
            <div className="space-y-2">
              {todayPOs.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 min-h-[48px]">
                  <span className="text-sm text-white">{p.supplier_name}</span>
                  <Badge variant="outline" className="text-xs text-white/60 border-white/20">{p.po_number || p.id.slice(0,6)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CollapsibleWidget>

        <CollapsibleWidget title="Pending verification" icon={CheckCircle2} iconColor="text-yellow-400" count={pending.length}>
          {pending.length === 0 ? <p className="text-white/40 text-sm">Allt verifierat ✅</p> : (
            <div className="space-y-2">
              {pendingSorted.slice(0, 5).map(b => (
                <Link key={b.id} to={`/BatchDetail?id=${b.id}`} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 min-h-[48px] transition-colors">
                  <span className="text-sm text-white">{b.batch_number}</span>
                  <Badge className={`border-0 text-xs ${(b.risk_score || 0) > 70 ? 'bg-red-500/30 text-red-300' : (b.risk_score || 0) > 40 ? 'bg-yellow-500/30 text-yellow-300' : 'bg-green-500/30 text-green-300'}`}>
                    risk {b.risk_score || 0}
                  </Badge>
                </Link>
              ))}
              {pending.length > 5 && <p className="text-xs text-white/40 text-center">+{pending.length - 5} fler</p>}
            </div>
          )}
        </CollapsibleWidget>

        <CollapsibleWidget title="Mina senaste scanningar" icon={Camera} iconColor="text-blue-400" count={scans.length}>
          {scans.length === 0 ? <p className="text-white/40 text-sm">Inga scanningar</p> : (
            <div className="space-y-2">
              {scans.map(s => (
                <Link key={s.id} to={`/BatchDetail?scan_id=${s.id}`} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 min-h-[48px] transition-colors">
                  <span className="text-sm text-white">{s.extracted_fields?.batch_number || 'Okänt batch'}</span>
                  <Badge className={`border-0 text-xs ${s.status === 'completed' ? 'bg-green-500/20 text-green-300' : s.status === 'failed' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{s.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CollapsibleWidget>
      </div>
    </div>
  );
}