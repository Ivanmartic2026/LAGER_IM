import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronDown, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

/**
 * Props:
 *  value          – current fortnox_customer_number string
 *  customerName   – current customer_name string
 *  onChange       – (customerNumber: string) => void
 *  onSelect       – ({ CustomerNumber, Name }) => void  (called on dropdown pick)
 *  disabled       – bool
 */
export default function FortnoxCustomerSelect({ value, customerName, onChange, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch Fortnox customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['fortnox_customers'],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke('fetchFortnoxCustomers', {});
        if (result.data?.success) return result.data.customers || [];
      } catch {}
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Also pull unique customers from existing orders as fallback
  const { data: orderCustomers = [] } = useQuery({
    queryKey: ['order_customers'],
    queryFn: async () => {
      const orders = await base44.entities.Order.list('-created_date', 200);
      const map = new Map();
      orders.forEach(o => {
        if (o.fortnox_customer_number && !map.has(o.fortnox_customer_number)) {
          map.set(o.fortnox_customer_number, { CustomerNumber: o.fortnox_customer_number, Name: o.customer_name || '' });
        }
      });
      return Array.from(map.values());
    },
    staleTime: 5 * 60 * 1000,
  });

  // Merge: Fortnox API results take precedence
  const allCustomers = React.useMemo(() => {
    const merged = new Map();
    orderCustomers.forEach(c => merged.set(c.CustomerNumber, c));
    customers.forEach(c => merged.set(c.CustomerNumber, c));
    return Array.from(merged.values()).sort((a, b) =>
      (a.CustomerNumber || '').localeCompare(b.CustomerNumber || '', undefined, { numeric: true })
    );
  }, [customers, orderCustomers]);

  const filtered = allCustomers.filter(c =>
    !search ||
    c.Name?.toLowerCase().includes(search.toLowerCase()) ||
    c.CustomerNumber?.toLowerCase().includes(search.toLowerCase())
  );

  // Display value in the main input
  const displayValue = React.useMemo(() => {
    if (!value) return '';
    const found = allCustomers.find(c => c.CustomerNumber === value);
    if (found && found.Name) return `${found.CustomerNumber} — ${found.Name}`;
    return value;
  }, [value, allCustomers]);

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const handleInputChange = (e) => {
    const v = e.target.value;
    setSearch(v);
    // Allow manual free-text entry
    onChange && onChange(v);
    setOpen(true);
  };

  const handleSelect = (customer) => {
    onSelect && onSelect(customer);
    onChange && onChange(customer.CustomerNumber);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange && onChange('');
    onSelect && onSelect({ CustomerNumber: '', Name: '' });
    setSearch('');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={open ? search : displayValue}
          onChange={handleInputChange}
          onFocus={() => { setOpen(true); setSearch(''); }}
          placeholder="Sök kundnummer eller namn..."
          disabled={disabled}
          className="bg-slate-800 border-slate-700 text-white pr-16"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button type="button" onClick={handleClear}
              className="text-white/30 hover:text-white/70 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isLoading
            ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            : <ChevronDown className="w-4 h-4 text-white/30" />
          }
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-white/50 text-center">
              {search ? `Ingen kund hittad — tryck Enter för att använda "${search}" manuellt` : 'Inga kunder'}
            </div>
          ) : (
            filtered.map((customer) => (
              <button
                type="button"
                key={customer.CustomerNumber}
                onClick={() => handleSelect(customer)}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-800 border-b border-slate-800/60 last:border-0 transition-colors"
              >
                <span className="font-bold text-white text-sm">{customer.CustomerNumber}</span>
                <span className="text-white/60 text-sm"> — {customer.Name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}