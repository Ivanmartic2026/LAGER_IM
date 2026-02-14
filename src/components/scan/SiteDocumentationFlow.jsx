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
    notes: '',
    gps_latitude: null,
    gps_longitude: null,
    linked_order_id: null
  });
  const [capturedImages, setCapturedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Fetch picked orders (ready for delivery)
  const { data: pickedOrders = [] } = useQuery({
    queryKey: ['pickedOrders'],
    queryFn: async () => {
      const orders = await base44.entities.Order.filter({ status: 'picked' });
      return orders;
    }
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

    try {
      const user = await base44.auth.me();

      // Skapa site-rapport
      const report = await base44.entities.SiteReport.create({
        site_name: siteData.site_name,
        site_address: siteData.site_address,
        notes: siteData.notes,
        technician_name: user.full_name,
        technician_email: user.email,
        report_date: new Date().toISOString(),
        status: 'pending_review',
        gps_latitude: siteData.gps_latitude,
        gps_longitude: siteData.gps_longitude,
        linked_order_id: siteData.linked_order_id
      });

      // Ladda upp bilder och analysera direkt
      toast.info('Analyserar bilder med AI...');
      
      const uploadedImages = [];
      for (const imageData of capturedImages) {
        // Konvertera base64 till blob
        const blob = await fetch(imageData).then(r => r.blob());
        const file = new File([blob], `site-${Date.now()}.jpg`, { type: 'image/jpeg' });

        // Ladda upp
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        // Skapa site-rapport-bild
        const siteImage = await base44.entities.SiteReportImage.create({
          site_report_id: report.id,
          image_url: file_url,
          match_status: 'pending'
        });
        
        uploadedImages.push(siteImage);
      }

      // Kör AI-matchning direkt
      try {
        await base44.functions.invoke('matchSiteImages', {
          site_report_id: report.id
        });
        toast.success('AI-matchning klar!');
      } catch (matchError) {
        console.error('Matching error:', matchError);
        toast.warning('Bilder sparade, matchning kan köras manuellt');
      }

      setStep('success');
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Kunde inte spara: ' + error.message);
      setUploading(false);
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
              Koppla till order (valfritt)
            </label>
            <Select 
              value={siteData.linked_order_id || ''} 
              onValueChange={(value) => setSiteData(prev => ({ ...prev, linked_order_id: value || null }))}
            >
              <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                <SelectValue placeholder="Ingen order vald" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value={null}>Ingen order</SelectItem>
                {pickedOrders.map(order => (
                  <SelectItem key={order.id} value={order.id}>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      <span>{order.order_number || order.customer_name} - {order.customer_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pickedOrders.length === 0 && (
              <p className="text-xs text-white/40 mt-1">Inga plockade ordrar tillgängliga</p>
            )}
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

          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">
              Anteckningar
            </label>
            <Textarea
              value={siteData.notes}
              onChange={(e) => setSiteData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Övriga noteringar om besöket..."
              className="bg-zinc-900 border-white/10 text-white min-h-24"
            />
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
                    className="w-full h-32 object-cover rounded-xl"
                  />
                  <button
                    onClick={() => setCapturedImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
            className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            Tillbaka
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={capturedImages.length === 0 || uploading}
            className="flex-1 bg-green-600 hover:bg-green-500"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Skicka rapport ({capturedImages.length})
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }
}