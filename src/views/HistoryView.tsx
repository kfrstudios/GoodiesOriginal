import { useState, useMemo } from 'react';
import { 
  History, 
  Trash2, 
  ArrowRight, 
  ScanLine, 
  Search, 
  Clock, 
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { ProNoticeBanner, ProBadge } from '../components/pro/ProDesignSystem';
import { sortScanHistoryNewestFirst } from '../services/firebase';

export function HistoryView() {
  const { 
    scanHistory, 
    clearScanHistory, 
    products, 
    openProductDetail, 
    setActiveView,
    effectiveTier,
    openPaywall 
  } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScore, setFilterScore] = useState<'all' | 'high' | 'low'>('all');

  const sortedHistory = useMemo(() => {
    return sortScanHistoryNewestFirst(scanHistory);
  }, [scanHistory]);

  const filteredHistory = sortedHistory.filter((item) => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filterScore === 'high') return item.goodiesScore >= 75;
    if (filterScore === 'low') return item.goodiesScore < 60;

    return true;
  });

  return (
    <div className="space-y-4 pb-28 max-w-2xl mx-auto px-4 pt-2">
      {/* Title & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Scan-Historie
            </span>
            {effectiveTier === 'FREE' ? (
              <span className="text-[11px] font-medium text-zinc-400">
                ({scanHistory.length} / 20 im Free Plan)
              </span>
            ) : (
              <ProBadge size="xs" label="PRO Lückenlos" />
            )}
          </div>
          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight mt-1">
            Gespeicherter Verlauf
          </h1>
        </div>

        {scanHistory.length > 0 && (
          <button
            type="button"
            onClick={clearScanHistory}
            className="text-xs font-semibold text-zinc-400 hover:text-rose-600 flex items-center gap-1 transition-colors px-2 py-1"
            title="Verlauf leeren"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Leeren</span>
          </button>
        )}
      </div>

      {/* FREE Limit Notice Banner mit zentralem goldenem Pro-Design */}
      {effectiveTier === 'FREE' && (
        <ProNoticeBanner
          context="history"
          title="Scan-Verlauf Limit (20 Produkte)"
          description={`Dein kostenloser Verlauf speichert die letzten 20 Produkte (${scanHistory.length}/20). Mit PRO behältst du unbegrenzt all deine Scans dauerhaft im Blick.`}
          buttonLabel="PRO"
        />
      )}

      {/* Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Im Verlauf suchen (Name, Marke, Barcode)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterScore('all')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
              filterScore === 'all'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-zinc-600 border-zinc-200'
            }`}
          >
            Alle ({scanHistory.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterScore('high')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
              filterScore === 'high'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-zinc-600 border-zinc-200'
            }`}
          >
            Score 75+ (Gute Wahl)
          </button>
          <button
            type="button"
            onClick={() => setFilterScore('low')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
              filterScore === 'low'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-zinc-600 border-zinc-200'
            }`}
          >
            Kritisch (Score &lt;60)
          </button>
        </div>
      </div>

      {/* List of Scanned Items */}
      <div className="space-y-2.5">
        {scanHistory.length === 0 ? (
          <div className="p-8 bg-white rounded-3xl border border-zinc-200/80 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-800">Noch keine Barcodes gescannt</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                Alle Produkte, die du mit der Kamera oder manuell analysierst, erscheinen hier automatisch im Verlauf.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('scanner')}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all"
            >
              <ScanLine className="w-4 h-4" />
              <span>Jetzt ersten Barcode scannen</span>
            </button>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-6 bg-white rounded-3xl border border-zinc-200 text-center text-xs text-zinc-500">
            Keine Einträge für diese Filterkriterien gefunden.
          </div>
        ) : (
          filteredHistory.map((item) => {
            const product = products.find(p => p.id === item.productId || p.barcode === item.barcode);
            const scoreColor = 
              item.goodiesScore >= 75 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
              item.goodiesScore >= 55 ? 'text-amber-700 bg-amber-50 border-amber-200' :
              'text-rose-700 bg-rose-50 border-rose-200';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (product) {
                    openProductDetail(product);
                  } else {
                    openProductDetail({
                      id: item.productId || `prod_${item.barcode}`,
                      barcode: item.barcode,
                      name: item.productName,
                      brand: item.brand,
                      goodiesScore: item.goodiesScore,
                      nutriScore: item.nutriScore,
                      novaGroup: 3,
                      ecoScore: 'B',
                      calories: 0,
                      fat: 0,
                      saturatedFat: 0,
                      carbs: 0,
                      sugar: 0,
                      protein: 0,
                      fiber: 0,
                      salt: 0,
                      ingredientsText: '',
                      additives: [],
                      allergens: [],
                      dietaryFlags: { isVegan: false, isVegetarian: false, isGlutenFree: false, isLactoseFree: false, isHalal: true, isKosher: true, isOrganic: false },
                      positivePoints: [],
                      negativePoints: [],
                      category: 'Lebensmittel'
                    } as any);
                  }
                }}
                className="w-full bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center justify-between text-left hover:border-emerald-300 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {product ? (
                    <img
                      src={product.imageUrl}
                      alt={item.productName}
                      className="w-12 h-12 rounded-xl object-cover bg-zinc-100 shrink-0 border border-zinc-100"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
                      <ScanLine className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                      {item.brand}
                    </span>
                    <h3 className="text-xs font-bold text-zinc-900 truncate group-hover:text-emerald-600 transition-colors">
                      {item.productName}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        {item.scannedAt}
                      </span>
                      <span>•</span>
                      <span className="font-mono">EAN {item.barcode}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-lg border ${scoreColor}`}>
                      <AnimatedCounter value={item.goodiesScore} />/100
                    </span>
                    {item.goodiesMatch !== undefined ? (
                      <span className="text-[9px] font-bold text-emerald-600 mt-0.5 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        <AnimatedCounter value={item.goodiesMatch} />% Match
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-zinc-500 mt-0.5">
                        Nutri {item.nutriScore}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-500 transition-colors" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
