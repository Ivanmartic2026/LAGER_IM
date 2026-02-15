import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, AtSign, MessageCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export default function ProductionComments({ 
  comments = [], 
  users = [],
  currentUser,
  onAddComment,
  isLoading
}) {
  const [commentText, setCommentText] = useState('');
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const inputRef = useRef(null);

  const handleMentionSearch = (text) => {
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const searchText = text.substring(lastAtIndex + 1).toLowerCase();
      setMentionSearch(searchText);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
      setMentionSearch('');
    }
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setCommentText(text);
    handleMentionSearch(text);
  };

  const handleSelectUser = (user) => {
    const lastAtIndex = commentText.lastIndexOf('@');
    const beforeMention = commentText.substring(0, lastAtIndex);
    const newText = beforeMention + `@${user.full_name} `;
    setCommentText(newText);
    
    if (!mentionedUsers.find(u => u.id === user.id)) {
      setMentionedUsers([...mentionedUsers, user]);
    }
    
    setShowMentionDropdown(false);
    setMentionSearch('');
    inputRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    await onAddComment({
      content: commentText,
      mentioned_users: mentionedUsers.map(u => u.email)
    });

    setCommentText('');
    setMentionedUsers([]);
    setShowMentionDropdown(false);
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(mentionSearch) && 
    u.id !== currentUser?.id
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-white/10 p-5">
        <h3 className="font-bold text-lg text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
          </div>
          Kommunikation
        </h3>
      </div>

      {/* Comments List */}
      <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/50">Inga kommentarer ännu</p>
            <p className="text-sm text-white/40 mt-1">Ställ frågor eller klargöra något om ordern</p>
          </div>
        ) : (
          <AnimatePresence>
            {comments.map((comment, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                {/* Comment Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{comment.created_by}</p>
                      <p className="text-xs text-white/40">
                        {format(new Date(comment.created_date), 'd MMM HH:mm', { locale: sv })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comment Content */}
                <p className="text-white/80 text-sm mb-2 leading-relaxed">{comment.content}</p>

                {/* Mentioned Users */}
                {comment.mentioned_users?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {comment.mentioned_users.map((email, i) => (
                      <Badge
                        key={i}
                        className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs"
                      >
                        <AtSign className="w-3 h-3 mr-1" />
                        {email.split('@')[0]}
                      </Badge>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Comment Input */}
      <div className="border-t border-white/10 p-5 bg-white/5">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Mention Dropdown */}
          <AnimatePresence>
            {showMentionDropdown && filteredUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-zinc-900 border border-white/20 rounded-lg overflow-hidden shadow-lg"
              >
                {filteredUsers.slice(0, 5).map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors flex items-center gap-2 group"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="w-3 h-3 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white group-hover:text-blue-400">
                        {user.full_name}
                      </div>
                      <div className="text-xs text-white/40">{user.email}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mentioned Users Display */}
          {mentionedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mentionedUsers.map(user => (
                <Badge
                  key={user.id}
                  className="bg-blue-500/20 text-blue-300 border-blue-500/30"
                >
                  <AtSign className="w-3 h-3 mr-1" />
                  {user.full_name}
                  <button
                    type="button"
                    onClick={() => setMentionedUsers(mentionedUsers.filter(u => u.id !== user.id))}
                    className="ml-1 hover:text-blue-200"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Input Field */}
          <div className="relative flex gap-2">
            <Input
              ref={inputRef}
              value={commentText}
              onChange={handleInputChange}
              placeholder="Skriv en kommentar eller @ för att ställa en fråga..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm"
            />
            <Button
              type="submit"
              disabled={!commentText.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-500 px-4 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Skicka</span>
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-white/40 flex items-center gap-1">
            <AtSign className="w-3 h-3" />
            Skriv @ för att mentionera en person
          </p>
        </form>
      </div>
    </motion.div>
  );
}