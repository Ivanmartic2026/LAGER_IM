import React from 'react';
import { QRCodeSVG } from 'react-qr-code';

// 30x50mm label component
export default function ShelfLabel({ article }) {
  // Generate URL that opens the article directly in Find page
  const articleUrl = `${window.location.origin}/#/Find?articleId=${article.id}`;
  
  return (
    <div className="w-[50mm] h-[30mm] bg-white border border-gray-300 p-1.5 flex items-center gap-2 overflow-hidden">
      {/* QR Code - left side */}
      <div className="flex-shrink-0">
        <QRCodeSVG 
          value={articleUrl}
          size={80}
          level="M"
        />
      </div>
      
      {/* Info - right side */}
      <div className="flex-1 min-w-0 flex flex-col justify-center text-black text-[8px] leading-tight">
        {/* Shelf Location - Most prominent */}
        {article.shelf_address && (
          <div className="font-bold text-[14px] mb-0.5 truncate">
            {article.shelf_address}
          </div>
        )}
        
        {/* Batch Number */}
        {article.batch_number && (
          <div className="font-semibold text-[9px] truncate">
            #{article.batch_number}
          </div>
        )}
        
        {/* Name */}
        {article.name && (
          <div className="text-[7px] truncate mt-0.5">
            {article.name}
          </div>
        )}
        
        {/* Manufacturer */}
        {article.manufacturer && (
          <div className="text-[7px] text-gray-600 truncate">
            {article.manufacturer}
          </div>
        )}
      </div>
    </div>
  );
}