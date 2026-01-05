import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Package, Camera, AlertTriangle, CheckCircle2, 
  MapPin, Plus, X, Upload
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function ReceivingItemCard({ 
  item, 
  article,
  onReceive,
  isReceiving 
}) {
  const [expanded, setExpanded] = useState(false);
  const [receivedQty, setReceivedQty] = useState(item.quantity_ordered - (item.quantity_received || 0));
  const [shelfAddress, setShelfAddress] = useState(
    Array.isArray(article?.shelf_address) && article.shelf_address.length > 0 
      ? article.shelf_address[0] 
      : article?.shelf_address || ''
  );
  const [notes, setNotes] = useState('');
  const [qualityCheck, setQualityCheck] = useState(false);
  const [hasDiscrepancy, setHasDiscrepancy] = useState(false);
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [images, setImages] = useState([]);

  const remaining = item.quantity_ordered - (item.quantity_received || 0);

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.filter({ is_active: true }),
  });

  const { data: shelves = [] } = useQuery({
    queryKey: ['shelves'],
    queryFn: () => base44.entities.Shelf.filter({ is_active: true }),
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);
      setImages([...images, ...newUrls]);
      toast.success(`${files.length} bild(er) uppladdad(e)`);
    } catch (error) {
      toast.error('Kunde inte ladda upp bilder');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleReceive = () => {
    if (receivedQty <= 0 || receivedQty > remaining) {
      toast.error('Ogiltigt antal');
      return;
    }

    if (images.length === 0) {
      toast.error('Ladda upp minst en bild (leverans/följesedel)');
      return;
    }

    if (hasDiscrepancy && !discrepancyReason.trim()) {
      toast.error('Ange orsak till avvikelse');
      return;
    }

    onReceive({
      quantity: receivedQty,
      shelfAddress,
      notes,
      qualityCheck,
      hasDiscrepancy,
      discrepancyReason: hasDiscrepancy ? discrepancyReason : null,
      images
    });

    setExpanded(false);
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
              {item.article_name}
              {item.is_custom && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Egen
                </span>
              )}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
              {item.article_batch_number && (
                <span className="font-mono">#{item.article_batch_number}</span>
              )}
              <span className="font-semibold text-white">
                Återstår: {remaining} st
              </span>
              {item.quantity_received > 0 && (
                <span className="text-green-400">
                  Mottaget: {item.quantity_received} st
                </span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setExpanded(!expanded)}
            variant={expanded ? "default" : "outline"}
            className={expanded ? "bg-blue-600" : "bg-slate-700 border-slate-600"}
          >
            {expanded ? 'Dölj' : 'Ta emot'}
          </Button>
        </div>

        {expanded && (
          <div className="space-y-4 mt-4 pt-4 border-t border-slate-700">
            {/* Quantity */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Antal att ta emot *
              </label>
              <Input
                type="number"
                min="1"
                max={remaining}
                value={receivedQty}
                onChange={(e) => setReceivedQty(parseInt(e.target.value) || 1)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            {/* Shelf Address */}
            {!item.is_custom && (
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Lagerplats
                </label>
                <Select
                  value={shelfAddress}
                  onValueChange={setShelfAddress}
                >
                  <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white mb-2">
                    <SelectValue placeholder="Välj hyllplats från lager" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-64 overflow-y-auto">
                    <SelectItem value={null}>Ingen vald</SelectItem>
                    {warehouses.map(wh => {
                      const whShelves = shelves.filter(s => s.warehouse_id === wh.id);
                      if (whShelves.length === 0) return null;
                      return (
                        <SelectGroup key={wh.id}>
                          <SelectLabel className="text-slate-400">{wh.name}</SelectLabel>
                          {whShelves.map(shelf => (
                            <SelectItem key={shelf.id} value={shelf.shelf_code}>
                              {shelf.shelf_code}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Input
                  value={shelfAddress}
                  onChange={(e) => setShelfAddress(e.target.value)}
                  placeholder="Eller skriv in egen hyllplats (t.ex. A1-B2)"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            )}

            {/* Quality Check */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700">
              <input
                type="checkbox"
                id={`qc-${item.id}`}
                checked={qualityCheck}
                onChange={(e) => setQualityCheck(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              <label htmlFor={`qc-${item.id}`} className="text-sm text-slate-300 cursor-pointer flex-1">
                Kvalitetskontroll utförd
              </label>
              <CheckCircle2 className={cn(
                "w-5 h-5",
                qualityCheck ? "text-green-400" : "text-slate-600"
              )} />
            </div>

            {/* Discrepancy */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700">
              <input
                type="checkbox"
                id={`disc-${item.id}`}
                checked={hasDiscrepancy}
                onChange={(e) => setHasDiscrepancy(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-amber-600 focus:ring-amber-500 focus:ring-offset-slate-900"
              />
              <label htmlFor={`disc-${item.id}`} className="text-sm text-slate-300 cursor-pointer flex-1">
                Rapportera avvikelse
              </label>
              <AlertTriangle className={cn(
                "w-5 h-5",
                hasDiscrepancy ? "text-amber-400" : "text-slate-600"
              )} />
            </div>

            {hasDiscrepancy && (
              <div>
                <label className="text-sm font-medium text-amber-300 mb-2 block">
                  Orsak till avvikelse *
                </label>
                <Textarea
                  value={discrepancyReason}
                  onChange={(e) => setDiscrepancyReason(e.target.value)}
                  placeholder="Beskriv avvikelsen (t.ex. skada, felaktig kvantitet, kvalitetsproblem)..."
                  className="bg-slate-900 border-amber-500/30 text-white h-20"
                />
              </div>
            )}

            {/* Images */}
            <div>
              <label className="text-sm font-medium text-amber-300 mb-2 block flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Bilder (följesedel, leverans) *
              </label>
              
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={url} 
                        alt={`Uppladdad ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id={`image-upload-${item.id}`}
                disabled={uploadingImages}
              />
              <label
                htmlFor={`image-upload-${item.id}`}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                  images.length === 0 
                    ? "border-amber-500/50 hover:border-amber-500 bg-amber-500/5" 
                    : "border-slate-700 hover:border-slate-600 bg-slate-900/50"
                )}
              >
                {uploadingImages ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-blue-400 rounded-full animate-spin" />
                    <span className="text-slate-400 text-sm">Laddar upp...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-400 text-sm">Lägg till bilder</span>
                  </>
                )}
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Anteckningar (valfritt)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ytterligare kommentarer om mottagningen..."
                className="bg-slate-900 border-slate-700 text-white h-20"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setExpanded(false)}
                variant="outline"
                className="flex-1 bg-slate-900 border-slate-700 hover:bg-slate-800"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleReceive}
                disabled={isReceiving || receivedQty <= 0 || images.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
              >
                {isReceiving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Tar emot...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Bekräfta mottagning
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}