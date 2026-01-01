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
    <div className="min-h-screen bg-gradient-to-br from-[#F5F6F7] via-[#ECEFF1] to-[#F5F6F7]">
      <style>{`
        :root {
          --color-bg-primary: #F5F6F7;
          --color-bg-secondary: #ECEFF1;
          --color-bg-tertiary: #E1E4E8;
          --color-border: #C1C4C8;
          --color-text-primary: #2B2E33;
          --color-text-secondary: #5a5d62;
          --color-text-muted: #7B7F85;
        }
      `}</style>
      {/* Desktop Navigation - Bottom */}
      <nav className="hidden md:flex fixed bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-xl border-t border-[#E1E4E8] shadow-lg z-50 overflow-x-auto px-4">
        <div className="flex items-center gap-2 min-w-max mx-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-4 shadow-lg shadow-blue-500/30">
            <Package className="w-5 h-5 text-white" />
          </div>

          {NAV_ITEMS.map(item => (
            <Link 
              key={item.name}
              to={createPageUrl(item.name)}
              className="flex flex-col items-center gap-1"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                currentPageName === item.name
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-[#7B7F85] hover:text-[#2B2E33] hover:bg-[#E1E4E8]"
              )}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className={cn(
                "text-xs font-medium transition-colors whitespace-nowrap",
                currentPageName === item.name
                  ? "text-blue-600"
                  : "text-[#7B7F85]"
              )}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-b border-[#E1E4E8] shadow-sm z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-[#2B2E33]">Lagerapp</span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-[#7B7F85]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white/98 backdrop-blur-xl pt-16">
          <nav className="p-4 space-y-2">
            {NAV_ITEMS.map(item => (
              <Link 
                key={item.name}
                to={createPageUrl(item.name)}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl transition-all",
                  currentPageName === item.name
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "text-[#5a5d62] hover:text-[#2B2E33] hover:bg-[#E1E4E8]"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-xl border-t border-[#E1E4E8] shadow-lg z-50 overflow-x-auto px-4 pb-safe">
        <div className="flex items-center gap-1 min-w-max h-full">
          {NAV_ITEMS.map(item => (
            <Link 
              key={item.name}
              to={createPageUrl(item.name)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                currentPageName === item.name
                  ? "text-blue-600"
                  : "text-[#7B7F85]"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
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