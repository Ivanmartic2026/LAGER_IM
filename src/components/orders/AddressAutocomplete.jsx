import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Sync if value changes externally
  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);

    clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5&countrycodes=se`,
          { headers: { 'Accept-Language': 'sv' } }
        );
        const data = await res.json();
        setSuggestions(data);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelect = (item) => {
    const addr = item.address || {};
    const street = [addr.road, addr.house_number].filter(Boolean).join(' ') || item.display_name;
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    const postcode = addr.postcode || '';

    setQuery(street);
    onChange(street);
    onSelect({ street, city, postcode });
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={handleChange}
        placeholder={placeholder || 'Sök adress...'}
        className={className}
        autoComplete="off"
      />
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Söker...</div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Inga adresser hittades</div>
          ) : (
            suggestions.map((item, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={() => handleSelect(item)}
                className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 border-b border-gray-100 last:border-0 truncate"
              >
                {item.display_name}
              </button>
            ))
          )}
        </div>
      )}
      <p className="text-xs text-slate-500 mt-1">© OpenStreetMap-bidragsgivare</p>
    </div>
  );
}