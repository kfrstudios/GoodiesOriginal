import { useState } from 'react';
import { 
  X, 
  Scale, 
  Trophy, 
  ArrowRight, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  Heart, 
  ListPlus, 
  Search,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Product, NutriScore, NovaScore } from '../types';
import { useApp } from '../context/AppContext';
import { DynamicScoreGauge } from './DynamicScoreGauge';

interface ProductComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  productA: Product;
  productB?: Product | null;
}

export function ProductComparisonModal({
  isOpen,
  onClose,
  productA,
  productB: initialProductB
}: ProductComparisonModalProps) {
  const { products, toggleFavorite, isFavorite, addShoppingItem, shoppingLists, openProductDetail, showToast } = useApp();

  // Find good alternatives in same category or fallback to second product
  const categoryAlternatives = products.filter(
    p => p.id !== productA.id && p.category === productA.category
  );

  const [selectedB, setSelectedB] = useState<Product>(
    initialProductB || categoryAlternatives[0] || products.find(p => p.id !== productA.id) || productA
  );

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');

  if (!isOpen) return null;

  const a = productA;
  const b = selectedB;

  // Compute metrics comparison
  const aNut = a.nutritionPer100g || { calories: a.calories || 0, sugars: a.sugar || 0, protein: a.protein || 0, fat: a.fat || 0, saturatedFat: a.saturatedFat || 0, salt: a.salt || 0, fiber: a.fiber || 0 };
  const bNut = b.nutritionPer100g || { calories: b.calories || 0, sugars: b.sugar || 0, protein: b.protein || 0, fat: b.fat || 0, saturatedFat: b.saturatedFat || 0, salt: b.salt || 0, fiber: b.fiber || 0 };

  // Category wins tally
  let aWins = 0;
  let bWins = 0;

  if (a.goodiesScore > b.goodiesScore) aWins++; else if (b.goodiesScore > a.goodiesScore) bWins++;
  if (aNut.sugars < bNut.sugars) aWins++; else if (bNut.sugars < aNut.sugars) bWins++;
  if (aNut.protein > bNut.protein) aWins++; else if (bNut.protein > aNut.protein) bWins++;
  if (aNut.saturatedFat < bNut.saturatedFat) aWins++; else if (bNut.saturatedFat < aNut.saturatedFat) bWins++;
  if (aNut.salt < bNut.salt) aWins++; else if (bNut.salt < aNut.salt) bWins++;
  if (a.novaScore < b.novaScore) aWins++; else if (b.novaScore < a.novaScore) bWins++;
  if (a.additives.length < b.additives.length) aWins++; else if (b.additives.length < a.additives.length) bWins++;

  const winner = aWins > bWins ? a : bWins > aWins ? b : null;
  const winnerWins = Math.max(aWins, bWins);

  // Sugar percentage reduction
  const higherSugar = Math.max(aNut.sugars, bNut.sugars);
  const lowerSugar = Math.min(aNut.sugars, bNut.sugars);
  const sugarDiffPercent = higherSugar > 0 ? Math.round(((higherSugar - lowerSugar) / higherSugar) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-zinc-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top bar */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                Direkter Produktvergleich
              </h3>
              <p className="text-[11px] text-zinc-500">
                1:1 Gegenüberstellung von Nährwerten, Score & Zusätzen
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Winner Banner */}
          {winner ? (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300">
                  <Trophy className="w-5 h-5 fill-amber-300" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-100 block">
                    Gesamtsieger ({winnerWins} von 7 Kategorien)
                  </span>
                  <h4 className="text-sm font-black leading-tight">
                    {winner.name} ({winner.brand})
                  </h4>
                  <p className="text-[11px] text-emerald-100 mt-0.5">
                    {winner === a && sugarDiffPercent > 0 && `Liefert ${sugarDiffPercent}% weniger Zucker und bessere Nährstoffdichte.`}
                    {winner === b && sugarDiffPercent > 0 && `Überzeugt mit ${sugarDiffPercent}% weniger Zucker und saubererem Profil.`}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-2xl font-black">{winner.goodiesScore}</span>
                <span className="text-[10px] text-emerald-200 block font-bold">Score</span>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-100 rounded-2xl p-3.5 text-center text-xs font-bold text-zinc-700">
              Gleichstand: Beide Produkte schneiden in wesentlichen Kriterien ähnlich gut ab.
            </div>
          )}

          {/* Side by Side Product Headers */}
          <div className="grid grid-cols-2 gap-3">
            {/* Product A */}
            <div className="bg-zinc-50 rounded-2xl p-3.5 border border-zinc-200/80 flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-2.5">
                <img
                  src={a.imageUrl}
                  alt={a.name}
                  className="w-12 h-12 rounded-xl object-cover bg-white shrink-0 border border-zinc-100"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                    {a.brand}
                  </span>
                  <h5 className="text-xs font-bold text-zinc-900 truncate">{a.name}</h5>
                  <span className="text-[10px] text-zinc-500 font-mono">{a.quantity}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60">
                <span className="text-[10px] font-bold text-zinc-400">Score:</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                  a.goodiesScore >= 80 ? 'bg-emerald-100 text-emerald-800' : a.goodiesScore >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {a.goodiesScore} / 100
                </span>
              </div>
            </div>

            {/* Product B with switch option */}
            <div className="bg-zinc-50 rounded-2xl p-3.5 border border-zinc-200/80 flex flex-col justify-between space-y-2 relative">
              <div className="flex items-center gap-2.5">
                <img
                  src={b.imageUrl}
                  alt={b.name}
                  className="w-12 h-12 rounded-xl object-cover bg-white shrink-0 border border-zinc-100"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                      {b.brand}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectorOpen(!selectorOpen)}
                      className="text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded-md border border-emerald-200"
                    >
                      Ändern
                    </button>
                  </div>
                  <h5 className="text-xs font-bold text-zinc-900 truncate">{b.name}</h5>
                  <span className="text-[10px] text-zinc-500 font-mono">{b.quantity}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60">
                <span className="text-[10px] font-bold text-zinc-400">Score:</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                  b.goodiesScore >= 80 ? 'bg-emerald-100 text-emerald-800' : b.goodiesScore >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {b.goodiesScore} / 100
                </span>
              </div>

              {/* Dropdown to pick different product B */}
              {selectorOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white rounded-2xl p-3 border border-zinc-200 shadow-xl space-y-2 max-h-60 overflow-y-auto">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 rounded-xl">
                    <Search className="w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Anderes Produkt suchen..."
                      value={filterSearch}
                      onChange={e => setFilterSearch(e.target.value)}
                      className="bg-transparent text-xs w-full focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    {products
                      .filter(p => p.id !== a.id && (!filterSearch || p.name.toLowerCase().includes(filterSearch.toLowerCase())))
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedB(p);
                            setSelectorOpen(false);
                            setFilterSearch('');
                          }}
                          className="w-full text-left p-2 hover:bg-zinc-50 rounded-xl flex items-center justify-between text-xs"
                        >
                          <span className="font-bold text-zinc-800 truncate">{p.name}</span>
                          <span className="font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                            {p.goodiesScore}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metric Comparison Table */}
          <div className="border border-zinc-200/80 rounded-2xl overflow-hidden text-xs">
            <div className="bg-zinc-100/80 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 grid grid-cols-3">
              <span>Kriterium</span>
              <span className="text-center font-bold text-zinc-900 truncate">{a.name}</span>
              <span className="text-center font-bold text-zinc-900 truncate">{b.name}</span>
            </div>

            <div className="divide-y divide-zinc-100 bg-white">
              {/* Row 1: Goodies Score */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                <span className="font-bold text-zinc-700">Goodies Score</span>
                <span className={`text-center font-black ${a.goodiesScore >= b.goodiesScore ? 'text-emerald-600 font-extrabold' : 'text-zinc-500'}`}>
                  {a.goodiesScore} {a.goodiesScore > b.goodiesScore && '🏆'}
                </span>
                <span className={`text-center font-black ${b.goodiesScore >= a.goodiesScore ? 'text-emerald-600 font-extrabold' : 'text-zinc-500'}`}>
                  {b.goodiesScore} {b.goodiesScore > a.goodiesScore && '🏆'}
                </span>
              </div>

              {/* Row 2: Nutri-Score */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                <span className="font-bold text-zinc-700">Nutri-Score</span>
                <span className="text-center font-black text-zinc-800">
                  {a.nutriScore}
                </span>
                <span className="text-center font-black text-zinc-800">
                  {b.nutriScore}
                </span>
              </div>

              {/* Row 3: NOVA Verarbeitungsstufe */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                <span className="font-bold text-zinc-700">NOVA Stufe</span>
                <span className={`text-center font-bold ${a.novaScore <= b.novaScore ? 'text-emerald-700' : 'text-zinc-600'}`}>
                  Stufe {a.novaScore} {a.novaScore < b.novaScore && '✓'}
                </span>
                <span className={`text-center font-bold ${b.novaScore <= a.novaScore ? 'text-emerald-700' : 'text-zinc-600'}`}>
                  Stufe {b.novaScore} {b.novaScore < a.novaScore && '✓'}
                </span>
              </div>

              {/* Row 4: Kalorien */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                <span className="font-bold text-zinc-700">Kalorien (100g)</span>
                <span className="text-center text-zinc-800 font-medium">
                  {aNut.calories} kcal
                </span>
                <span className="text-center text-zinc-800 font-medium">
                  {bNut.calories} kcal
                </span>
              </div>

              {/* Row 5: Zucker */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                <span className="font-bold text-zinc-700">Zucker (100g)</span>
                <span className={`text-center font-bold ${aNut.sugars < bNut.sugars ? 'text-emerald-600' : aNut.sugars > 10 ? 'text-rose-600' : 'text-zinc-800'}`}>
                  {aNut.sugars}g {aNut.sugars < bNut.sugars && '✓'}
                </span>
                <span className={`text-center font-bold ${bNut.sugars < aNut.sugars ? 'text-emerald-600' : bNut.sugars > 10 ? 'text-rose-600' : 'text-zinc-800'}`}>
                  {bNut.sugars}g {bNut.sugars < aNut.sugars && '✓'}
                </span>
              </div>

              {/* Row 6: Protein */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                <span className="font-bold text-zinc-700">Protein (100g)</span>
                <span className={`text-center font-bold ${aNut.protein > bNut.protein ? 'text-emerald-600' : 'text-zinc-800'}`}>
                  {aNut.protein}g {aNut.protein > bNut.protein && '✓'}
                </span>
                <span className={`text-center font-bold ${bNut.protein > aNut.protein ? 'text-emerald-600' : 'text-zinc-800'}`}>
                  {bNut.protein}g {bNut.protein > aNut.protein && '✓'}
                </span>
              </div>

              {/* Row 7: Gesättigte Fette */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                <span className="font-bold text-zinc-700">Gesättigte Fette</span>
                <span className={`text-center font-medium ${aNut.saturatedFat < bNut.saturatedFat ? 'text-emerald-600 font-bold' : 'text-zinc-800'}`}>
                  {aNut.saturatedFat}g {aNut.saturatedFat < bNut.saturatedFat && '✓'}
                </span>
                <span className={`text-center font-medium ${bNut.saturatedFat < aNut.saturatedFat ? 'text-emerald-600 font-bold' : 'text-zinc-800'}`}>
                  {bNut.saturatedFat}g {bNut.saturatedFat < aNut.saturatedFat && '✓'}
                </span>
              </div>

              {/* Row 8: Zusatzstoffe */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                <span className="font-bold text-zinc-700">Zusatzstoffe</span>
                <span className={`text-center font-medium ${a.additives.length === 0 ? 'text-emerald-600 font-bold' : 'text-zinc-800'}`}>
                  {a.additives.length === 0 ? '0 Zusätze ✓' : `${a.additives.length} E-Nummern`}
                </span>
                <span className={`text-center font-medium ${b.additives.length === 0 ? 'text-emerald-600 font-bold' : 'text-zinc-800'}`}>
                  {b.additives.length === 0 ? '0 Zusätze ✓' : `${b.additives.length} E-Nummern`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions for Winner */}
          {winner && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  toggleFavorite(winner.id);
                  showToast(`„${winner.name}“ zu Favoriten hinzugefügt`);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Sieger merken</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetList = shoppingLists[0];
                  if (targetList) {
                    addShoppingItem(targetList.id, winner.name, '1x', winner.id);
                  }
                  showToast(`„${winner.name}“ auf Einkaufsliste gesetzt`);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <ListPlus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auf Einkaufsliste</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  openProductDetail(winner);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <span>Produktdetail</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
