import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, MapPin, Upload, Loader2, CheckCircle2, X, Navigation, Package } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function SiteDocumentationFlow({ onComplete, onCancel }) {
  const [step, setStep] = useState('info'); // 'info', 'capture', 'uploading', 'success'
  const [siteData, setSiteData] = useState({
    site_name: '',
    site_address: '',
    rm_service_id: '',
    notes: '',
    gps_latitude: null,
    gps_longitude: null,
    linked_order_id: null
  });
  const [capturedImages, setCapturedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Fetch all orders (not just picked)
  const { data: allOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['allOrders'],
    queryFn: async () => {
      const orders = await base44.entities.Order.list('-created_date');
      // Filter out cancelled and delivered orders
      const relevantOrders = orders.filter(o => 
        o.status !== 'cancelled' && o.status !== 'delivered'
      );
      console.log('Loaded orders:', relevantOrders.length, 'of', orders.length);
      return relevantOrders;
    }
  });

  // Fetch order items when an order is selected
  const { data: selectedOrderItems = [] } = useQuery({
    queryKey: ['orderItems', siteData.linked_order_id],
    queryFn: async () => {
      if (!siteData.linked_order_id) return [];
      const items = await base44.entities.OrderItem.filter({ order_id: siteData.linked_order_id });
      console.log('Loaded order items:', items.length);
      return items;
    },
    enabled: !!siteData.linked_order_id
  });

  // Get GPS position and address on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          setSiteData(prev => ({
            ...prev,
            gps_latitude: lat,
            gps_longitude: lon
          }));
          
          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            
            if (data.display_name) {
              setSiteData(prev => ({
                ...prev,
                site_address: data.display_name
              }));
              toast.success('GPS-position och adress hämtad');
            } else {
              toast.success('GPS-position hämtad');
            }
          } catch (error) {
            console.log('Reverse geocoding error:', error);
            toast.success('GPS-position hämtad');
          }
          
          setGettingLocation(false);
        },
        (error) => {
          console.log('GPS error:', error);
          setGettingLocation(false);
        }
      );
    }
  }, []);

  const handleImageCapture = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageUrls = [];
    for (const file of files) {
      const reader = new FileReader();
      reader.onloadend = () => {
        imageUrls.push(reader.result);
        if (imageUrls.length === files.length) {
          setCapturedImages(prev => [...prev, ...imageUrls]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!siteData.site_name) {
      toast.error('Ange platsnamn');
      return;
    }

    if (capturedImages.length === 0) {
      toast.error('Ta minst en bild');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Förbereder...');

    try {
      const user = await base44.auth.me();

      // Steg 1: Skapa rapport (10% progress)
      setUploadStatus('Skapar rapport...');
      setUploadProgress(10);
      
      // Prepare parts_replaced from order items if order is linked
      const partsReplaced = selectedOrderItems.map(item => ({
        article_id: item.article_id,
        article_name: item.article_name,
        batch_number: item.article_batch_number,
        quantity: item.quantity_ordered,
        reason: 'Från order'
      }));

      const report = await base44.entities.SiteReport.create({
        site_name: siteData.site_name,
        site_address: siteData.site_address,
        rm_service_id: siteData.rm_service_id,
        notes: siteData.notes,
        technician_name: user.full_name,
        technician_email: user.email,
        report_date: new Date().toISOString(),
        status: 'pending_review',
        gps_latitude: siteData.gps_latitude,
        gps_longitude: siteData.gps_longitude,
        linked_order_id: siteData.linked_order_id,
        parts_replaced: partsReplaced.length > 0 ? partsReplaced : undefined
      });

      // Steg 2: Ladda upp bilder (10% -> 70%)
      const totalImages = capturedImages.length;
      const uploadedImages = [];
      
      for (let i = 0; i < totalImages; i++) {
        const imageData = capturedImages[i];
        const progressStart = 10 + (i * 60 / totalImages);
        const progressEnd = 10 + ((i + 1) * 60 / totalImages);
        
        setUploadStatus(`Laddar upp bild ${i + 1} av ${totalImages}...`);
        setUploadProgress(progressStart);

        try {
          // Konvertera base64 till blob
          const blob = await fetch(imageData).then(r => r.blob());
          const file = new File([blob], `site-${Date.now()}-${i}.jpg`, { type: 'image/jpeg' });

          // Ladda upp
          const { file_url } = await base44.integrations.Core.UploadFile({ file });

          // Skapa site-rapport-bild
          const siteImage = await base44.entities.SiteReportImage.create({
            site_report_id: report.id,
            image_url: file_url,
            match_status: 'pending'
          });
          
          uploadedImages.push(siteImage);
          setUploadProgress(progressEnd);
        } catch (imageError) {
          console.error(`Error uploading image ${i + 1}:`, imageError);
          toast.error(`Bild ${i + 1} kunde inte laddas upp`);
        }
      }

      if (uploadedImages.length === 0) {
        throw new Error('Inga bilder kunde laddas upp');
      }

      // Steg 3: Klar (100%)
      setUploadStatus('Klart!');
      setUploadProgress(100);
      
      setTimeout(() => {
        setStep('success');
        setTimeout(() => {
          onComplete();
        }, 1500);
      }, 500);

    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Något gick fel: ' + error.message);
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Rapport skapad!</h2>
        <p className="text-white/50">Lagerchefen kommer att granska matchningarna</p>
      </div>
    );
  }

  if (step === 'info') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Site-information</h2>
          <p className="text-white/50">Ange plats och grundläggande information</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">
              Platsnamn *
            </label>
            <Input
              value={siteData.site_name}
              onChange={(e) => setSiteData(prev => ({ ...prev, site_name: e.target.value }))}
              placeholder="t.ex. Stockholm Centralstation"
              className="bg-zinc-900 border-white/10 text-white"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">
              Adress
            </label>
            <Input
              value={siteData.site_address}
              onChange={(e) => setSiteData(prev => ({ ...prev, site_address: e.target.value }))}
              placeholder="Gatuadress"
              className="bg-zinc-900 border-white/10 text-white"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">
              RM Install/Service ID
            </label>
            <Input
              value={siteData.rm_service_id}
              onChange={(e) => setSiteData(prev => ({ ...prev, rm_service_id: e.target.value }))}
              placeholder="t.ex. RM-2024-001"
              className="bg-zinc-900 border-white/10 text-white"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">
              Koppla till order (valfritt)
            </label>
            <Select 
              value={siteData.linked_order_id || ''} 
              onValueChange={(value) => setSiteData(prev => ({ ...prev, linked_order_id: value === '' ? null : value }))}
            >
              <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                <SelectValue placeholder={ordersLoading ? "Laddar..." : "Ingen order vald"} />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white max-h-[200px]">
                <SelectItem value={null}>Ingen order</SelectItem>
                {allOrders.map(order => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.order_number || order.customer_name} - {order.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!ordersLoading && allOrders.length === 0 && (
              <p className="text-xs text-white/40 mt-1">Inga ordrar tillgängliga</p>
            )}
            {ordersLoading && (
              <p className="text-xs text-white/40 mt-1 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Laddar ordrar...
              </p>
            )}
            {siteData.linked_order_id && selectedOrderItems.length > 0 && (
              <div className="mt-2 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium mb-2">
                  <Package className="w-4 h-4" />
                  Artiklar från order ({selectedOrderItems.length})
                </div>
                <div className="space-y-1 text-xs text-white/60">
                  {selectedOrderItems.slice(0, 3).map((item, idx) => (
                    <div key={idx}>• {item.article_name} ({item.quantity_ordered} st)</div>
                  ))}
                  {selectedOrderItems.length > 3 && (
                    <div className="text-white/40">... och {selectedOrderItems.length - 3} till</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
              Anteckningar
            </label>
            <Textarea
              value={siteData.notes}
              onChange={(e) => setSiteData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Övriga noteringar om besöket..."
              className="bg-zinc-900 border-white/10 text-white min-h-24"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
              GPS-position
              {gettingLocation && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              )}
            </label>
            {siteData.gps_latitude && siteData.gps_longitude ? (
              <div className="space-y-2">
                <div className="h-48 rounded-xl overflow-hidden border border-white/10">
                  <MapContainer 
                    center={[siteData.gps_latitude, siteData.gps_longitude]} 
                    zoom={15} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    <Marker position={[siteData.gps_latitude, siteData.gps_longitude]}>
                      <Popup>{siteData.site_name}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Navigation className="w-3 h-3" />
                  <span>{siteData.gps_latitude.toFixed(6)}, {siteData.gps_longitude.toFixed(6)}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-sm text-white/50">
                {gettingLocation ? 'Hämtar position...' : 'GPS-position ej tillgänglig'}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            Avbryt
          </Button>
          <Button
            onClick={() => setStep('capture')}
            disabled={!siteData.site_name}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500"
          >
            Nästa: Ta bilder
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'capture') {
    return (
      <div className="space-y-6">
        {uploading ? (
          <div className="py-12 space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{uploadStatus}</h2>
              <p className="text-white/50 mb-6">Vänta, stäng inte appen</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Framsteg</span>
                <span className="text-blue-400 font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Fotografera komponenter</h2>
              <p className="text-white/50">Ta bilder på alla relevanta delar</p>
            </div>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleImageCapture}
          className="hidden"
          id="site-camera-input"
        />

        {capturedImages.length === 0 ? (
          <label
            htmlFor="site-camera-input"
            className="flex flex-col items-center justify-center min-h-[300px] rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 cursor-pointer transition-colors bg-white/5"
          >
            <Camera className="w-12 h-12 text-white/40 mb-4" />
            <p className="text-white/70 font-medium mb-1">Tryck för att ta bilder</p>
            <p className="text-white/40 text-sm">Du kan ta flera bilder</p>
          </label>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {capturedImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img 
                    src={img} 
                    alt={`Bild ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setPreviewImage(img)}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCapturedImages(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>

            <label
              htmlFor="site-camera-input"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/20 hover:bg-white/5 cursor-pointer transition-colors"
            >
              <Camera className="w-5 h-5 text-white/70" />
              <span className="text-white/70">Ta fler bilder</span>
            </label>
          </div>
        )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('info')}
                disabled={uploading}
                className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                Tillbaka
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={capturedImages.length === 0 || uploading}
                className="flex-1 bg-green-600 hover:bg-green-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                Skicka rapport ({capturedImages.length})
              </Button>
            </div>
          </>
        )}

        {/* Image Preview Modal */}
        {previewImage && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={previewImage} 
              alt="Förhandsvisning"
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }
}