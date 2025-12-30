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
    <div className="w-[40mm] h-[30mm] bg-white border-2 border-black p-1.5 flex text-black">
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
            <div className="text-[7px] truncate font-medium leading-tight">
              {article.name.length > 35 ? article.name.substring(0, 35) + '...' : article.name}
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
  );
}