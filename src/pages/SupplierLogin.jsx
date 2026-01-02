import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, Package } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function SupplierLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await base44.functions.invoke('supplierLogin', { 
        email, 
        password 
      });

      if (result.data.success) {
        localStorage.setItem('supplier_session', JSON.stringify(result.data.session));
        toast.success("Välkommen!");
        window.location.href = createPageUrl("SupplierPortal");
      } else {
        toast.error(result.data.error || "Felaktiga inloggningsuppgifter");
      }
    } catch (error) {
      toast.error("Kunde inte logga in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Leverantörsportal</CardTitle>
          <CardDescription>Logga in för att hantera dina produkter</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">E-post</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="leverantor@exempel.se"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Lösenord</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Loggar in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Logga in
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}