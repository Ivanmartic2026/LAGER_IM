import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

export default function LocationEditSection({ locationData, setLocationData }) {
  const [shelfSearch, setShelfSearch] = useState('');
  const [activeShelfIndex, setActiveShelfIndex] = useState(null);

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
  });

  const { data: shelves = [] } = useQuery({
    queryKey: ['shelves'],
    queryFn: () => base44.entities.Shelf.list(),
  });

  // Ensure shelf_addresses is always an array
  const shelfAddresses = Array.isArray(locationData.shelf_addresses)
    ? locationData.shelf_addresses
    : locationData.shelf_address
      ? [locationData.shelf_address]
      : [''];

  const updateShelfAddresses = (newAddresses) => {
    setLocationData({
      ...locationData,
      shelf_addresses: newAddresses,
      shelf_address: newAddresses[0] || '',
    });
  };

  const availableShelves = locationData.warehouse
    ? shelves.filter(s => {
        const wh = warehouses.find(w => w.name === locationData.warehouse || w.id === locationData.warehouse);
        return wh && s.warehouse_id === wh.id;
      })
    : [];

  const filteredShelves = (search) => availableShelves.filter(s =>
    !search || s.shelf_code.toLowerCase().includes(search.toLowerCase())
  );

  const addShelfSlot = () => {
    updateShelfAddresses([...shelfAddresses, '']);
  };

  const removeShelf = (index) => {
    const updated = shelfAddresses.filter((_, i) => i !== index);
    updateShelfAddresses(updated.length > 0 ? updated : ['']);
  };

  const updateShelf = (index, value) => {
    const updated = [...shelfAddresses];
    updated[index] = value;
    updateShelfAddresses(updated);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Warehouse</label>
        {warehouses.length === 0 ? (
          <Input
            type="text"
            value={locationData.warehouse}
            onChange={(e) => setLocationData({ ...locationData, warehouse: e.target.value, shelf_address: '', shelf_addresses: [''] })}
            className="bg-slate-900 border-slate-700 text-white"
            placeholder="Lagerställe"
          />
        ) : (
          <Select
            value={locationData.warehouse}
            onValueChange={(value) => setLocationData({ ...locationData, warehouse: value, shelf_address: '', shelf_addresses: [''] })}
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
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-400">Hyllplatser</label>
          <button
            type="button"
            onClick={addShelfSlot}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Lägg till plats
          </button>
        </div>

        <div className="space-y-2">
          {shelfAddresses.map((addr, index) => (
            <div key={index} className="flex items-center gap-2">
              {!locationData.warehouse || availableShelves.length === 0 ? (
                <Input
                  type="text"
                  value={addr}
                  onChange={(e) => updateShelf(index, e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white flex-1"
                  placeholder={!locationData.warehouse ? 'Välj lagerställe först' : `Hyllplats ${index + 1}`}
                />
              ) : (
                <ShelfSelect
                  value={addr}
                  onChange={(val) => updateShelf(index, val)}
                  shelves={filteredShelves('')}
                  placeholder={`Hyllplats ${index + 1}`}
                />
              )}
              {shelfAddresses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeShelf(index)}
                  className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShelfSelect({ value, onChange, shelves, placeholder }) {
  const [search, setSearch] = useState('');
  const filtered = shelves.filter(s =>
    !search || s.shelf_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-slate-900 border-slate-700 text-white flex-1">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[50vh]" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div
          className="p-2 border-b border-slate-700 sticky top-0 bg-slate-900 z-10"
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Input
            placeholder="Sök hyllplats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 bg-slate-800 border-slate-700 text-white"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        {filtered.map(s => (
          <SelectItem key={s.id} value={s.shelf_code}>
            {s.shelf_code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}