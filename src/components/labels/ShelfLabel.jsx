import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

// 30x50mm label component
export default function ShelfLabel({ article }) {
  const qrRef = useRef(null);

  useEffect(() => {
    if (qrRef.current && article.batch_number) {
      QRCode.toCanvas(qrRef.current, article.batch_number, {
        width: 60,
        margin: 0,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    }
  }, [article.batch_number]);

  return (
    <div className="w-[50mm] h-[30mm] bg-white border-2 border-black p-2 flex text-black">
      {/* Left side - Text info */}
      <div className="flex-1 flex flex-col justify-center pr-2">
        {/* Shelf Location - Most prominent */}
        {article.shelf_address && (
          <div className="font-bold text-[18px] truncate leading-tight mb-1">
            {article.shelf_address}
          </div>
        )}
        
        {/* Batch Number */}
        {article.batch_number && (
          <div className="font-semibold text-[11px] truncate mb-1">
            #{article.batch_number}
          </div>
        )}
        
        {/* Name */}
        {article.name && (
          <div className="text-[9px] truncate font-medium leading-tight mb-0.5">
            {article.name}
          </div>
        )}
        
        {/* Manufacturer */}
        {article.manufacturer && (
          <div className="text-[8px] text-gray-600 truncate">
            {article.manufacturer}
          </div>
        )}
      </div>

      {/* Right side - QR Code */}
      {article.batch_number && (
        <div className="flex items-center justify-center">
          <canvas ref={qrRef} className="w-[60px] h-[60px]" />
        </div>
      )}
    </div>
  );
}