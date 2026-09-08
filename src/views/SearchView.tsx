import { useState } from 'react';
import { Search, SlidersHorizontal, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';

export function SearchView() {
  const { products, openProductDetail } = useApp();
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const filterChips = [
    { id: 'all', label: 'Alle' },
    { id: 'nutriA', label: 'Nutri-Score A' },
    { id: 'highProtein', label: 'High Protein (10g+)' },
    { id: 'vegan', label: 'Vegan' },
    { id: 'bio', label: 'Bio' },
    { id: 'lowSugar', label: 'Zuckerarm (≤3g)' },
  ];

  const filteredProducts = products.filter((p: Product) => {
    const matchesQuery = 
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.brand.toLowerCase().includes(query.toLowerCase()) ||
      p.barcode.includes(query) ||
      p.category.toLowerCase().includes(query.toLowerCase()) ||
      p.ingredients.toLowerCase().includes(query.toLowerCase());

    if (!matchesQuery) return false;

    if (selectedFilter === 'nutriA') return p.nutriScore === 'A';
    if (selectedFilter === 'highProtein') return p.nutritionPer100g.protein >= 10;
    if (selectedFilter === 'vegan') return p.labels.includes('Vegan');
    if (selectedFilter === 'bio') return p.labels.includes('Bio');
    if (selectedFilter === 'lowSugar') return p.nutritionPer100g.sugars <= 3;

    return true;
  });

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto px-4 pt-2">
      {/* Header & Search Bar */}
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">
          Produktdatenbank durchsuchen
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Finde verifizierte Lebensmittel, Nährwerte und Inhaltsstoffe.
        </p>
      </div>

      {/* Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Name, Marke, EAN-Barcode (z. B. Haferdrink, Oatly, Barilla)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white border border-zinc-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 shadow-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-xs text-zinc-400 hover:text-zinc-600 absolute right-3.5 top-1/2 -translate-y-1/2"
          >
            Leeren
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filterChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setSelectedFilter(chip.id)}
            className={`whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
              selectedFilter === chip.id
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Product Results */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
          <span>{filteredProducts.length} Produkte gefunden</span>
          <span className="text-[11px] font-medium text-emerald-600">Verifiziert von Goodies</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-8 bg-white rounded-3xl border border-zinc-200 text-center space-y-2">
            <p className="text-xs text-zinc-500">Keine Produkte für „{query}“ gefunden.</p>
            <p className="text-[11px] text-zinc-400">
              Tipp: Nutze den Scanner um neue Barcodes direkt einzureichen.
            </p>
          </div>
        ) : (
          filteredProducts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => openProductDetail(p)}
              className="w-full bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center justify-between text-left hover:border-emerald-300 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-14 h-14 rounded-xl object-cover bg-zinc-100 shrink-0"
                />
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                    {p.brand} • {p.quantity}
                  </span>
                  <h3 className="text-xs font-bold text-zinc-900 truncate group-hover:text-emerald-600 transition-colors">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                      Nutri {p.nutriScore}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {p.nutritionPer100g.calories} kcal
                    </span>
                    <span className="text-[10px] text-zinc-400">•</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      {p.nutritionPer100g.protein}g Protein
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                    {p.goodiesScore}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-500 transition-colors" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
