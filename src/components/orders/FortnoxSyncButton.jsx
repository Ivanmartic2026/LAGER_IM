import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function FortnoxSyncButton({ order, orderItems, onSyncSuccess }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  if (order.fortnox_order_id) {
    return (
      <Badge className="bg-green-500/20 text-green-400 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Fortnox #{order.fortnox_order_id}
      </Badge>
    );
  }

  const canSync = order.fortnox_customer_number && !order.fortnox_order_id;

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Fetch full article data to get prices and SKUs
      const articles = await base44.entities.Article.list();
      
      const order_rows = (orderItems || []).map(item => {
        const article = articles.find(a => a.id === item.article_id);
        return {
          article_number: article?.sku || article?.fortnox_article_number || item.article_id || 'UNKNOWN',
          description: item.article_name || 'Item',
          quantity: item.quantity_picked || item.quantity_ordered || 0,
          price: article?.sales_price || article?.price || 0
        };
      });

      const result = await base44.functions.invoke('fortnoxOrderSync', {
        order_id: order.id,
        customer_number: order.fortnox_customer_number,
        your_order_number: order.order_number || `ORD-${order.id.slice(0, 8)}`,
        delivery_date: order.delivery_date || new Date().toISOString().split('T')[0],
        order_rows
      });

      if (result.data.success) {
        await base44.entities.Order.update(order.id, {
          fortnox_order_id: result.data.fortnox_order_id,
          fortnox_document_number: result.data.fortnox_document_number,
          financial_status: 'billed'
        });

        toast.success(`✓ Order skickad till Fortnox! (Order #${result.data.fortnox_order_id})`);
        setSyncMessage({ type: 'success', text: 'Order skickad till Fortnox!' });
        setTimeout(() => setSyncMessage(null), 4000);
        setConfirmOpen(false);
        if (onSyncSuccess) onSyncSuccess();
      } else {
        toast.error(`Fel: ${result.data.error || 'Kunde inte skicka till Fortnox'}`);
        setSyncMessage({ type: 'error', text: 'Fel: ' + (result.data.error || 'Kunde inte skicka till Fortnox') });
        setTimeout(() => setSyncMessage(null), 6000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      const errMsg = error.response?.data?.error || error.message || 'Okänt fel';
      toast.error(`Fel: ${errMsg}`);
      setSyncMessage({ type: 'error', text: 'Fel: ' + errMsg });
      setTimeout(() => setSyncMessage(null), 6000);
    } finally {
      setSyncing(false);
    }
  };

  if (!canSync) {
    return (
      <Button
        size="sm"
        disabled
        title="Saknar Fortnox-kundnummer — lägg till i Redigera"
        className="bg-slate-700/50 border-slate-600 text-slate-500 cursor-not-allowed opacity-60"
        variant="outline"
      >
        <Send className="w-3 h-3 mr-1" />
        Skicka till Fortnox
      </Button>
    );
  }

  return (
    <>
      {syncMessage && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium shadow-lg ${syncMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {syncMessage.text}
        </div>
      )}
      <Button
        onClick={() => setConfirmOpen(true)}
        size="sm"
        className="bg-blue-600 hover:bg-blue-500 text-white"
      >
        <Send className="w-3 h-3 mr-1" />
        Skicka till Fortnox
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Bekräfta synkronisering</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-white/70">
              Vill du skicka order <strong>{order.order_number}</strong> till Fortnox?
            </p>
            <p className="text-sm text-white/50 mt-2">
              Kund: {order.customer_name}
            </p>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={syncing}
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Skickar...
                </>
              ) : (
                'Ja, skicka'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}