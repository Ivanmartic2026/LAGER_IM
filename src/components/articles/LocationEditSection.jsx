import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LocationEditSection({ locationData, setLocationData }) {
  const [shelfSearch, setShelfSearch] = useState('');

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
  });

  const { data: shelves = [] } = useQuery({
    queryKey: ['shelves'],
    queryFn: () => base44.entities.Shelf.list(),
  });

  const availableShelves = locationData.warehouse
    ? shelves.filter(s => {
        const wh = warehouses.find(w => w.name === locationData.warehouse || w.id === locationData.warehouse);
        return wh && s.warehouse_id === wh.id;
      })
    : [];

  const filteredShelves = availableShelves.filter(s =>
    !shelfSearch || s.shelf_code.toLowerCase().includes(shelfSearch.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Warehouse</label>
        {warehouses.length === 0 ? (
          <Input
            type="text"
            value={locationData.warehouse}
            onChange={(e) => setLocationData({ ...locationData, warehouse: e.target.value, shelf_address: '' })}
            className="bg-slate-900 border-slate-700 text-white"
            placeholder="Lagerställe"
          />
        ) : (
          <Select
            value={locationData.warehouse}
            onValueChange={(value) => setLocationData({ ...locationData, warehouse: value, shelf_address: '' })}
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Välj lagerställe..." />
            </SelectTrigger>
            <SelectContent className="max-h-[50vh]" onCloseAutoFocus={(e) => e.preventDefault()}>
              {warehouses.map(wh => (
                <SelectItem key={wh.id} value={wh.name}>
                  {wh.code ? `${wh.code} - ${wh.name}` : wh.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Hyllplats</label>
        {!locationData.warehouse || availableShelves.length === 0 ? (
          <Input
            type="text"
            value={locationData.shelf_address}
            onChange={(e) => setLocationData({ ...locationData, shelf_address: e.target.value })}
            className="bg-slate-900 border-slate-700 text-white"
            placeholder={!locationData.warehouse ? 'Välj lagerställe först' : 'Ange hyllplats'}
          />
        ) : (
          <Select
            value={locationData.shelf_address}
            onValueChange={(value) => setLocationData({ ...locationData, shelf_address: value })}
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Välj hyllplats..." />
            </SelectTrigger>
            <SelectContent className="max-h-[50vh]" onCloseAutoFocus={(e) => e.preventDefault()}>
              <div
                className="p-2 border-b border-slate-700 sticky top-0 bg-slate-900 z-10"
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Input
                  placeholder="Sök hyllplats..."
                  value={shelfSearch}
                  onChange={(e) => setShelfSearch(e.target.value)}
                  className="h-9 bg-slate-800 border-slate-700 text-white"
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              {filteredShelves.map(s => (
                <SelectItem key={s.id} value={s.shelf_code}>
                  {s.shelf_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}