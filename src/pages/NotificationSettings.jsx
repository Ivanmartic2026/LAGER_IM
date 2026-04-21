import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell, Mail, Settings, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PushStatusCard from "@/components/pwa/PushStatusCard";

export default function NotificationSettingsPage() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notificationSettings', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const list = await base44.entities.NotificationSettings.filter({ user_email: user.email });
      if (list.length > 0) return list[0];
      
      // Create default settings if none exist
      return await base44.entities.NotificationSettings.create({
        user_email: user.email,
        in_app_enabled: true,
        email_enabled: true,
        order_status_updates: true,
        low_stock_alerts: true,
        purchase_order_updates: true,
        repair_updates: true,
        critical_only: false
      });
    },
    enabled: !!user?.email,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => base44.entities.NotificationSettings.update(settings.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      toast.success("Inställningar sparade");
    }
  });

  const handleToggle = (field, value) => {
    updateSettingsMutation.mutate({ [field]: value });
  };

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-black p-6 flex items-center justify-center">
        <div className="text-white">Laddar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800 -ml-2 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
            Notifieringsinställningar
          </h1>
          <p className="text-white/50">Hantera hur du vill ta emot notifieringar</p>
        </div>

        <div className="space-y-6">
          
          {/* Push Status */}
          <PushStatusCard />

          {/* General Settings */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Allmänna inställningar</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-white">In-app notifieringar</p>
                    <p className="text-sm text-slate-400">Visa notifieringar i appen</p>
                  </div>
                </div>
                <Switch
                  checked={settings.in_app_enabled}
                  onCheckedChange={(value) => handleToggle('in_app_enabled', value)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-white">Email notifieringar</p>
                    <p className="text-sm text-slate-400">Skicka notifieringar via email</p>
                  </div>
                </div>
                <Switch
                  checked={settings.email_enabled}
                  onCheckedChange={(value) => handleToggle('email_enabled', value)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="font-medium text-white">Endast kritiska notifieringar</p>
                    <p className="text-sm text-slate-400">Ta endast emot kritiska meddelanden</p>
                  </div>
                </div>
                <Switch
                  checked={settings.critical_only}
                  onCheckedChange={(value) => handleToggle('critical_only', value)}
                />
              </div>
            </div>
          </div>

          {/* Notification Types */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">Notifieringstyper</h2>
            <p className="text-sm text-slate-400 mb-4">
              Välj vilka typer av notifieringar du vill ta emot
              {settings.critical_only && " (endast kritiska notifieringar kommer skickas oavsett dessa inställningar)"}
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                <div>
                  <p className="font-medium text-white">Orderstatus uppdateringar</p>
                  <p className="text-sm text-slate-400">När en order ändrar status</p>
                </div>
                <Switch
                  checked={settings.order_status_updates}
                  onCheckedChange={(value) => handleToggle('order_status_updates', value)}
                  disabled={settings.critical_only}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                <div>
                  <p className="font-medium text-white">Lågt lager varningar</p>
                  <p className="text-sm text-slate-400">När artiklar har lågt lagersaldo</p>
                </div>
                <Switch
                  checked={settings.low_stock_alerts}
                  onCheckedChange={(value) => handleToggle('low_stock_alerts', value)}
                  disabled={settings.critical_only}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                <div>
                  <p className="font-medium text-white">Inköpsorder uppdateringar</p>
                  <p className="text-sm text-slate-400">När inköpsordrar tas emot eller uppdateras</p>
                </div>
                <Switch
                  checked={settings.purchase_order_updates}
                  onCheckedChange={(value) => handleToggle('purchase_order_updates', value)}
                  disabled={settings.critical_only}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                <div>
                  <p className="font-medium text-white">Reparationsuppdateringar</p>
                  <p className="text-sm text-slate-400">När artiklar skickas till eller kommer från reparation</p>
                </div>
                <Switch
                    checked={settings.repair_updates}
                    onCheckedChange={(value) => handleToggle('repair_updates', value)}
                    disabled={settings.critical_only}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                  <div>
                    <p className="font-medium text-white">Chatt-omnämnanden push</p>
                    <p className="text-sm text-slate-400">Skicka push när du omnämns (@mention)</p>
                  </div>
                  <Switch
                    checked={settings.chat_mentions_push ?? true}
                    onCheckedChange={(value) => handleToggle('chat_mentions_push', value)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                  <div>
                    <p className="font-medium text-white">Direktmeddelanden push</p>
                    <p className="text-sm text-slate-400">Skicka push vid direktmeddelanden</p>
                  </div>
                  <Switch
                    checked={settings.chat_dm_push ?? true}
                    onCheckedChange={(value) => handleToggle('chat_dm_push', value)}
                  />
                </div>
                </div>
                </div>

                {/* Quiet Hours */}
                <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                 <Bell className="w-5 h-5 text-yellow-400" />
                 <h2 className="text-lg font-semibold text-white">Tysta timmar</h2>
                </div>
                <Switch
                 checked={settings.quiet_hours_enabled ?? true}
                 onCheckedChange={(value) => handleToggle('quiet_hours_enabled', value)}
                />
                </div>

                {settings.quiet_hours_enabled && (
                <div className="space-y-3">
                 <div className="p-3 bg-slate-800/50 rounded-lg">
                   <label className="text-sm text-slate-300">Från</label>
                   <input
                     type="time"
                     value={settings.quiet_hours_start || '22:00'}
                     onChange={(e) => handleToggle('quiet_hours_start', e.target.value)}
                     className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600"
                   />
                 </div>
                 <div className="p-3 bg-slate-800/50 rounded-lg">
                   <label className="text-sm text-slate-300">Till</label>
                   <input
                     type="time"
                     value={settings.quiet_hours_end || '06:00'}
                     onChange={(e) => handleToggle('quiet_hours_end', e.target.value)}
                     className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600"
                   />
                 </div>
                </div>
                )}
                </div>

                {/* Info */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-blue-300">
              💡 Kritiska notifieringar (t.ex. artiklar helt slut i lager) skickas alltid, oavsett dina inställningar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}