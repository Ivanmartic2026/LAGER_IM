import React, { useState } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierFetch } from "@/lib/supplierApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SupplierPOConfirmation({ purchaseOrder, items, poToken }) {
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
      return await supplierFetch('supplierConfirmPO', {
        token: poToken,
        confirmedDate: data.confirmedDate?.toISOString(),
        supplierComments: data.supplierComments,
        items: data.items,
      });
    },
    onSuccess: () => {
      // Manually update cache instead of invalidating to keep token in URL
      queryClient.setQueryData(['supplier-po', poToken], (oldData) => ({
        ...oldData,
        purchaseOrder: { ...oldData?.purchaseOrder, status: 'confirmed' }
      }));
      toast.success('Purchase Order confirmed!');
    },
    onError: (err) => {
      toast.error('Could not confirm order: ' + err.message);
    }
  });

  const handleAddBatch = (itemIndex) => {
    const updated = [...confirmedItems];
    updated[itemIndex].supplier_batch_numbers.push({ batch_no: '', quantity: 0, production_date: '', comment: '' });
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

  const isConfirmed = !['draft', 'sent'].includes(purchaseOrder.status);

  return (
    <form className="space-y-6">
      {isConfirmed && (
         <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <div className="font-semibold text-green-900">Order Confirmed</div>
            <div className="text-sm text-green-700">This purchase order has been confirmed by the supplier.</div>
          </div>
        </div>
      )}

      {/* Confirmed delivery date */}
      <div>
        <Label className="text-sm font-medium text-gray-700">Confirmed Delivery Date (ETA)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start text-left font-normal mt-2", !confirmedDate && "text-muted-foreground")}
              disabled={isConfirmed}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {confirmedDate ? format(confirmedDate, "PPP") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={confirmedDate} onSelect={setConfirmedDate} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      {/* Items */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-gray-700">Confirm Items & Batch Numbers</Label>
        {items.map((item, itemIndex) => {
          const confirmed = confirmedItems[itemIndex];
          return (
            <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                <div>
                  <div className="font-semibold text-gray-900">{item.article_name}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-500">
                    <span>Ordered: {item.quantity_ordered} pcs</span>
                    {item.article_sku && <span>SKU: {item.article_sku}</span>}
                    {item.transit_expected_date && (
                       <span className="flex items-center gap-1 text-blue-600 font-medium print:text-blue-900 print:block">
                         <Clock className="w-3 h-3 print:inline" />
                         ETA: {format(new Date(item.transit_expected_date), 'd MMM yyyy')}
                       </span>
                     )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Confirmed Quantity</Label>
                  <Input
                    type="number"
                    value={confirmed.quantity_confirmed}
                    onChange={(e) => {
                      const updated = [...confirmedItems];
                      updated[itemIndex].quantity_confirmed = Number(e.target.value);
                      setConfirmedItems(updated);
                    }}
                    disabled={isConfirmed}
                    className="mt-1 max-w-xs"
                  />
                </div>

                {/* Batch numbers */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-600">Batch IDs</Label>
                    {!isConfirmed && (
                      <Button type="button" size="sm" variant="outline" onClick={() => handleAddBatch(itemIndex)} className="touch-manipulation">
                        <Plus className="w-3 h-3 mr-1" />
                        Add Batch
                      </Button>
                    )}
                  </div>
                  {confirmed.supplier_batch_numbers.length === 0 && !isConfirmed && (
                    <p className="text-xs text-gray-400 italic">No batch numbers added yet. Click "Add Batch" to add traceability info.</p>
                  )}
                  {confirmed.supplier_batch_numbers.map((batch, batchIndex) => (
                    <div key={batchIndex} className="p-3 bg-white rounded-lg border border-gray-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500">Batch ID</Label>
                          <Input
                            value={batch.batch_no}
                            onChange={(e) => handleBatchChange(itemIndex, batchIndex, 'batch_no', e.target.value)}
                            placeholder="BATCH-XXX"
                            disabled={isConfirmed}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Quantity</Label>
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
                        <Label className="text-xs text-gray-500">Production Date (optional)</Label>
                        <Input
                          type="date"
                          value={batch.production_date}
                          onChange={(e) => handleBatchChange(itemIndex, batchIndex, 'production_date', e.target.value)}
                          disabled={isConfirmed}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Comment</Label>
                        <Input
                          value={batch.comment}
                          onChange={(e) => handleBatchChange(itemIndex, batchIndex, 'comment', e.target.value)}
                          placeholder="e.g. partial delivery, special handling..."
                          disabled={isConfirmed}
                          className="mt-1"
                        />
                      </div>
                      {!isConfirmed && (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                          onClick={() => handleRemoveBatch(itemIndex, batchIndex)}
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Item Comment</Label>
                  <Textarea
                    value={confirmed.supplier_comment}
                    onChange={(e) => {
                      const updated = [...confirmedItems];
                      updated[itemIndex].supplier_comment = e.target.value;
                      setConfirmedItems(updated);
                    }}
                    placeholder="e.g. partial delivery, production delay..."
                    disabled={isConfirmed}
                    className="mt-1"
                    rows={2}
                  />
                </div>
            </div>
          );
        })}
      </div>

      {/* General comments */}
      <div>
        <Label className="text-sm font-medium text-gray-700">General Comments</Label>
        <Textarea
          value={supplierComments}
          onChange={(e) => setSupplierComments(e.target.value)}
          placeholder="Any overall comments about this order..."
          disabled={isConfirmed}
          className="mt-2"
          rows={3}
        />
      </div>

      {!isConfirmed && (
        <Button
          onClick={() => confirmPOMutation.mutate({ items: confirmedItems, confirmedDate, supplierComments })}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 text-base"
          disabled={confirmPOMutation.isPending}
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          {confirmPOMutation.isPending ? 'Confirming...' : 'Confirm Purchase Order'}
        </Button>
      )}
    </form>
  );
}