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
      const data = response.data;
      if (data && data.supplier_id) {
        localStorage.setItem('supplier_id', data.supplier_id);
        localStorage.setItem('supplier_email', data.email);
        localStorage.setItem('supplier_full_name', data.full_name);
        toast.success('Login successful!');
        navigate('/SupplierDashboard');
      } else if (data && data.error) {
        toast.error(data.error);
      } else {
        toast.error('Invalid email or password.');
      }
    } catch (error) {
      // axios throws on 4xx — extract the error message from response
      const errMsg = error?.response?.data?.error || error.message || 'An error occurred during login.';
      toast.error(errMsg);
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
          <CardTitle className="text-2xl font-bold text-slate-900">Supplier Login</CardTitle>
          <CardDescription className="text-slate-600">Log in to view your purchase orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-50 border-slate-300 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
              Log in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}