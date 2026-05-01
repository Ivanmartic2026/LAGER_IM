import React from 'react';

export default function BatchMigrationCategoryTable({ articles, groups, categoryKey }) {
  // For TRUE_DUPLICATE and FALSE_DUPLICATE we get groups, not flat articles
  if (groups && groups.length > 0) {
    return (
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {groups.map((g, i) => (
          <div key={i} className="bg-black/30 rounded-lg p-3">
            <p className="text-xs font-bold text-white/70 mb-2 font-mono">{g.batch_number}</p>
            {g.total_qty !== undefined && (
              <p className="text-xs text-white/40 mb-2">Summerad kvantitet: {g.total_qty}</p>
            )}
            <div className="space-y-1">
              {(g.articles || []).map(a => (
                <div key={a.id} className="flex gap-3 text-xs text-white/50 py-1 border-b border-white/5">
                  <span className="font-mono text-white/30">{a.id?.slice(0, 8)}</span>
                  <span className="text-white/70 flex-1 truncate">{a.name}</span>
                  <span className="text-white/40">{a.supplier_name || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return <p className="text-white/30 text-sm text-center py-4">Inga artiklar i denna kategori.</p>;
  }

  return (
    <div className="max-h-80 overflow-y-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/30 border-b border-white/10">
            <th className="text-left py-2 pr-3">ID</th>
            <th className="text-left py-2 pr-3">Namn</th>
            <th className="text-left py-2 pr-3">batch_number</th>
            <th className="text-left py-2 pr-3">Leverantör</th>
            {categoryKey === 'JUNK' && <th className="text-left py-2">Anledning</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {articles.map(a => (
            <tr key={a.id} className="text-white/60 hover:text-white/80 transition-colors">
              <td className="py-2 pr-3 font-mono text-white/30">{a.id?.slice(0, 8)}</td>
              <td className="py-2 pr-3 truncate max-w-[160px]">{a.name}</td>
              <td className="py-2 pr-3 font-mono text-white/50 truncate max-w-[120px]">{a.batch_number}</td>
              <td className="py-2 pr-3">{a.supplier_name || '—'}</td>
              {categoryKey === 'JUNK' && (
                <td className="py-2 text-red-400">{a.reason || '—'}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}