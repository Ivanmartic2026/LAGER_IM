import React, { useEffect, useState as useReactState } from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Camera, Package, Menu, X, MapPin, Activity, FileText, ShoppingCart, PackageSearch, ClipboardList, Truck, Clipboard, BarChart2, Layers, Users, Clock, Car, Scan, CheckCircle2, RefreshCw, Lightbulb, GitMerge, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import NotificationBell from "@/components/notifications/NotificationBell";
import RecentActivityWidget from "@/components/activity/RecentActivityWidget";
import OfflineIndicator from "@/components/pwa/OfflineIndicator";
import PWAOptimizer from "@/components/pwa/PWAOptimizer";
import PushManager from "@/components/pwa/PushManager";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { LanguageProvider } from "@/components/language/LanguageProvider";
import LanguageToggle from "@/components/language/LanguageToggle";
import { useLanguage } from "@/components/language/LanguageProvider";
import { t, tOrderStatus, tStage, tWorkOrderStatus, tPriority } from "@/components/language/translations";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ErrorBoundary from "@/components/utils/ErrorBoundary";
import IOSInstallPrompt from "@/components/pwa/IOSInstallPrompt";
import IOSPushPrompt from "@/components/pwa/IOSPushPrompt";
import SWUpdateForcer from "@/components/pwa/SWUpdateForcer";

// Detect if mobile for performance optimization
const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

function LayoutContent({ children, currentPageName }) {
  const { language } = useLanguage();
  const [userModules, setUserModules] = useReactState([]);
  const [loadingUser, setLoadingUser] = useReactState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [navCollapsed, setNavCollapsed] = useReactState(() => localStorage.getItem('nav_collapsed') === 'true');
  
  // Independent navigation stacks for each tab
  const [navigationStacks, setNavigationStacks] = useReactState(() => {
    // Clear any stale nav stacks that might point to wrong pages
    localStorage.removeItem('nav_stacks');
    return {};
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await base44.auth.me();
        setUserModules(user?.allowed_modules || []);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserData();
  }, []);

  const NAV_ITEMS = [
    { name: "Inventory", label: t('nav_inventory', language), icon: Package, module: null },
    { name: "Orders", label: t('nav_orders', language), icon: ShoppingCart, module: "Orders" },
    { name: "WorkOrders", label: t('nav_work_orders', language), icon: ClipboardList, module: null },
    { name: "PurchaseOrders", label: t('nav_purchase', language), icon: ShoppingCart, module: "PurchaseOrders" },
    { name: "SiteReports", label: t('nav_site', language), icon: MapPin, module: "SiteReports" },
    { name: "Repairs", label: t('nav_repairs', language), icon: Activity, module: "Repairs" },
    { name: "ProjectResults", label: t('nav_projects', language), icon: BarChart2, module: null },
    { name: "Admin", label: t('nav_admin', language), icon: FileText, module: null }
  ];

  // Admin sub-links shown when on Admin page
  const ADMIN_SUB_ITEMS = [
    { name: "WorkspaceProjects", label: t('nav_workspace', language), icon: Layers },
    { name: "MedarbetarOversikt", label: t('nav_employees', language), icon: Users },
    { name: "TidsRapport", label: t('nav_timesheet', language), icon: Clock },
    { name: "KilometerErsattning", label: t('nav_mileage', language), icon: Car },
    { name: "FortnoxSync", label: "Fortnox", icon: ShoppingCart },
    { name: "FortnoxCustomers", label: "Fortnox-kunder", icon: ShoppingCart },
    { name: "BatchDashboard", label: "Batch AI", icon: Scan },
    { name: "BatchReview", label: "Batch Review", icon: CheckCircle2 },
    { name: "BatchSuggestions", label: "Förslag", icon: Lightbulb },
    { name: "BatchReanalyze", label: "Omanalysera", icon: RefreshCw },
    { name: "UsersManagement", label: "Användare", icon: Users },
    { name: "MigrationCenter", label: "Migration", icon: RefreshCw },
    { name: "MatchReview", label: "Match Review", icon: Search },
    { name: "PatternRules", label: "Mönster", icon: GitMerge },
  ];

  const visibleNavItems = NAV_ITEMS.filter(item => !item.module || userModules.includes(item.module));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobile = isMobile();
  
  // Save navigation stacks when location changes
  useEffect(() => {
    const currentTab = visibleNavItems.find(item => 
      location.pathname.toLowerCase().includes(`/${item.name.toLowerCase()}`)
    );
    
    if (currentTab) {
      const newStacks = { ...navigationStacks };
      if (!newStacks[currentTab.name]) {
        newStacks[currentTab.name] = [];
      }
      
      // Only add if different from last entry
      const lastPath = newStacks[currentTab.name][newStacks[currentTab.name].length - 1];
      if (lastPath !== location.pathname) {
        newStacks[currentTab.name].push(location.pathname);
        // Keep only last 10 paths per tab
        if (newStacks[currentTab.name].length > 10) {
          newStacks[currentTab.name].shift();
        }
        setNavigationStacks(newStacks);
        localStorage.setItem('nav_stacks', JSON.stringify(newStacks));
      }
    }
  }, [location.pathname]);
  
  // Handle tab navigation with stack restoration
  const handleTabClick = (tabName) => {
    const stack = navigationStacks[tabName];
    const tabRoot = `/${tabName.toLowerCase()}`;
    if (stack && stack.length > 0) {
      // Only restore if the last path is actually under this tab's root
      const lastPath = stack[stack.length - 1];
      if (lastPath.toLowerCase().startsWith(tabRoot)) {
        navigate(lastPath);
        return;
      }
    }
    // Navigate to tab root
    navigate(createPageUrl(tabName));
  };

  // Check if we should show back button (deeper than root tabs)
  const rootPages = visibleNavItems.map(item => `/${item.name.toLowerCase()}`);
  const isDeepPage = !rootPages.includes(location.pathname.toLowerCase()) && location.pathname !== '/';

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
    <div className="min-h-screen bg-background">
      <SWUpdateForcer />
      <PWAOptimizer />
      <PushManager />
      <OfflineIndicator />
      <InstallPrompt />


      {/* Logo and Notifications - Top */}
      <div className="hidden md:flex fixed top-6 left-6 right-6 z-50 items-center justify-between">
        <button onClick={() => navigate(createPageUrl("Home"))}>
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png" 
            alt="IMvision"
            className="h-8 object-contain cursor-pointer hover:opacity-80 transition-opacity"
            loading="lazy"
          />
        </button>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <NotificationBell />
        </div>
      </div>

      {/* Desktop Navigation - Bottom */}
      <nav className="hidden md:flex fixed bottom-0 left-0 right-0 h-20 bg-black border-t border-zinc-800 shadow-2xl z-50 overflow-x-auto px-4">
        <div className="flex items-center gap-2 min-w-max mx-auto relative">
          <button
            onClick={() => {
              setNavCollapsed(!navCollapsed);
              localStorage.setItem('nav_collapsed', !navCollapsed);
            }}
            className="absolute -left-16 w-12 h-12 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
            title={navCollapsed ? "Expandera" : "Minimera"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {navCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>
          {visibleNavItems.map(item => (
            <button
              key={item.name}
              onClick={() => handleTabClick(item.name)}
              className={cn("flex items-center gap-2 transition-all duration-200", navCollapsed ? "flex-col" : "flex-row")}
            >
              <div className={cn(
                "w-10 h-10 rounded-md flex items-center justify-center transition-all duration-200 flex-shrink-0",
                currentPageName === item.name
                  ? "bg-signal/10 text-signal"
                  : "text-white/50 hover:text-white hover:bg-zinc-800"
              )}>
                <item.icon className="w-4 h-4" />
              </div>
              {!navCollapsed && (
                <span className={cn(
                  "text-xs font-brand whitespace-nowrap tracking-wide min-w-fit transition-colors",
                  currentPageName === item.name
                    ? "text-signal"
                    : "text-white/50"
                )}>
                  {item.label}
                </span>
              )}
            </button>
          ))}
          {/* Admin sub-items */}
          {!navCollapsed && (
            <div className="flex items-center gap-1 border-l border-zinc-800 pl-2 ml-1">
              {ADMIN_SUB_ITEMS.map(item => (
                <button
                  key={item.name}
                  onClick={() => handleTabClick(item.name)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={cn(
                    "w-9 h-9 rounded-md flex items-center justify-center transition-all duration-200",
                    currentPageName === item.name
                      ? "bg-signal/10 text-signal"
                      : "text-white/30 hover:text-white hover:bg-zinc-800"
                  )}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-brand whitespace-nowrap tracking-wide transition-colors",
                    currentPageName === item.name ? "text-signal" : "text-white/30"
                  )}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-black border-b border-zinc-800 shadow-sm z-50 flex items-center justify-between px-4" style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(4rem + env(safe-area-inset-top))' }}>
       <div className="flex items-center gap-3">
         {isDeepPage ? (
           <Button
             variant="ghost"
             size="icon"
             onClick={() => navigate(-1)}
             className="text-white/70 hover:text-white -ml-2"
           >
             <ArrowLeft className="w-5 h-5" />
           </Button>
         ) : (
           <button onClick={() => navigate(createPageUrl("Home"))}>
             <img 
               src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png" 
               alt="IMvision"
               className="h-7 object-contain cursor-pointer hover:opacity-80 transition-opacity"
               loading="lazy"
             />
           </button>
         )}
       </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
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
        <div className="md:hidden fixed inset-0 z-40 bg-black flex flex-col" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top))' }}>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {visibleNavItems.map(item => (
              <button
                key={item.name}
                onClick={() => {
                  handleTabClick(item.name);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full text-left flex items-center gap-4 px-4 py-3 rounded-md transition-colors",
                  currentPageName === item.name
                    ? "bg-signal/10 text-signal border-l-4 border-signal"
                    : "text-white/70 hover:text-white hover:bg-zinc-800 border-l-4 border-transparent"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-brand tracking-wide text-sm">{item.label}</span>
              </button>
            ))}
            {/* Admin sub-items */}
            <div className="pt-2 border-t border-zinc-800">
              <p className="font-brand text-[11px] text-white/30 tracking-widest px-4 py-2">ADMIN</p>
              {ADMIN_SUB_ITEMS.map(item => (
                <button
                  key={item.name}
                  onClick={() => {
                    handleTabClick(item.name);
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full text-left flex items-center gap-4 px-4 py-3 rounded-md transition-colors",
                    currentPageName === item.name
                      ? "bg-signal/10 text-signal border-l-4 border-signal"
                      : "text-white/50 hover:text-white hover:bg-zinc-800 border-l-4 border-transparent"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-brand tracking-wide text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-800 shadow-2xl z-50 overflow-x-auto px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-1 min-w-max h-full">
          {visibleNavItems.map(item => (
            <button
              key={item.name}
              onClick={() => handleTabClick(item.name)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-colors",
                currentPageName === item.name
                  ? "text-signal"
                  : "text-white/50"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[11px] font-brand whitespace-nowrap tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="md:pt-20 min-h-screen will-change-auto" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top))', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <ErrorBoundary>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ 
                type: "tween", 
                duration: 0.2,
                ease: "easeInOut"
              }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      <IOSInstallPrompt />
      <IOSPushPrompt />

      {/* Floating Camera Button — Signal CTA */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate(createPageUrl("Scan"))}
        className="fixed bottom-28 md:bottom-24 right-6 w-14 h-14 rounded-full bg-signal hover:bg-signal-hover active:bg-signal-active text-white shadow-lg shadow-signal/30 transition-all z-40 flex items-center justify-center"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        title="Öppna kamera"
      >
        <Camera className="w-6 h-6" />
      </motion.button>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <LanguageProvider>
      <LayoutContent currentPageName={currentPageName}>
        {children}
      </LayoutContent>
    </LanguageProvider>
  );
}