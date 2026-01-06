import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

// 40x30mm label optimized for shelf printing
export default function ShelfLabel({ article }) {
  const qrRef = useRef(null);

  useEffect(() => {
    if (qrRef.current && article.batch_number) {
      QRCode.toCanvas(qrRef.current, article.batch_number, {
        width: 90,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    }
  }, [article.batch_number]);

  return (
    <div className="w-[40mm] h-[30mm] bg-white border-2 border-black p-1.5 flex flex-col text-black">
      {/* Logo at top */}
      <div className="flex justify-center mb-1">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png" 
          alt="IMvision"
          className="h-[10px] object-contain"
        />
      </div>

      {/* Content area */}
      <div className="flex flex-1">
      {/* Left side - Text info */}
      <div className="flex-1 flex flex-col justify-between pr-1.5">
        {/* Shelf Location - Most prominent */}
        {article.shelf_address && (
          <div className="font-black text-[20px] truncate leading-none">
            {article.shelf_address}
          </div>
        )}
        
        <div className="space-y-0.5">
          {/* Batch Number */}
          {article.batch_number && (
            <div className="font-bold text-[10px] truncate leading-none">
              {article.batch_number}
            </div>
          )}
          
          {/* Name */}
          {article.name && (
            <div className="text-[7px] font-medium leading-tight break-words line-clamp-3">
              {article.name}
            </div>
          )}
        </div>
      </div>

      {/* Right side - QR Code */}
      {article.batch_number && (
        <div className="flex items-center justify-center">
          <canvas ref={qrRef} className="w-[90px] h-[90px]" />
        </div>
      )}
      </div>
    </div>
  );
}