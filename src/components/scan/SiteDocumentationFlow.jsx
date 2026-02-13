import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, MapPin, Upload, Loader2, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

export default function SiteDocumentationFlow({ onComplete, onCancel }) {
  const [step, setStep] = useState('info'); // 'info', 'capture', 'uploading', 'success'
  const [siteData, setSiteData] = useState({
    site_name: '',
    site_address: '',
    notes: ''
  });
  const [capturedImages, setCapturedImages] = useState([]);
  const [uploading, setUploading] = useState(false);

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
        status: 'pending_review'
      });

      // Ladda upp bilder
      for (const imageData of capturedImages) {
        // Konvertera base64 till blob
        const blob = await fetch(imageData).then(r => r.blob());
        const file = new File([blob], `site-${Date.now()}.jpg`, { type: 'image/jpeg' });

        // Ladda upp
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        // Skapa site-rapport-bild
        await base44.entities.SiteReportImage.create({
          site_report_id: report.id,
          image_url: file_url,
          match_status: 'pending'
        });
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