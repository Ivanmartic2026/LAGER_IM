import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function ArticlePurchaseHistory({ articleId }) {
  const { data: allPOItems = [], isLoading } = useQuery({
    queryKey: ['po-items-for-article', articleId],
    queryFn: async () => {
      const items = await base44.entities.PurchaseOrderItem.filter({ article_id: articleId });
      if (items.length === 0) return [];
      const allPOs = await base44.entities.PurchaseOrder.list();
      return items.map(item => ({
        ...item,
        po: allPOs.find(po => po.id === item.purchase_order_id) || null
      }));
    },
  });

  if (isLoading) return <div className="text-slate-400 text-sm py-4">Laddar...</div>;

  return (
    <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-blue-400" />
        Inköpshistorik
      </h3>
      {allPOItems.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Ingen inköpshistorik ännu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allPOItems.map((item) => (
            <div key={item.id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/30">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">
                    {item.po?.po_number || `PO #${item.purchase_order_id?.slice(0,8)}`}
                  </p>
                  <p className="text-xs text-slate-400">{item.po?.supplier_name || '—'}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  {item.po?.order_date && format(new Date(item.po.order_date), 'd MMM yyyy', { locale: sv })}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                <span>Beställt: <span className="text-white font-medium">{item.quantity_ordered} st</span></span>
                <span>Mottaget: <span className="text-emerald-400 font-medium">{item.quantity_received || 0} st</span></span>
                {item.unit_price > 0 && (
                  <span>Pris: <span className="text-white font-medium">{item.unit_price?.toLocaleString('sv-SE')} kr/st</span></span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}