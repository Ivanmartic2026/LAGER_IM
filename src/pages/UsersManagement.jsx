import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AVAILABLE_MODULES = [
  { id: "Inventory", label: "Lager" },
  { id: "Orders", label: "Ordrar" },
  { id: "Production", label: "Produktion" },
  { id: "PurchaseOrders", label: "Inköpsordrar" },
  { id: "SiteReports", label: "Site Reports" },
  { id: "UnknownDeliveries", label: "Okända leveranser" },
  { id: "Repairs", label: "Reparationer" },
  { id: "Reports", label: "Rapporter" }
];

export default function UsersManagement() {
  const [expandedUser, setExpandedUser] = useState(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, allowed_modules }) => {
      await base44.auth.updateMe({ allowed_modules });
      return { userId, allowed_modules };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Användaråtkomst uppdaterad');
    },
    onError: (error) => {
      toast.error('Kunde inte uppdatera användaråtkomst');
    }
  });

  const handleModuleToggle = (userId, moduleId, currentModules) => {
    const newModules = currentModules.includes(moduleId)
      ? currentModules.filter(m => m !== moduleId)
      : [...currentModules, moduleId];
    
    updateUserMutation.mutate({ userId, allowed_modules: newModules });
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
              <h1 className="text-2xl md:text-3xl font-bold text-white">Användarhantering</h1>
              <p className="text-sm text-white/50">Hantera användaråtkomst till moduler</p>
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
                    <div>
                      <h3 className="text-lg font-semibold text-white">{user.full_name}</h3>
                      <p className="text-sm text-white/50">{user.email}</p>
                      <p className="text-xs text-white/40 mt-1">
                        Roll: <span className="font-semibold text-blue-400">{user.role}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/50 mb-2">
                        {user.allowed_modules?.length || 0}/{AVAILABLE_MODULES.length} moduler
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
                    <p className="text-sm font-semibold text-white/70 mb-4">Välj moduler som användaren ska ha tillgång till:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {AVAILABLE_MODULES.map(module => (
                        <label key={module.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                          <Checkbox
                            checked={user.allowed_modules?.includes(module.id) || false}
                            onCheckedChange={() => handleModuleToggle(
                              user.id,
                              module.id,
                              user.allowed_modules || []
                            )}
                            disabled={updateUserMutation.isPending}
                            className="w-5 h-5"
                          />
                          <span className="text-white/80">{module.label}</span>
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
            <p className="text-white/50">Inga användare hittade</p>
          </div>
        )}
      </div>
    </div>
  );
}