import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_COLORS = {
  admin:        'bg-signal/20 text-signal border-signal/30',
  säljare:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
  konstruktor:  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  inkopare:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  lager:        'bg-green-500/20 text-green-300 border-green-500/30',
  produktion:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  tekniker:     'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  projektledare:'bg-pink-500/20 text-pink-300 border-pink-500/30',
};

function RoleBadge({ role }) {
  const classes = ROLE_COLORS[role?.toLowerCase()] || 'bg-white/10 text-white/60 border-white/20';
  return (
    <span className={cn('text-[10px] font-brand px-1.5 py-0.5 rounded border', classes)}>
      {role || 'user'}
    </span>
  );
}

function AttachmentPreview({ att }) {
  const isImage = att.mime_type?.startsWith('image/');
  if (isImage) {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block max-w-xs mt-1">
        <img src={att.url} alt={att.filename} className="rounded-lg max-h-48 object-contain border border-white/10" />
      </a>
    );
  }
  return (
    <a href={att.url} target="_blank" rel="noopener noreferrer"
       className="flex items-center gap-2 text-xs text-white/60 hover:text-white bg-white/5 border border-white/10 rounded-lg px-3 py-2 mt-1 max-w-xs">
      <FileText className="w-4 h-4 flex-shrink-0 text-signal" />
      <span className="truncate">{att.filename || 'Fil'}</span>
    </a>
  );
}

function renderBody(body) {
  // Highlight @mentions
  const parts = body.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-signal font-medium">{part}</span>
      : part
  );
}

export default function ChatMessageItem({ message, isOwn, readers = [] }) {
  const time = message.created_date
    ? formatDistanceToNow(new Date(message.created_date), { addSuffix: true, locale: sv })
    : '';

  if (message.deleted) {
    return (
      <div className="flex gap-3 px-1 py-1">
        <div className="w-7 h-7 rounded-full bg-white/5 flex-shrink-0" />
        <p className="text-xs text-white/30 italic mt-1">Meddelandet har tagits bort</p>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2.5 px-1 py-1 group', isOwn && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-signal/20 border border-signal/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-signal mt-0.5">
        {(message.author_name || message.author_email || '?')[0].toUpperCase()}
      </div>

      <div className={cn('flex flex-col max-w-[78%]', isOwn && 'items-end')}>
        {/* Header */}
        <div className={cn('flex items-center gap-2 mb-1', isOwn && 'flex-row-reverse')}>
          <span className="text-xs font-semibold text-white/80">
            {isOwn ? 'Du' : (message.author_name || message.author_email)}
          </span>
          {message.author_role && <RoleBadge role={message.author_role} />}
          <span className="text-[10px] text-white/30">{time}</span>
          {message.edited && <span className="text-[10px] text-white/20">(redigerad)</span>}
        </div>

        {/* Bubble */}
        <div className={cn(
          'rounded-2xl px-3 py-2 text-sm leading-relaxed',
          isOwn
            ? 'bg-signal text-white rounded-tr-sm'
            : 'bg-white/8 text-white/90 border border-white/10 rounded-tl-sm'
        )}>
          {renderBody(message.body)}
        </div>

        {/* Attachments */}
        {(message.attachments || []).map((att, i) => (
          <AttachmentPreview key={i} att={att} />
        ))}

        {/* Read receipts */}
        {readers.length > 0 && (
          <div className={cn('flex gap-0.5 mt-1', isOwn && 'flex-row-reverse')}>
            {readers.slice(0, 5).map((r, i) => (
              <div key={i} title={r.user_email}
                   className="w-4 h-4 rounded-full bg-green-500/30 border border-green-500/50 flex items-center justify-center text-[8px] text-green-300">
                {(r.user_email || '?')[0].toUpperCase()}
              </div>
            ))}
            {readers.length > 5 && (
              <span className="text-[9px] text-white/30 ml-0.5">+{readers.length - 5}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}