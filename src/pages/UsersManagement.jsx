import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Loader2, Plus, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language/LanguageProvider";
import { t } from "@/components/language/translations";

const AVAILABLE_MODULES = [
  { id: "Inventory", labelKey: "module_inventory" },
  { id: "Orders", labelKey: "module_orders" },
  { id: "Production", labelKey: "module_production" },
  { id: "PurchaseOrders", labelKey: "module_purchase_orders" },
  { id: "SiteReports", labelKey: "module_site_reports" },
  { id: "UnknownDeliveries", labelKey: "module_unknown_deliveries" },
  { id: "Repairs", labelKey: "module_repairs" },
  { id: "Reports", labelKey: "module_reports" }
];

export default function UsersManagement() {
  const [expandedUser, setExpandedUser] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, allowed_modules }) => {
      const response = await base44.functions.invoke('updateUserModules', { userId, allowed_modules });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(language === 'sv' ? 'Användaråtkomst uppdaterad' : 'User access updated');
    },
    onError: (error) => {
      toast.error(language === 'sv' ? 'Kunde inte uppdatera användaråtkomst' : 'Failed to update user access');
    }
  });

  const updateNameMutation = useMutation({
    mutationFn: async ({ userId, full_name }) => {
      const response = await base44.functions.invoke('updateUserName', { userId, full_name });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUserId(null);
      setEditingName('');
      toast.success(language === 'sv' ? 'Namn uppdaterat' : 'Name updated');
    },
    onError: (error) => {
      toast.error(language === 'sv' ? 'Kunde inte uppdatera namn' : 'Failed to update name');
    }
  });

  const handleModuleToggle = (userId, moduleId, currentModules) => {
    const newModules = currentModules.includes(moduleId)
      ? currentModules.filter(m => m !== moduleId)
      : [...currentModules, moduleId];
    
    updateUserMutation.mutate({ userId, allowed_modules: newModules });
  };

  const handleSaveName = (userId, newName) => {
    if (newName.trim()) {
      updateNameMutation.mutate({ userId, full_name: newName });
    }
  };

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      const response = await base44.users.inviteUser(email, role);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setInviteEmail('');
      setInviteRole('user');
      setShowInviteModal(false);
      toast.success(language === 'sv' ? 'Användare inbjuden!' : 'User invited!');
    },
    onError: (error) => {
      toast.error(language === 'sv' ? 'Kunde inte bjuda in användare' : 'Failed to invite user');
    }
  });

  const handleInviteUser = () => {
    if (!inviteEmail.trim()) {
      toast.error(language === 'sv' ? 'Ange e-postadress' : 'Enter email address');
      return;
    }
    inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{t('users_title', language)}</h1>
              <p className="text-sm text-white/50">{t('users_manage_access', language)}</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          {users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-all cursor-pointer">
                <div
                  onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                  className="p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {editingUserId === user.id ? (
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            placeholder={user.full_name}
                            className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                          />
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveName(user.id, editingName);
                            }}
                            disabled={updateNameMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {updateNameMutation.isPending ? 'Sparar...' : 'Spara'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingUserId(null);
                            }}
                          >
                            Avbryt
                          </Button>
                        </div>
                      ) : (
                        <h3
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingUserId(user.id);
                            setEditingName(user.full_name);
                          }}
                          className="text-lg font-semibold text-white hover:text-blue-400 cursor-pointer transition-colors"
                        >
                          {user.full_name}
                        </h3>
                      )}
                      <p className="text-sm text-white/50">{user.email}</p>
                      <p className="text-xs text-white/40 mt-1">
                        {t('users_role', language)}: <span className="font-semibold text-blue-400">{user.role}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/50 mb-2">
                        {user.allowed_modules?.length || 0}/{AVAILABLE_MODULES.length} {t('users_modules', language)}
                      </p>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {user.allowed_modules?.slice(0, 3).map(mod => (
                          <span key={mod} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                            {mod}
                          </span>
                        ))}
                        {user.allowed_modules?.length > 3 && (
                          <span className="px-2 py-1 bg-blue-500/10 text-blue-300 text-xs rounded">
                            +{user.allowed_modules.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {expandedUser === user.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-white/10 p-6"
                  >
                    <p className="text-sm font-semibold text-white/70 mb-6">{t('users_select_modules', language)}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {AVAILABLE_MODULES.map(module => (
                        <label key={module.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 hover:border hover:border-white/20 transition-all cursor-pointer border border-white/10">
                          <Checkbox
                            checked={user.allowed_modules?.includes(module.id) || false}
                            onCheckedChange={() => handleModuleToggle(
                              user.id,
                              module.id,
                              user.allowed_modules || []
                            )}
                            disabled={updateUserMutation.isPending}
                            className="w-6 h-6"
                          />
                          <span className="text-white/80 font-medium">{t(module.labelKey, language)}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/50">{language === 'sv' ? 'Inga användare hittade' : 'No users found'}</p>
          </div>
        )}
      </div>
    </div>
  );
}