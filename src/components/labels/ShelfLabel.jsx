import React from 'react';

// 30x50mm label component
export default function ShelfLabel({ article }) {
  // Generate URL that opens the article directly in Find page
  const articleUrl = `${window.location.origin}/#/Find?articleId=${article.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(articleUrl)}`;
  
  return (
    <div className="w-[50mm] h-[30mm] bg-white border-2 border-black p-2 flex gap-2">
      {/* QR Code - left side */}
      <div className="flex-shrink-0 flex items-center">
        <img 
          src={qrCodeUrl} 
          alt="QR Code"
          className="w-[25mm] h-[25mm] object-contain"
        />
      </div>
      
      {/* Info - right side */}
      <div className="flex-1 min-w-0 flex flex-col justify-center text-black">
        {/* Shelf Location - Most prominent */}
        {article.shelf_address && (
          <div className="font-bold text-[16px] truncate leading-tight">
            {article.shelf_address}
          </div>
        )}
        
        {/* Batch Number */}
        {article.batch_number && (
          <div className="font-semibold text-[10px] truncate mt-0.5">
            #{article.batch_number}
          </div>
        )}
        
        {/* Name */}
        {article.name && (
          <div className="text-[8px] truncate mt-1 font-medium leading-tight">
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