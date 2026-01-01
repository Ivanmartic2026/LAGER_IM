import React from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

// Repair label component with all details
export default function RepairLabel({ article, repairNotes, repairDate, quantity }) {
  return (
    <div className="w-[100mm] min-h-[70mm] bg-white border-4 border-red-600 p-4 text-black">
      {/* Logo */}
      <div className="flex justify-center mb-2">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png" 
          alt="IMvision"
          className="h-[20px] object-contain"
        />
      </div>

      {/* Header - REPAIR */}
      <div className="bg-red-600 text-white text-center py-2 mb-3 -mx-4">
        <div className="text-[24px] font-bold">PÅ REPARATION</div>
        <div className="text-[14px]">
          {format(new Date(repairDate), "d MMMM yyyy", { locale: sv })}
        </div>
      </div>

      {/* Article Details */}
      <div className="space-y-2 mb-3">
        <div className="border-b-2 border-gray-300 pb-2">
          <div className="text-[10px] text-gray-600 uppercase font-semibold">Artikelnamn</div>
          <div className="text-[16px] font-bold">{article.name}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-gray-600 uppercase font-semibold">Batch-nummer</div>
            <div className="text-[14px] font-bold">#{article.batch_number}</div>
          </div>
          
          {article.shelf_address && (
            <div>
              <div className="text-[10px] text-gray-600 uppercase font-semibold">Hyllplats</div>
              <div className="text-[14px] font-bold">{article.shelf_address}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {article.manufacturer && (
            <div>
              <div className="text-[10px] text-gray-600 uppercase font-semibold">Tillverkare</div>
              <div className="text-[12px]">{article.manufacturer}</div>
            </div>
          )}
          
          {article.category && (
            <div>
              <div className="text-[10px] text-gray-600 uppercase font-semibold">Kategori</div>
              <div className="text-[12px]">{article.category}</div>
            </div>
          )}
        </div>

        {article.pixel_pitch_mm && (
          <div>
            <div className="text-[10px] text-gray-600 uppercase font-semibold">Pixel Pitch</div>
            <div className="text-[12px]">{article.pixel_pitch_mm} mm</div>
          </div>
        )}

        {(article.dimensions_width_mm || article.dimensions_height_mm || article.dimensions_depth_mm) && (
          <div>
            <div className="text-[10px] text-gray-600 uppercase font-semibold">Dimensioner (B×H×D)</div>
            <div className="text-[12px]">
              {article.dimensions_width_mm || '—'} × {article.dimensions_height_mm || '—'} × {article.dimensions_depth_mm || '—'} mm
            </div>
          </div>
        )}
      </div>

      {/* Repair Details */}
      <div className="border-t-2 border-red-600 pt-3 space-y-2">
        <div>
          <div className="text-[10px] text-gray-600 uppercase font-semibold">Antal på reparation</div>
          <div className="text-[18px] font-bold text-red-600">{quantity} st</div>
        </div>

        <div>
          <div className="text-[10px] text-gray-600 uppercase font-semibold">Anledning till reparation</div>
          <div className="text-[12px] mt-1 whitespace-pre-wrap">{repairNotes}</div>
        </div>
      </div>
    </div>
  );
}