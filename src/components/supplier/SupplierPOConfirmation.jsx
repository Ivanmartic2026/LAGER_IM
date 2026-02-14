import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SupplierPOConfirmation({ purchaseOrder, items }) {
  const [confirmedItems, setConfirmedItems] = useState(
    items.map(item => ({
      id: item.id,
      quantity_confirmed: item.quantity_confirmed || item.quantity_ordered,
      supplier_batch_numbers: item.supplier_batch_numbers || [],
      supplier_comment: item.supplier_comment || ''
    }))
  );
  const [confirmedDate, setConfirmedDate] = useState(
    purchaseOrder.confirmed_delivery_date ? new Date(purchaseOrder.confirmed_delivery_date) : null
  );
  const [supplierComments, setSupplierComments] = useState(purchaseOrder.supplier_comments || '');

  const queryClient = useQueryClient();

  const confirmPOMutation = useMutation({
    mutationFn: async (data) => {
      // Update PO
      await base44.entities.PurchaseOrder.update(purchaseOrder.id, {
        status: 'confirmed',
        confirmed_date: new Date().toISOString(),
        confirmed_delivery_date: data.confirmedDate?.toISOString(),
        supplier_comments: data.supplierComments
      });

      // Update all items
      for (const item of data.items) {
        await base44.entities.PurchaseOrderItem.update(item.id, {
          quantity_confirmed: item.quantity_confirmed,
          supplier_batch_numbers: item.supplier_batch_numbers,
          supplier_comment: item.supplier_comment,
          status: 'confirmed'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-po'] });
      toast.success('Inköpsorder bekräftad');
    }
  });

  const handleAddBatch = (itemIndex) => {
    const updated = [...confirmedItems];
    updated[itemIndex].supplier_batch_numbers.push({
      batch_no: '',
      quantity: 0,
      production_date: '',
      comment: ''
    });
    setConfirmedItems(updated);
  };

  const handleRemoveBatch = (itemIndex, batchIndex) => {
    const updated = [...confirmedItems];
    updated[itemIndex].supplier_batch_numbers.splice(batchIndex, 1);
    setConfirmedItems(updated);
  };

  const handleBatchChange = (itemIndex, batchIndex, field, value) => {
    const updated = [...confirmedItems];
    updated[itemIndex].supplier_batch_numbers[batchIndex][field] = value;
    setConfirmedItems(updated);
  };

  const handleConfirm = () => {
    confirmPOMutation.mutate({
      items: confirmedItems,
      confirmedDate: confirmedDate,
      supplierComments: supplierComments
    });
  };

  const isConfirmed = purchaseOrder.status === 'confirmed';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bekräfta order</span>
            {isConfirmed && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Bekräftad
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delivery date */}
          <div>
            <Label>Bekräftat leveransdatum (ETA)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-2",
                    !confirmedDate && "text-muted-foreground"
                  )}
                  disabled={isConfirmed}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {confirmedDate ? format(confirmedDate, "PPP", { locale: sv }) : "Välj datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={confirmedDate}
                  onSelect={setConfirmedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <Label>Bekräfta artiklar och batchnummer</Label>
            {items.map((item, itemIndex) => {
              const confirmed = confirmedItems[itemIndex];
              return (
                <Card key={item.id} className="bg-slate-50">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{item.article_name}</div>
                        <div className="text-sm text-slate-500">Best. antal: {item.quantity_ordered} st</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Bekräftat antal</Label>
                        <Input
                          type="number"
                          value={confirmed.quantity_confirmed}
                          onChange={(e) => {
                            const updated = [...confirmedItems];
                            updated[itemIndex].quantity_confirmed = Number(e.target.value);
                            setConfirmedItems(updated);
                          }}
                          disabled={isConfirmed}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Batch numbers */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Batchnummer</Label>
                        {!isConfirmed && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddBatch(itemIndex)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Lägg till batch
                          </Button>
                        )}
                      </div>

                      {confirmed.supplier_batch_numbers.map((batch, batchIndex) => (
                        <div key={batchIndex} className="p-3 bg-white rounded-lg border space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Batchnummer</Label>
                              <Input
                                value={batch.batch_no}
                                onChange={(e) => handleBatchChange(itemIndex, batchIndex, 'batch_no', e.target.value)}
                                placeholder="BATCH-XXX"
                                disabled={isConfirmed}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Antal</Label>
                              <Input
                                type="number"
                                value={batch.quantity}
                                onChange={(e) => handleBatchChange(itemIndex, batchIndex, 'quantity', Number(e.target.value))}
                                disabled={isConfirmed}
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Produktionsdatum (valbart)</Label>
                            <Input
                              type="date"
                              value={batch.production_date}
                              onChange={(e) => handleBatchChange(itemIndex, batchIndex, 'production_date', e.target.value)}
                              disabled={isConfirmed}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Kommentar</Label>
                            <Input
                              value={batch.comment}
                              onChange={(e) => handleBatchChange(itemIndex, batchIndex, 'comment', e.target.value)}
                              placeholder="T.ex. del-leverans, specialhantering..."
                              disabled={isConfirmed}
                              className="mt-1"
                            />
                          </div>
                          {!isConfirmed && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => handleRemoveBatch(itemIndex, batchIndex)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Ta bort
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div>
                      <Label>Kommentar</Label>
                      <Textarea
                        value={confirmed.supplier_comment}
                        onChange={(e) => {
                          const updated = [...confirmedItems];
                          updated[itemIndex].supplier_comment = e.target.value;
                          setConfirmedItems(updated);
                        }}
                        placeholder="T.ex. del-leverans, produktionsförskjutning..."
                        disabled={isConfirmed}
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* General comments */}
          <div>
            <Label>Allmänna kommentarer</Label>
            <Textarea
              value={supplierComments}
              onChange={(e) => setSupplierComments(e.target.value)}
              placeholder="Övergripande kommentarer om ordern..."
              disabled={isConfirmed}
              className="mt-2"
              rows={3}
            />
          </div>

          {!isConfirmed && (
            <Button
              onClick={handleConfirm}
              className="w-full bg-green-600 hover:bg-green-500"
              disabled={confirmPOMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {confirmPOMutation.isPending ? 'Bekräftar...' : 'Bekräfta order'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}