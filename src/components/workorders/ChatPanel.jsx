import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Loader2, Bell, BellOff } from 'lucide-react';
import ChatMessageItem from './ChatMessageItem';
import ChatInput from './ChatInput';

const POLL_INTERVAL = 8000; // 8s polling

export default function ChatPanel({ workOrder, currentUser }) {
  const workOrderId = workOrder?.id;
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Fetch all users for @mention autocomplete
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users_for_chat'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 5 * 60 * 1000
  });

  // Fetch messages — poll every 8s
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chatMessages', workOrderId],
    queryFn: () => base44.entities.ChatMessage.filter(
      { work_order_id: workOrderId, thread_type: 'general' },
      'created_date',
      200
    ),
    enabled: !!workOrderId,
    refetchInterval: POLL_INTERVAL,
    staleTime: 0
  });

  // Real-time subscription
  useEffect(() => {
    if (!workOrderId) return;
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.work_order_id === workOrderId && event.data?.thread_type === 'general') {
        queryClient.invalidateQueries({ queryKey: ['chatMessages', workOrderId] });
      }
    });
    return unsub;
  }, [workOrderId, queryClient]);

  // Fetch read receipts for this work order
  const { data: readReceipts = [] } = useQuery({
    queryKey: ['chatReads', workOrderId],
    queryFn: () => base44.entities.ChatRead.filter({ work_order_id: workOrderId }),
    enabled: !!workOrderId,
    refetchInterval: POLL_INTERVAL * 2
  });

  // Mark messages as read when panel is visible
  const markAsRead = useCallback(async () => {
    if (!currentUser?.email || !messages.length) return;
    const alreadyRead = new Set(
      readReceipts.filter(r => r.user_email === currentUser.email).map(r => r.message_id)
    );
    const unread = messages.filter(m => !alreadyRead.has(m.id) && m.author_email !== currentUser.email);
    if (unread.length === 0) return;
    await Promise.all(unread.map(m =>
      base44.entities.ChatRead.create({
        message_id: m.id,
        work_order_id: workOrderId,
        user_email: currentUser.email,
        read_at: new Date().toISOString()
      }).catch(() => {})
    ));
    queryClient.invalidateQueries({ queryKey: ['chatReads', workOrderId] });
  }, [messages, readReceipts, currentUser, workOrderId, queryClient]);

  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages.length, markAsRead]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, autoScroll]);

  // Detect manual scroll (disable auto-scroll)
  const handleScroll = (e) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(atBottom);
  };

  // Group readers per message
  const readersByMessage = {};
  for (const r of readReceipts) {
    if (!readersByMessage[r.message_id]) readersByMessage[r.message_id] = [];
    if (r.user_email !== currentUser?.email) {
      readersByMessage[r.message_id].push(r);
    }
  }

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async ({ body, attachments, mentions }) => {
      const msg = await base44.entities.ChatMessage.create({
        work_order_id: workOrderId,
        thread_type: 'general',
        thread_key: '',
        author_email: currentUser.email,
        author_name: currentUser.full_name || currentUser.email,
        author_role: currentUser.role || 'user',
        body,
        attachments: attachments || [],
        mentions: mentions || []
      });

      // Trigger push notifications for mentions
      if (mentions?.length > 0) {
        base44.functions.invoke('sendChatNotification', {
          message_id: msg.id,
          work_order_id: workOrderId,
          order_number: workOrder?.order_number,
          work_order_name: workOrder?.name,
          author_name: currentUser.full_name || currentUser.email,
          body,
          mentions
        }).catch(() => {});
      }

      return msg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', workOrderId] });
      setAutoScroll(true);
    }
  });

  const handleSend = ({ body, attachments, mentions }) => {
    if (!currentUser) return;
    sendMutation.mutate({ body, attachments, mentions });
  };

  // Filter relevant users (those tied to this WO)
  const relevantEmails = new Set([
    workOrder?.assigned_to_konstruktion,
    workOrder?.assigned_to_produktion,
    workOrder?.assigned_to_lager,
    workOrder?.assigned_to_montering,
    workOrder?.assigned_to_leverans,
  ].filter(Boolean));

  const suggestedUsers = allUsers.filter(u =>
    u.email !== currentUser?.email && (
      relevantEmails.has(u.email) ||
      ['admin', 'ivan'].includes(u.role?.toLowerCase()) ||
      u.role === 'admin'
    )
  );
  // Also include all users for @mention (fallback)
  const mentionUsers = allUsers.filter(u => u.email !== currentUser?.email);

  return (
    <div className="bg-black rounded-2xl border border-white/10 flex flex-col" style={{ minHeight: '420px', maxHeight: '600px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-signal" />
          <h3 className="text-sm font-brand text-white tracking-wide">Dialog</h3>
          {messages.length > 0 && (
            <span className="text-[10px] text-white/30 font-body">{messages.length} meddelanden</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
        onScroll={handleScroll}
        style={{ overscrollBehavior: 'contain' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full py-12">
            <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="w-8 h-8 text-white/15 mb-3" />
            <p className="text-sm text-white/30">Ingen dialog ännu</p>
            <p className="text-xs text-white/20 mt-1">Var den första att skriva ett meddelande</p>
          </div>
        ) : (
          messages
            .filter(m => !m.deleted)
            .map(msg => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                isOwn={msg.author_email === currentUser?.email}
                readers={readersByMessage[msg.id] || []}
              />
            ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-white/8">
        <ChatInput
          onSend={handleSend}
          users={mentionUsers}
          disabled={sendMutation.isPending || !currentUser}
        />
        {sendMutation.isPending && (
          <p className="text-[10px] text-white/30 mt-1 pl-1">Skickar...</p>
        )}
      </div>
    </div>
  );
}