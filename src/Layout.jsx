import React, { useEffect } from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Camera, Package, Menu, X, MapPin, Activity, FileText, ShoppingCart, PackageSearch, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import NotificationBell from "@/components/notifications/NotificationBell";
import OfflineIndicator from "@/components/pwa/OfflineIndicator";
import PWAOptimizer from "@/components/pwa/PWAOptimizer";
import PushManager from "@/components/pwa/PushManager";

// Detect if mobile for performance optimization
const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

const NAV_ITEMS = [
  { name: "Home", label: "Hem", icon: Home },
  { name: "Inventory", label: "Lager", icon: Package },
  { name: "Orders", label: "Ordrar", icon: ShoppingCart },
  { name: "Production", label: "Produktion", icon: Activity },
  { name: "PurchaseOrders", label: "Inköp", icon: ShoppingCart },
  { name: "SiteReports", label: "Site", icon: MapPin },
  { name: "UnknownDeliveries", label: "Okända", icon: PackageSearch },
  { name: "Repairs", label: "Reparation", icon: Activity },
  { name: "Admin", label: "Admin", icon: FileText }
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobile = isMobile();

  // Register manifest for PWA
  useEffect(() => {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'data:application/json;base64,eyJuYW1lIjoiSU12aXNpb24gTGFnZXIgJiBPcmRlciIsInNob3J0X25hbWUiOiJJTXZpc2lvbiIsImRlc2NyaXB0aW9uIjoiTGFnZXJzdHlybmluZyBvY2ggb3JkZXJoYW5kZXJpbmcgZsO2ciBJTXZpc2lvbiIsInN0YXJ0X3VybCI6Ii8iLCJzY29wZSI6Ii8iLCJkaXNwbGF5Ijoic3RhbmRhbG9uZSIsIm9yaWVudGF0aW9uIjoicG9ydHJhaXQtcHJpbWFyeSIsImJhY2tncm91bmRfY29sb3IiOiIjMDAwMDAwIiwidGhlbWVfY29sb3IiOiIjMjU2M2ViIiwicHJlZmVyX3JlbGF0ZWRfYXBwbGljYXRpb25zIjpmYWxzZX0=';
      document.head.appendChild(link);
    }

    // Viewport optimization for mobile
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no';
      document.head.appendChild(viewport);
    }

    // iOS app mode
    const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleStatusBar) {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-status-bar-style';
      meta.content = 'black-translucent';
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <PWAOptimizer />
      <PushManager />
      <OfflineIndicator />
      {/* Logo and Notifications - Top */}
      <div className="hidden md:flex fixed top-6 left-6 right-6 z-50 items-center justify-between">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png" 
          alt="IMvision"
          className="h-8 object-contain"
          loading="lazy"
        />
        <NotificationBell />
      </div>

      {/* Desktop Navigation - Bottom - No transition on mobile */}
      <nav className="hidden md:flex fixed bottom-0 left-0 right-0 h-20 bg-white/5 backdrop-blur-2xl border-t border-white/10 shadow-2xl shadow-white/5 z-50 overflow-x-auto px-4">
        <div className="flex items-center gap-2 min-w-max mx-auto">
          {NAV_ITEMS.map(item => (
            <Link 
              key={item.name}
              to={createPageUrl(item.name)}
              className="flex flex-col items-center gap-1"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center md:transition-all duration-300",
                currentPageName === item.name
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                  : "text-white/50 hover:text-white hover:bg-white/10"
              )}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className={cn(
                "text-xs font-medium md:transition-colors whitespace-nowrap tracking-tight",
                currentPageName === item.name
                  ? "text-blue-400"
                  : "text-white/50"
              )}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/5 backdrop-blur-2xl border-b border-white/10 shadow-sm z-50 flex items-center justify-between px-4">
       <div className="flex items-center gap-3">
         <img 
           src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png" 
           alt="IMvision"
           className="h-7 object-contain"
           loading="lazy"
         />
       </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white/70 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
       <div className="md:hidden fixed inset-0 z-40 bg-black/98 pt-16">
         <nav className="p-4 space-y-2">
           {NAV_ITEMS.map(item => (
             <Link 
               key={item.name}
               to={createPageUrl(item.name)}
               onClick={() => setMobileMenuOpen(false)}
               className={cn(
                 "flex items-center gap-4 p-4 rounded-xl",
                 currentPageName === item.name
                   ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                   : "text-white/70 hover:text-white hover:bg-white/10"
               )}
             >
               <item.icon className="w-5 h-5" />
               <span className="font-medium tracking-tight">{item.label}</span>
             </Link>
           ))}
         </nav>
       </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/5 backdrop-blur-2xl border-t border-white/10 shadow-2xl shadow-white/5 z-50 overflow-x-auto px-4 pb-safe">
        <div className="flex items-center gap-1 min-w-max h-full">
          {NAV_ITEMS.map(item => (
            <Link 
              key={item.name}
              to={createPageUrl(item.name)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl",
                currentPageName === item.name
                  ? "text-blue-400"
                  : "text-white/50"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium whitespace-nowrap tracking-tight">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16 md:pt-20 pb-24 md:pb-24 min-h-screen will-change-auto">
        {children}
      </main>
    </div>
  );
}