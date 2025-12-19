import React from 'react';

// 30x50mm label component
export default function ShelfLabel({ article }) {
  return (
    <div className="w-[50mm] h-[30mm] bg-white border-2 border-black p-2 flex flex-col justify-between">
      {/* Shelf Location - Most prominent */}
      {article.shelf_address && (
        <div className="font-bold text-[20px] text-black text-center border-b-2 border-black pb-1">
          {article.shelf_address}
        </div>
      )}
      
      <div className="flex-1 flex flex-col justify-center text-black">
        {/* Batch Number */}
        {article.batch_number && (
          <div className="font-bold text-[12px] truncate text-center">
            #{article.batch_number}
          </div>
        )}
        
        {/* Name */}
        {article.name && (
          <div className="text-[10px] truncate mt-1 text-center font-semibold">
            {article.name}
          </div>
        )}
        
        {/* Manufacturer */}
        {article.manufacturer && (
          <div className="text-[9px] text-gray-700 truncate mt-0.5 text-center">
            {article.manufacturer}
          </div>
        )}
      </div>
      
      {/* Stock quantity if available */}
      {article.stock_qty !== undefined && (
        <div className="text-[10px] text-black text-center font-semibold border-t border-gray-400 pt-1">
          Lager: {article.stock_qty} st
        </div>
      )}
    </div>
  );
}