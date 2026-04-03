import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SupplierLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await base44.functions.invoke('supplierLogin', { email, password });
      if (response.data && response.data.supplier_id) {
        localStorage.setItem('supplier_id', response.data.supplier_id);
        localStorage.setItem('supplier_email', response.data.email);
        localStorage.setItem('supplier_full_name', response.data.full_name);
        toast.success('Inloggning lyckades!');
        navigate('/SupplierDashboard');
      } else {
        toast.error('Felaktig e-post eller lösenord.');
      }
    } catch (error) {
      toast.error(error.message || 'Ett fel uppstod vid inloggning.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200">
        <CardHeader className="text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png"
            alt="IMvision"
            className="h-10 object-contain mx-auto mb-4"
          />
          <CardTitle className="text-2xl font-bold text-slate-900">Leverantörsinloggning</CardTitle>
          <CardDescription className="text-slate-600">Logga in för att se dina inköpsorder.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                placeholder="din.epost@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-50 border-slate-300 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Lösenord</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-50 border-slate-300 text-slate-900"
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Logga in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}