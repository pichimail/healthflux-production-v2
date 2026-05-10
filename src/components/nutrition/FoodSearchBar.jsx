/**
 * FoodSearchBar — searches Open Food Facts API and USDA FoodData Central
 * (free, no API key needed) to find food items and return nutrition data.
 */
import React, { useState, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';

const COMMON_FOODS = [
  { food_name: 'Rice (cooked, 1 cup)', calories: 206, protein_g: 4.3, carbs_g: 44.5, fat_g: 0.4, fiber_g: 0.6, quantity_unit: 'cup' },
  { food_name: 'Chicken Breast (100g)', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, fiber_g: 0, quantity_unit: '100g' },
  { food_name: 'Whole Egg (1 large)', calories: 78, protein_g: 6, carbs_g: 0.6, fat_g: 5.3, fiber_g: 0, quantity_unit: 'egg' },
  { food_name: 'Banana (1 medium)', calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4, fiber_g: 3.1, quantity_unit: 'piece' },
  { food_name: 'Milk (1 cup, whole)', calories: 149, protein_g: 8, carbs_g: 12, fat_g: 8, fiber_g: 0, quantity_unit: 'cup' },
  { food_name: 'Dal (cooked, 1 cup)', calories: 230, protein_g: 17.9, carbs_g: 39.9, fat_g: 0.8, fiber_g: 15.6, quantity_unit: 'cup' },
  { food_name: 'Roti (1 medium, whole wheat)', calories: 85, protein_g: 3.1, carbs_g: 15.8, fat_g: 1.4, fiber_g: 2.2, quantity_unit: 'piece' },
  { food_name: 'Paneer (100g)', calories: 296, protein_g: 18.3, carbs_g: 1.2, fat_g: 22.7, fiber_g: 0, quantity_unit: '100g' },
  { food_name: 'Apple (1 medium)', calories: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3, fiber_g: 4.4, quantity_unit: 'piece' },
  { food_name: 'Oats (1/2 cup dry)', calories: 150, protein_g: 5, carbs_g: 27, fat_g: 3, fiber_g: 4, quantity_unit: 'serving' },
  { food_name: 'Curd / Yogurt (100g)', calories: 61, protein_g: 3.5, carbs_g: 4.7, fat_g: 3.3, fiber_g: 0, quantity_unit: '100g' },
  { food_name: 'Bread (1 slice, white)', calories: 79, protein_g: 2.7, carbs_g: 15, fat_g: 1, fiber_g: 0.6, quantity_unit: 'slice' },
  { food_name: 'Almonds (1 oz / 28g)', calories: 164, protein_g: 6, carbs_g: 6, fat_g: 14, fiber_g: 3.5, quantity_unit: 'oz' },
  { food_name: 'Salmon (100g, cooked)', calories: 206, protein_g: 22, carbs_g: 0, fat_g: 13, fiber_g: 0, quantity_unit: '100g' },
  { food_name: 'Sweet Potato (1 medium)', calories: 103, protein_g: 2.3, carbs_g: 24, fat_g: 0.1, fiber_g: 3.8, quantity_unit: 'piece' },
];

export default function FoodSearchBar({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounce = useRef(null);

  const search = (q) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); setShowDropdown(false); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      setShowDropdown(true);
      // Filter common foods first
      const local = COMMON_FOODS.filter(f => f.food_name.toLowerCase().includes(q.toLowerCase()));
      // Try Open Food Facts
      let remote = [];
      try {
        const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=6&fields=product_name,nutriments`);
        const data = await res.json();
        remote = (data.products || [])
          .filter(p => p.product_name && p.nutriments)
          .slice(0, 6)
          .map(p => ({
            food_name: p.product_name,
            calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
            protein_g: Math.round((p.nutriments['proteins_100g'] || 0) * 10) / 10,
            carbs_g: Math.round((p.nutriments['carbohydrates_100g'] || 0) * 10) / 10,
            fat_g: Math.round((p.nutriments['fat_100g'] || 0) * 10) / 10,
            fiber_g: Math.round((p.nutriments['fiber_100g'] || 0) * 10) / 10,
            quantity_unit: '100g',
          }));
      } catch (_) {}
      setResults([...local, ...remote].slice(0, 10));
      setLoading(false);
    }, 400);
  };

  const handleSelect = (item) => {
    onSelect(item);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 h-11 rounded-2xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
        {loading ? <Loader2 size={15} className="animate-spin flex-shrink-0" style={{ color: 'var(--hf-lemon-strong)' }} /> : <Search size={15} className="flex-shrink-0" style={{ color: 'var(--hf-text-muted)' }} />}
        <input
          type="text"
          value={query}
          onChange={e => search(e.target.value)}
          onFocus={() => query && setShowDropdown(true)}
          placeholder="Search food (e.g. rice, banana, chicken…)"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--hf-text)' }}
          aria-label="Search food database"
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); setResults([]); setShowDropdown(false); }} aria-label="Clear search">
            <X size={14} style={{ color: 'var(--hf-text-muted)' }} />
          </button>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', maxHeight: 300, overflowY: 'auto' }}>
          {results.map((item, i) => (
            <button key={i} type="button" onClick={() => handleSelect(item)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:opacity-80 transition-opacity border-b last:border-0"
              style={{ borderColor: 'var(--hf-border)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{item.food_name}</p>
                <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
                  P: {item.protein_g}g · C: {item.carbs_g}g · F: {item.fat_g}g
                </p>
              </div>
              <span className="text-sm font-black ml-3 flex-shrink-0" style={{ color: 'var(--hf-lemon-strong)' }}>{item.calories} kcal</span>
            </button>
          ))}
        </div>
      )}
      {showDropdown && !loading && query && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-2xl p-3 text-center"
          style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>No results — try a different name or add manually below.</p>
        </div>
      )}
    </div>
  );
}