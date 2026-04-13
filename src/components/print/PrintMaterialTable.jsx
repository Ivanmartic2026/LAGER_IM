import { sectionTitle, tableHeader, tableCell } from './printStyles';

export default function PrintMaterialTable({ workOrder, orderItems, articles, title, showPickedStatus }) {
  // Combine materials_needed + orderItems, dedup by article_id
  const materials = workOrder?.materials_needed || [];
  const combined = [];
  const seen = new Set();

  materials.forEach(m => {
    combined.push({
      article_name: m.article_name || '—',
      article_id: m.article_id || '',
      quantity: m.quantity || 0,
      batch_number: m.batch_number || '',
      shelf_address: m.shelf_address || '',
      status: 'pending',
    });
    if (m.article_id) seen.add(m.article_id);
  });

  (orderItems || []).forEach(oi => {
    if (oi.article_id && seen.has(oi.article_id)) return;
    combined.push({
      article_name: oi.article_name || '—',
      article_id: oi.article_id || '',
      quantity: oi.quantity_ordered || 0,
      batch_number: oi.article_batch_number || '',
      shelf_address: oi.shelf_address || '',
      status: oi.status || 'pending',
    });
    if (oi.article_id) seen.add(oi.article_id);
  });

  // Resolve SKUs
  const articleMap = {};
  (articles || []).forEach(a => { articleMap[a.id] = a; });

  const getSku = (articleId) => {
    const art = articleMap[articleId];
    return art?.sku || (articleId ? articleId.slice(0, 8) : '—');
  };

  const statusIcon = (s) => {
    if (s === 'picked') return '☑';
    if (s === 'partial') return '◐';
    return '☐';
  };

  if (combined.length === 0) {
    return (
      <div>
        <div style={sectionTitle}>{title || 'Materialförteckning (BOM)'}</div>
        <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', padding: '8px 0' }}>
          Inga artiklar registrerade ännu
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={sectionTitle}>{title || 'Materialförteckning (BOM)'}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...tableHeader, width: 24 }}>#</th>
            <th style={tableHeader}>Artikel</th>
            <th style={{ ...tableHeader, width: 70 }}>Art.nr</th>
            <th style={{ ...tableHeader, width: 45, textAlign: 'center' }}>Antal</th>
            <th style={{ ...tableHeader, width: 40, textAlign: 'center' }}>Enhet</th>
            <th style={{ ...tableHeader, width: 70 }}>Batch</th>
            <th style={{ ...tableHeader, width: 55 }}>Hylla</th>
            <th style={{ ...tableHeader, width: 45, textAlign: 'center' }}>
              {showPickedStatus ? 'Status' : 'Plockat'}
            </th>
          </tr>
        </thead>
        <tbody>
          {combined.map((m, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
              <td style={{ ...tableCell, color: '#999' }}>{i + 1}</td>
              <td style={{ ...tableCell, fontWeight: 500 }}>{m.article_name}</td>
              <td style={{ ...tableCell, fontFamily: 'monospace', fontSize: 10 }}>{getSku(m.article_id)}</td>
              <td style={{ ...tableCell, textAlign: 'center' }}>{m.quantity}</td>
              <td style={{ ...tableCell, textAlign: 'center', color: '#888' }}>st</td>
              <td style={{ ...tableCell, fontSize: 10 }}>{m.batch_number || '—'}</td>
              <td style={{ ...tableCell, fontSize: 10 }}>{m.shelf_address || '—'}</td>
              <td style={{ ...tableCell, textAlign: 'center', fontSize: 14 }}>
                {showPickedStatus ? statusIcon(m.status) : '☐'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}