import { sectionTitle } from './printStyles';

const ROLE_CONFIG = {
  pl_konstruktor: { label: 'Projektledare / Konstruktör', bg: '#1B3F6E', color: '#fff' },
  lager: { label: 'Lager', bg: '#854F0B', color: '#fff' },
  tekniker: { label: 'Tekniker', bg: '#0F6E56', color: '#fff' },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { label: 'Övriga uppgifter', bg: '#666', color: '#fff' };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color,
      padding: '2px 8px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {cfg.label}
    </span>
  );
}

function TaskRow({ task }) {
  const isHighPrio = task.priority === 'high' || task.priority === 'urgent';
  const isDone = task.status === 'completed' || task.status === 'klar';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 6,
      padding: '3px 0', borderBottom: '1px solid #f0f0f0',
    }}>
      <span style={{ fontSize: 14, lineHeight: '18px', flexShrink: 0 }}>
        {isDone ? '☑' : '☐'}
      </span>
      <div style={{ flex: 1 }}>
        <span style={{
          fontSize: 11, fontWeight: 500,
          textDecoration: isDone ? 'line-through' : 'none',
          color: isDone ? '#999' : '#111',
        }}>
          {task.name}
        </span>
        {isHighPrio && (
          <span style={{ color: '#DC2626', fontSize: 10, fontWeight: 700, marginLeft: 6 }}>
            ★ HÖG PRIO
          </span>
        )}
        <div style={{ fontSize: 10, color: '#888' }}>
          {task.assigned_to_name && <span>{task.assigned_to_name}</span>}
          {task.due_date && <span style={{ marginLeft: 8 }}>Klart: {task.due_date}</span>}
        </div>
      </div>
    </div>
  );
}

export default function PrintTasksSection({ tasks }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div>
        <div style={sectionTitle}>Uppgifter per roll</div>
        <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', padding: '8px 0' }}>
          Inga uppgifter registrerade
        </div>
      </div>
    );
  }

  const grouped = {};
  tasks.forEach(t => {
    const key = t.role || '_other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  // Sort each group: high prio first, then incomplete, then complete
  const prioOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  Object.values(grouped).forEach(arr => {
    arr.sort((a, b) => {
      const aDone = a.status === 'completed' || a.status === 'klar' ? 1 : 0;
      const bDone = b.status === 'completed' || b.status === 'klar' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return (prioOrder[a.priority] || 2) - (prioOrder[b.priority] || 2);
    });
  });

  const roleOrder = ['pl_konstruktor', 'lager', 'tekniker', '_other'];

  return (
    <div>
      <div style={sectionTitle}>Uppgifter per roll</div>
      {roleOrder.map(role => {
        const items = grouped[role];
        if (!items || items.length === 0) return null;
        return (
          <div key={role} style={{ marginBottom: 10 }}>
            <div style={{ marginBottom: 4 }}><RoleBadge role={role === '_other' ? null : role} /></div>
            {items.map((t, i) => <TaskRow key={i} task={t} />)}
          </div>
        );
      })}
    </div>
  );
}