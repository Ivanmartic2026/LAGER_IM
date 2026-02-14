import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, MessageSquare, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function ArticleComments({ articleId }) {
  const [commentText, setCommentText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['articleComments', articleId],
    queryFn: () => base44.entities.ArticleComment.filter({ article_id: articleId }, '-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createCommentMutation = useMutation({
    mutationFn: async (text) => {
      const mentionedEmails = extractMentions(text);
      const response = await base44.functions.invoke('createArticleComment', {
        articleId,
        content: text,
        mentionedUsers: mentionedEmails
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articleComments', articleId] });
      setCommentText("");
      toast.success("Kommentar tillagd");
    },
    onError: (error) => {
      toast.error("Kunde inte spara kommentar");
    }
  });

  const extractMentions = (text) => {
    const regex = /@(\S+)/g;
    const mentions = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const username = match[1];
      const user = users.find(u => u.full_name.toLowerCase().includes(username.toLowerCase()));
      if (user) mentions.push(user.email);
    }
    return mentions;
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setCommentText(text);
    setCursorPos(e.target.selectionStart);

    // Check for @ mention
    const lastAt = text.lastIndexOf('@', cursorPos);
    if (lastAt !== -1 && lastAt === cursorPos - 1) {
      setShowSuggestions(true);
      setSuggestions(users);
    } else if (lastAt !== -1) {
      const searchText = text.substring(lastAt + 1, cursorPos).toLowerCase();
      const filtered = users.filter(u => 
        u.full_name.toLowerCase().includes(searchText) ||
        u.email.toLowerCase().includes(searchText)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (user) => {
    const lastAt = commentText.lastIndexOf('@');
    const newText = commentText.substring(0, lastAt) + `@${user.full_name} `;
    setCommentText(newText);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = () => {
    if (commentText.trim()) {
      createCommentMutation.mutate(commentText);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 rounded-xl p-6 border border-slate-700"
    >
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-blue-400" />
        <h3 className="font-semibold text-white">Kommentarer ({comments.length})</h3>
      </div>

      {/* Comment Input */}
      <div className="mb-6 relative">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={commentText}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSubmit();
              }
            }}
            placeholder="Skriv en kommentar... Använd @ för att nämna någon"
            className="bg-slate-800 border-slate-700 text-white resize-none focus:border-blue-500 min-h-24"
          />
          
          {/* @ Mention Suggestions */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-full mb-2 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
              >
                {suggestions.map(user => (
                  <button
                    key={user.id}
                    onClick={() => insertMention(user)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <User className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="font-medium text-white">{user.full_name}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="outline"
            onClick={() => setCommentText("")}
            className="bg-slate-800 border-slate-700 hover:bg-slate-700"
            disabled={!commentText.trim()}
          >
            Rensa
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!commentText.trim() || createCommentMutation.isPending}
            className="bg-blue-600 hover:bg-blue-500"
          >
            {createCommentMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Skickar...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Skicka
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        <AnimatePresence>
          {comments.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              Inga kommentarer ännu
            </div>
          ) : (
            comments.map(comment => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-white">
                    {comment.created_by}
                  </div>
                  <span className="text-xs text-slate-400">
                    {format(new Date(comment.created_date), "d MMM yyyy HH:mm", { locale: sv })}
                  </span>
                </div>
                <p className="text-slate-200 text-sm whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
                {comment.mentioned_users && comment.mentioned_users.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {comment.mentioned_users.map((email, idx) => (
                      <span key={idx} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                        @{email.split('@')[0]}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}