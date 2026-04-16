import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Settings, Users, TrendingUp, FileText, Calendar,
  ArrowRight, Activity, Package, Monitor, Mail, Smartphone, LogOut, Bell, AlertCircle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataCleanupPanel from "@/components/admin/DataCleanupPanel";

export default function AdminPage() {
  const [testingNotification, setTestingNotification] = useState(false);

  const handleTestNotification = async () => {
    try {
      setTestingNotification(true);
      await base44.functions.invoke('testPushNotification');
      toast.success('Test-notifikation skickad!');
    } catch (error) {
      toast.error('Kunde inte skicka test-notifikation');
    } finally {
      setTestingNotification(false);
    }
  };
  const adminSections = [
    {
      name: "StockForecast",
      label: "Lagerprognos",
      description: "Översikt över reserverade artiklar",
      icon: TrendingUp,
      color: "from-cyan-600 to-cyan-700",
      iconBg: "bg-cyan-500/20",
      iconColor: "text-cyan-400"
    },
    {
      name: "WarehouseDashboard",
      label: "TV Dashboard",
      description: "Realtidsöversikt för lagerskärm",
      icon: Monitor,
      color: "from-blue-600 to-blue-700",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400"
    },
    {
      name: "UsersManagement",
      label: "Användare",
      description: "Hantera användare och behörigheter",
      icon: Users,
      color: "from-indigo-600 to-indigo-700",
      iconBg: "bg-indigo-500/20",
      iconColor: "text-indigo-400"
    },
    {
      name: "Suppliers",
      label: "Leverantörer",
      description: "Hantera leverantörer och kontakter",
      icon: Users,
      color: "from-blue-600 to-blue-700",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400"
    },
    {
      name: "SupplierDocumentationOverview",
      label: "Leverantörsdokumentation",
      description: "Översikt av uppladdade dokument",
      icon: FileText,
      color: "from-cyan-600 to-cyan-700",
      iconBg: "bg-cyan-500/20",
      iconColor: "text-cyan-400"
    },
    {
      name: "Warehouses",
      label: "Lagerställen",
      description: "Hantera lagerställen och hyllplatser",
      icon: Activity,
      color: "from-slate-600 to-slate-700",
      iconBg: "bg-slate-500/20",
      iconColor: "text-slate-400"
    },
    {
      name: "SupplierPortalAdmin",
      label: "Leverantörsportal",
      description: "Hantera leverantörsinloggningar och åtkomst",
      icon: Package,
      color: "from-teal-600 to-teal-700",
      iconBg: "bg-teal-500/20",
      iconColor: "text-teal-400"
    },
    {
      name: "Movements",
      label: "Rörelser",
      description: "Se alla lagerrörelser och historik",
      icon: Activity,
      color: "from-emerald-600 to-emerald-700",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-400"
    },
    {
      name: "InventoryValue",
      label: "Lagervärde",
      description: "Se totalt värde av lager",
      icon: TrendingUp,
      color: "from-emerald-600 to-emerald-700",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-400"
    },
    {
      name: "Analytics",
      label: "Analys",
      description: "Statistik och rapporter",
      icon: TrendingUp,
      color: "from-purple-600 to-purple-700",
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-400"
    },
    {
      name: "Reports",
      label: "Schemalagda",
      description: "Automatiska rapporter och schema",
      icon: Calendar,
      color: "from-amber-600 to-amber-700",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400"
    },
    {
      name: "EmailOrderSetup",
      label: "E-post till Order",
      description: "Konfigurera automatisk orderhantering via e-post",
      icon: Mail,
      color: "from-violet-600 to-violet-700",
      iconBg: "bg-violet-500/20",
      iconColor: "text-violet-400"
    },
    {
      name: "PWASetup",
      label: "PWA & Push",
      description: "Installera appen och aktivera push-notiser",
      icon: Smartphone,
      color: "from-pink-600 to-pink-700",
      iconBg: "bg-pink-500/20",
      iconColor: "text-pink-400"
    },
    {
      name: "SiteReportSettings",
      label: "Site-rapport Inställningar",
      description: "Konfigurera batch-bearbetning av site-rapporter",
      icon: Settings,
      color: "from-slate-600 to-slate-700",
      iconBg: "bg-slate-500/20",
      iconColor: "text-slate-400"
    },
    {
      name: "FortnoxSync",
      label: "Fortnox Synkronisering",
      description: "Synka artiklar, leverantörer och inköpsorder till Fortnox",
      icon: Settings,
      color: "from-blue-600 to-blue-700",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400"
    }
  ];

  const externalLinks = [
    {
      label: "Order Dashboard (TV)",
      description: "Öppna orderdashboard i ny flik – optimerad för stor skärm",
      icon: Monitor,
      color: "from-green-600 to-green-700",
      iconBg: "bg-green-500/20",
      iconColor: "text-green-400",
      href: "/OrderDashboard"
    }
  ];

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
              <Settings className="w-6 h-6 text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Administration</h1>
              <p className="text-sm text-white/50">Hantera system och rapporter</p>
            </div>
          </div>
        </motion.div>

        {/* Admin Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {adminSections.map((section, index) => (
            <Link 
              key={section.name}
              to={createPageUrl(section.name)}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-white/5 transition-all duration-300 p-6 cursor-pointer"
              >
                {/* Gradient Background Effect */}
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity",
                  `bg-gradient-to-br ${section.color}`
                )} />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center", section.iconBg)}>
                      <section.icon className={cn("w-7 h-7", section.iconColor)} />
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
                    {section.label}
                  </h3>
                  <p className="text-sm text-white/50">
                    {section.description}
                  </p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* External Links */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {externalLinks.map((link, index) => (
            <a key={index} href={link.href} target="_blank" rel="noopener noreferrer">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-white/5 transition-all duration-300 p-6 cursor-pointer"
              >
                <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity", `bg-gradient-to-br ${link.color}`)} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center", link.iconBg)}>
                      <link.icon className={cn("w-7 h-7", link.iconColor)} />
                    </div>
                    <span className="text-xs text-white/30 group-hover:text-white/60 transition-all bg-white/5 rounded-lg px-2 py-1">Öppnas i ny flik ↗</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">{link.label}</h3>
                  <p className="text-sm text-white/50">{link.description}</p>
                </div>
              </motion.div>
            </a>
          ))}
        </div>

        {/* Data Cleanup Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <DataCleanupPanel />
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-8 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2 tracking-tight">Om Administration</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Här hittar du alla administrativa funktioner för systemet. Hantera leverantörer, 
                se lagerrörelser, analysera data och konfigurera automatiska rapporter.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Delete Account Section */}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.5 }}
           className="mt-8 p-6 rounded-2xl bg-red-500/5 backdrop-blur-xl border border-red-500/20"
         >
           <div className="flex items-start gap-4">
             <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
               <AlertCircle className="w-5 h-5 text-red-400" />
             </div>
             <div className="flex-1">
               <h3 className="font-semibold text-red-400 mb-1">Ta bort konto</h3>
               <p className="text-sm text-red-300/70 mb-4">
                 Denna åtgärd kan inte ångras. Ditt konto och all associerad data kommer att tas bort permanent.
               </p>
               <Button
                 onClick={() => {
                   if (window.confirm('Är du helt säker? Det finns ingen väg tillbaka.')) {
                     if (window.confirm('Skriv DIN E-POSTADRESS för att bekräfta:')) {
                       const email = prompt('Bekräfta med din e-postadress:');
                       if (email) {
                         const user = base44.auth.me();
                         user.then(u => {
                           if (email === u.email) {
                             toast.loading('Tar bort konto...');
                             base44.auth.deleteMe?.() || toast.error('Borttagning stöds inte');
                           } else {
                             toast.error('E-postadress stämmer inte');
                           }
                         });
                       }
                     }
                   }
                 }}
                 variant="outline"
                 className="bg-red-600 hover:bg-red-700 border-red-500 text-white"
               >
                 Ta bort mitt konto
               </Button>
             </div>
           </div>
         </motion.div>

         {/* Test & Logout Buttons */}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.55 }}
           className="mt-6 flex gap-3 justify-center flex-wrap"
         >
           <Button
             onClick={handleTestNotification}
             disabled={testingNotification}
             className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/50"
           >
             {testingNotification ? (
               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
             ) : (
               <Bell className="w-4 h-4 mr-2" />
             )}
             Testa Notifikation
           </Button>
           <Button
             onClick={() => base44.auth.logout()}
             variant="outline"
             className="bg-white/5 border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-white/70 hover:text-red-400 transition-all duration-300"
           >
             <LogOut className="w-4 h-4 mr-2" />
             Logga ut
           </Button>
         </motion.div>
        </div>
        </div>
        );
        }