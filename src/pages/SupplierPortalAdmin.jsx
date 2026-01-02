import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, UserPlus, Link as LinkIcon, Trash2, Eye, EyeOff } from "lucide-react";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SupplierPortalAdmin() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: supplierUsers = [], isLoading } = useQuery({
    queryKey: ['supplier-users'],
    queryFn: () => base44.entities.SupplierUser.list('-created_date', 1000),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => base44.entities.SupplierUser.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-users'] });
      toast.success("Användare borttagen");
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => 
      base44.entities.SupplierUser.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-users'] });
      toast.success("Status uppdaterad");
    }
  });

  const supplierMap = {};
  suppliers.forEach(s => supplierMap[s.id] = s.name);

  const portalUrl = `${window.location.origin}${createPageUrl("SupplierLogin")}`;

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              Leverantörsportal
            </h1>
            <p className="text-white/50">
              Hantera leverantörsinloggningar och åtkomst
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Skapa användare
          </Button>
        </div>

        {/* Portal URL */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <LinkIcon className="w-5 h-5 text-blue-400" />
              <div className="flex-1">
                <p className="text-sm text-white/50 mb-1">Portallänk för leverantörer:</p>
                <code className="text-sm text-white font-mono break-all">
                  {portalUrl}
                </code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(portalUrl);
                  toast.success("Länk kopierad!");
                }}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                Kopiera
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : supplierUsers.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-12 text-center">
              <UserPlus className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Inga leverantörsanvändare
              </h3>
              <p className="text-white/50 mb-6">
                Skapa den första användaren för att ge leverantörer åtkomst
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Skapa användare
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {supplierUsers.map(user => (
              <Card key={user.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {user.full_name}
                        </h3>
                        <Badge 
                          variant="outline"
                          className={user.is_active 
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                          }
                        >
                          {user.is_active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-2 text-sm text-white/50">
                        <div>
                          <span className="font-medium">E-post:</span> {user.email}
                        </div>
                        <div>
                          <span className="font-medium">Leverantör:</span>{' '}
                          {supplierMap[user.supplier_id] || 'Okänd'}
                        </div>
                        {user.last_login && (
                          <div>
                            <span className="font-medium">Senast inloggad:</span>{' '}
                            {new Date(user.last_login).toLocaleDateString('sv-SE')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate({ 
                          id: user.id, 
                          is_active: !user.is_active 
                        })}
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                      >
                        {user.is_active ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Är du säker på att du vill ta bort denna användare?')) {
                            deleteUserMutation.mutate(user.id);
                          }
                        }}
                        className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="bg-zinc-950 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Skapa leverantörsanvändare</DialogTitle>
            </DialogHeader>
            <CreateUserForm
              suppliers={suppliers}
              onSuccess={() => {
                setShowCreateModal(false);
                queryClient.invalidateQueries({ queryKey: ['supplier-users'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function CreateUserForm({ suppliers, onSuccess }) {
  const [formData, setFormData] = useState({
    supplier_id: "",
    email: "",
    password: "",
    full_name: ""
  });

  const createUserMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplierUser.create({
      ...data,
      password_hash: data.password, // In production, hash on backend
      is_active: true
    }),
    onSuccess: () => {
      toast.success("Användare skapad!");
      onSuccess();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Leverantör *</label>
        <Select
          value={formData.supplier_id}
          onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}
          required
        >
          <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
            <SelectValue placeholder="Välj leverantör" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10 text-white">
            {suppliers.map(supplier => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Namn *</label>
        <Input
          value={formData.full_name}
          onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
          placeholder="Anna Andersson"
          required
          className="bg-zinc-900 border-white/10 text-white"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">E-post *</label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
          placeholder="anna@leverantor.se"
          required
          className="bg-zinc-900 border-white/10 text-white"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Lösenord *</label>
        <Input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          placeholder="••••••••"
          required
          className="bg-zinc-900 border-white/10 text-white"
        />
      </div>

      <Button
        type="submit"
        disabled={createUserMutation.isPending}
        className="w-full"
      >
        {createUserMutation.isPending ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            Skapar...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            Skapa användare
          </>
        )}
      </Button>
    </form>
  );
}