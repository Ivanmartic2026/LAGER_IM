import React from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Camera, Package, Menu, X, MapPin, Activity, FileText, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV_ITEMS = [
  { name: "Home", label: "Hem", icon: Home },
  { name: "Inventory", label: "Lager", icon: Package },
  { name: "Orders", label: "Ordrar", icon: ShoppingCart },
  { name: "PurchaseOrders", label: "Inköp", icon: ShoppingCart },
  { name: "Warehouses", label: "Lagerställen", icon: Activity },
  { name: "Repairs", label: "Reparation", icon: Activity },
  { name: "Admin", label: "Admin", icon: FileText }
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black">
      {/* Desktop Navigation - Bottom */}
      <nav className="hidden md:flex fixed bottom-0 left-0 right-0 h-20 bg-white/5 backdrop-blur-2xl border-t border-white/10 shadow-2xl shadow-white/5 z-50 overflow-x-auto px-4">
        <div className="flex items-center gap-2 min-w-max mx-auto">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png" 
            alt="IMvision"
            className="h-8 mr-4 object-contain"
          />

          {NAV_ITEMS.map(item => (
            <Link 
              key={item.name}
              to={createPageUrl(item.name)}
              className="flex flex-col items-center gap-1"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                currentPageName === item.name
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                  : "text-white/50 hover:text-white hover:bg-white/10"
              )}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className={cn(
                "text-xs font-medium transition-colors whitespace-nowrap tracking-tight",
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
          />
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-white/70 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/98 backdrop-blur-2xl pt-16">
          <nav className="p-4 space-y-2">
            {NAV_ITEMS.map(item => (
              <Link 
                key={item.name}
                to={createPageUrl(item.name)}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
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
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300",
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
      <main className="pt-16 md:pt-0 pb-24 md:pb-24 min-h-screen">
        {children}
      </main>
    </div>
  );
}