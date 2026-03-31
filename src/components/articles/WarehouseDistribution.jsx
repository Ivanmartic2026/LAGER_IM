import React from 'react';

export default function WarehouseDistribution({ article, siblingArticles, isEditing }) {
  if (isEditing || !siblingArticles || siblingArticles.length === 0) {
    return null;
  }

  const totalStock = siblingArticles.reduce((sum, a) => sum + (a.stock_qty || 0), article.stock_qty || 0);

  return (
    <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/30">
      <p className="text-xs text-blue-300 mb-3 font-bold uppercase tracking-wide">📦 Lagerfördelning (samma SKU)</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-sm font-semibold text-white">{article.warehouse || 'Okänt lager'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-300">x</span>
            <span className="text-lg font-bold text-blue-300">{article.stock_qty || 0}</span>
          </div>
        </div>
        {siblingArticles.map(sibling => (
          <div key={sibling.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span className="text-sm font-medium text-slate-300">{sibling.warehouse || 'Okänt lager'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">x</span>
              <span className="text-lg font-bold text-slate-300">{sibling.stock_qty || 0}</span>
            </div>
          </div>
        ))}
        <div className="border-t border-blue-500/30 mt-2 pt-2 flex items-center justify-between p-2 rounded-lg bg-blue-500/10">
          <span className="text-sm font-bold text-blue-300">TOTALT</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-300">x</span>
            <span className="text-xl font-bold text-blue-300">{totalStock}</span>
          </div>
        </div>
      </div>
    </div>
  );
}