import React from 'react';
import { Package, CheckCircle2, AlertCircle, Download, Printer, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function ArticlesList({ items = [], articles = [], onWithdraw }) {
  const navigate = useNavigate();
  if (items.length === 0) return null;

  const handleExportCSV = () => {
    const headers = ['Artikelnamn', 'Nummer', 'Beställd', 'Plockad', 'Status'];
    const rows = items.map(item => {
      const missing = item.quantity_ordered - (item.quantity_picked || 0);
      const status = item.status === 'picked' ? 'Klar' : missing > 0 ? `Saknas ${missing}` : 'Delvis';
      return [
        item.article_name,
        item.shelf_address || '',
        item.quantity_ordered,
        item.quantity_picked || 0,
        status
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `artiklar_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Artikellista exporterad');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    const html = `
      <html>
        <head>
          <title>Plocklista</title>
          <style>
            body { font-family: Arial; margin: 20px; background-color: #000; color: #fff; }
            h2 { margin-bottom: 30px; font-size: 24px; }
            .item { 
              display: flex; 
              justify-content: space-between; 
              align-items: center;
              border: 1px solid #333;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 12px;
              background-color: #1a1a1a;
              page-break-inside: avoid;
            }
            .item-left { flex: 1; }
            .item-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
            .item-sku { font-size: 12px; color: #999; }
            .item-right { 
              display: flex; 
              align-items: center; 
              gap: 16px;
              text-align: right;
            }
            .quantity { font-size: 18px; color: #fff; }
            .status { 
              padding: 6px 12px; 
              border-radius: 6px; 
              font-size: 12px; 
              font-weight: bold;
            }
            .status-klar { background-color: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); }
            .status-missing { background-color: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
            .status-partial { background-color: rgba(234, 179, 8, 0.2); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.3); }
          </style>
        </head>
        <body>
          <h2>Plocklista</h2>
          ${items.map(item => {
            const missing = item.quantity_ordered - (item.quantity_picked || 0);
            const status = item.status === 'picked' ? 'Klar' : missing > 0 ? `Saknas ${missing}` : 'Delvis';
            const statusClass = item.status === 'picked' ? 'status-klar' : missing > 0 ? 'status-missing' : 'status-partial';
            return `
              <div class="item">
                <div class="item-left">
                  <div class="item-name">${item.article_name}</div>
                  <div class="item-sku">${item.shelf_address || ''}</div>
                </div>
                <div class="item-right">
                  <div class="quantity">${item.quantity_ordered} st</div>
                  <div class="status ${statusClass}">${status}</div>
                </div>
              </div>
            `;
          }).join('')}
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleWithdraw = () => {
    if (onWithdraw) onWithdraw();
  };

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-white/60" />
          Artiklar ({items.length})
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-white/5 border-white/20 hover:bg-white/10 text-white gap-2"
            onClick={handleExportCSV}
          >
            <Download className="w-4 h-4" />
            CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-white/5 border-white/20 hover:bg-white/10 text-white gap-2"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4" />
            Skriv ut
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {items.map(item => {
          const article = articles.find(a => a.id === item.article_id);
          const missing = item.quantity_ordered - (item.quantity_picked || 0);
          const status = item.status === 'picked' ? 'Klar' : missing > 0 ? `Saknas ${missing}` : 'Delvis';

          return (
            <div key={item.id} className={cn(
              "flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-white/10 transition-colors",
              item.status === 'picked' ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10'
            )} onClick={() => navigate(createPageUrl(`Inventory?id=${item.article_id}`))}>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{item.article_name}</p>
                {article?.shelf_address?.[0] && (
                  <p className="text-white/40 text-xs mt-1">{article.shelf_address[0]}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm">{item.quantity_ordered} st</span>
                <Badge className={cn("border",
                  item.status === 'picked' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                  missing > 0 ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                  'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                )}>
                  {status}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10">
        <Button
          size="sm"
          className="w-full bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-red-400 gap-2 border"
          onClick={handleWithdraw}
        >
          <Minus className="w-4 h-4" />
          Ta ut från Lagret
        </Button>
      </div>
    </div>
  );
}