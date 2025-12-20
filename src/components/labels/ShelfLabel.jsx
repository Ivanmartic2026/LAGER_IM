import React from 'react';

// 30x50mm label component
export default function ShelfLabel({ article }) {
  return (
    <div className="w-[50mm] h-[30mm] bg-white border-2 border-black p-3 flex flex-col justify-center text-black">
      {/* Shelf Location - Most prominent */}
      {article.shelf_address && (
        <div className="font-bold text-[20px] truncate leading-tight mb-1">
          {article.shelf_address}
        </div>
      )}
      
      {/* Batch Number */}
      {article.batch_number && (
        <div className="font-semibold text-[12px] truncate mb-1">
          #{article.batch_number}
        </div>
      )}
      
      {/* Name */}
      {article.name && (
        <div className="text-[10px] truncate font-medium leading-tight mb-0.5">
          {article.name}
        </div>
      )}
      
      {/* Manufacturer */}
      {article.manufacturer && (
        <div className="text-[9px] text-gray-600 truncate">
          {article.manufacturer}
        </div>
      )}
    </div>
  );
}