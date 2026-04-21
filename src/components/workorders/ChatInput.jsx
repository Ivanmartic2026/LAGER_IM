import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function ChatInput({ onSend, users = [], disabled = false }) {
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const filteredUsers = users.filter(u =>
    mentionSearch && (
      u.full_name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(mentionSearch.toLowerCase())
    )
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (showMentions && (e.key === 'Escape')) {
      setShowMentions(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setBody(val);

    // Detect @mention trigger
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const atIdx = textBefore.lastIndexOf('@');
    if (atIdx !== -1) {
      const after = textBefore.slice(atIdx + 1);
      if (!after.includes(' ')) {
        setMentionSearch(after);
        setMentionStart(atIdx);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
    setMentionSearch('');
  };

  const insertMention = (user) => {
    const before = body.slice(0, mentionStart);
    const after = body.slice(mentionStart + 1 + mentionSearch.length);
    const name = user.full_name || user.email;
    const newBody = `${before}@${name} ${after}`;
    setBody(newBody);
    setShowMentions(false);
    setMentionSearch('');
    textareaRef.current?.focus();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const results = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f })));
      const newAtts = results.map((r, i) => ({
        url: r.file_url,
        filename: files[i].name,
        mime_type: files[i].type,
        size: files[i].size
      }));
      setAttachments(prev => [...prev, ...newAtts]);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    if (!body.trim() && attachments.length === 0) return;

    // Extract mentions from body
    const mentionMatches = body.match(/@([\w\s.]+?)(?= |$|@)/g) || [];
    const mentionNames = mentionMatches.map(m => m.slice(1).trim());
    const mentions = users
      .filter(u => mentionNames.some(name =>
        (u.full_name || '').toLowerCase().includes(name.toLowerCase()) ||
        u.email.toLowerCase().includes(name.toLowerCase())
      ))
      .map(u => u.email);

    onSend({ body: body.trim(), attachments, mentions });
    setBody('');
    setAttachments([]);
  };

  return (
    <>
    <div className="relative">
      {/* Mention dropdown */}
      {showMentions && filteredUsers.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-zinc-900 border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50 max-h-48 overflow-y-auto">
          {filteredUsers.map(u => (
            <button
              key={u.email}
              onClick={() => insertMention(u)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/8 text-left"
            >
              <div className="w-6 h-6 rounded-full bg-signal/20 border border-signal/30 flex items-center justify-center text-xs text-signal font-bold">
                {(u.full_name || u.email)[0].toUpperCase()}
              </div>
              <div>
                <div className="text-xs text-white font-medium">{u.full_name || u.email}</div>
                <div className="text-[10px] text-white/40">{u.role || ''}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 px-1">
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-white/8 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70">
              <Paperclip className="w-3 h-3 text-white/40" />
              <span className="max-w-24 truncate">{att.filename}</span>
              <button onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}
                      className="text-white/30 hover:text-white/70 ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-white/40 hover:text-white/70 transition-colors mb-0.5 flex-shrink-0"
          title="Bifoga fil"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Skriv ett meddelande... (@namn för att omnämna)"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 resize-none outline-none min-h-[36px] max-h-32 leading-relaxed"
          rows={1}
          style={{ height: 'auto' }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || uploading || (!body.trim() && attachments.length === 0)}
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 mb-0.5',
            (body.trim() || attachments.length > 0)
              ? 'bg-signal hover:bg-signal-hover text-white'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          )}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
    {/* Safe area spacer for iOS home indicator in standalone mode */}
    <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </>
  );
}