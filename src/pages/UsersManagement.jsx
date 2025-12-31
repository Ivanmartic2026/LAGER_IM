import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Users, Search, UserPlus, Shield, Mail, Calendar, 
  ArrowLeft, Trash2, Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UsersManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const inviteUserMutation = useMutation({
    mutationFn: ({ email, role }) => base44.users.inviteUser(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("user");
      toast.success("Inbjudan skickad!");
    },
    onError: (error) => {
      toast.error(`Kunde inte bjuda in användare: ${error.message}`);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteConfirm(null);
      toast.success("Användare borttagen");
    },
    onError: (error) => {
      toast.error(`Kunde inte ta bort användare: ${error.message}`);
    }
  });

  const handleInvite = () => {
    if (!inviteEmail) {
      toast.error("Ange en e-postadress");
      return;
    }
    inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleDeleteUser = (user) => {
    if (user.id === currentUser?.id) {
      toast.error("Du kan inte ta bort dig själv");
      return;
    }
    deleteUserMutation.mutate(user.id);
  };

  const filteredUsers = users.filter(user => 
    !searchQuery || 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    regularUsers: users.filter(u => u.role === 'user').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to={createPageUrl("Admin")}>
            <Button
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-800 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Admin
            </Button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Användarhantering</h1>
              <p className="text-sm text-slate-400">Hantera användare och behörigheter</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Totalt</p>
              <p className="text-2xl font-bold text-white">{userStats.total}</p>
            </div>
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
              <p className="text-sm text-indigo-300 mb-1">Admins</p>
              <p className="text-2xl font-bold text-white">{userStats.admins}</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-blue-300 mb-1">Användare</p>
              <p className="text-2xl font-bold text-white">{userStats.regularUsers}</p>
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök användare..."
                className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <Button
              onClick={() => setInviteModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Bjud in
            </Button>
          </div>
        </motion.div>

        {/* Users List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchQuery ? "Inga användare hittades" : "Inga användare ännu"}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchQuery ? "Prova ett annat sökord" : "Bjud in din första användare"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setInviteModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500">
                <UserPlus className="w-4 h-4 mr-2" />
                Bjud in användare
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredUsers.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                        user.role === 'admin' ? "bg-indigo-500/20" : "bg-slate-700/50"
                      )}>
                        {user.role === 'admin' ? (
                          <Crown className="w-6 h-6 text-indigo-400" />
                        ) : (
                          <Users className="w-6 h-6 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white truncate">
                            {user.full_name || "Okänd användare"}
                          </h3>
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                              Du
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </span>
                          {user.created_date && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(user.created_date), "d MMM yyyy", { locale: sv })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={cn(
                        "border",
                        user.role === 'admin' 
                          ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" 
                          : "bg-slate-700/50 text-slate-300 border-slate-600"
                      )}>
                        {user.role === 'admin' ? (
                          <><Shield className="w-3 h-3 mr-1" />Admin</>
                        ) : (
                          'Användare'
                        )}
                      </Badge>

                      {currentUser?.role === 'admin' && user.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(user)}
                          className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Invite User Modal */}
        <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Bjud in användare
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Skicka en inbjudan till en ny användare
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  E-postadress
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="namn@exempel.se"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Roll
                </label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Användare</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setInviteModalOpen(false)}
                  className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                >
                  Avbryt
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviteUserMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500"
                >
                  {inviteUserMutation.isPending ? "Skickar..." : "Skicka inbjudan"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <DialogContent className="bg-slate-900 border-red-500/30 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <Trash2 className="w-5 h-5" />
                Ta bort användare
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Är du säker på att du vill ta bort denna användare?
              </DialogDescription>
            </DialogHeader>
            
            {deleteConfirm && (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-4">
                <p className="font-medium text-white mb-1">{deleteConfirm.full_name}</p>
                <p className="text-sm text-slate-400">{deleteConfirm.email}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
              >
                Avbryt
              </Button>
              <Button
                onClick={() => deleteConfirm && handleDeleteUser(deleteConfirm)}
                disabled={deleteUserMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-500"
              >
                {deleteUserMutation.isPending ? "Tar bort..." : "Ta bort"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}