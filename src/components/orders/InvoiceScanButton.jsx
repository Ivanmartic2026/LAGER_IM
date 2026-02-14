import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export default function InvoiceScanButton() {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      // Upload the original file
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      
      toast.success('Faktura sparad i systemet!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Kunde inte spara fakturan');
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-all duration-300"
      >
        <Zap className="w-4 h-4 mr-2" />
        {isLoading ? 'Laddar upp...' : 'Skanna faktura'}
      </Button>
    </>
  );
}