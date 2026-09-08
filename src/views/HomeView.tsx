import { useMemo } from 'react';
import { 
  ScanLine, 
  Flame, 
  Droplets, 
  Sparkles, 
  ChevronRight, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight,
  Clock,
  Sun,
  Moon
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { ProBadge } from '../components/pro/ProDesignSystem';
import { sortScanHistoryNewestFirst } from '../services/firebase';

export function HomeView() {
  const { 
    user, 
    effectiveTier,
    canPerformScan,
    openAboModal,
    todayMeals, 
    waterIntakeMl, 
    scanHistory, 
    products, 
    openProductDetail, 
    setActiveView,
    isDarkMode,
    toggleTheme
  } = useApp();

  const { totalCalories, totalProtein, remainingCalories, calPercent, waterPercent, proteinPercent } = useMemo(() => {
    const calories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
    const protein = todayMeals.reduce((sum, m) => sum + m.protein, 0);
    return {
      totalCalories: calories,
      totalProtein: protein,
      remainingCalories: Math.max(0, user.dailyGoals.calories - calories),
      calPercent: Math.min(100, Math.round((calories / user.dailyGoals.calories) * 100)),
      waterPercent: Math.min(100, Math.round((waterIntakeMl / user.dailyGoals.water) * 100)),
      proteinPercent: Math.min(100, Math.round((protein / user.dailyGoals.protein) * 100))
    };
  }, [todayMeals, user.dailyGoals, waterIntakeMl]);

  const isPro = effectiveTier === 'PRO';
  const scanStatus = canPerformScan();

  // Top recommendations from products with score >= 88
  const topPicks = useMemo(() => {
    return products.filter(p => p.goodiesScore >= 88).slice(0, 4);
  }, [products]);

  // Derive the 2 newest scans dynamically from synchronized scanHistory
  const recentScans = useMemo(() => {
    return sortScanHistoryNewestFirst(scanHistory).slice(0, 2);
  }, [scanHistory]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-24 max-w-2xl mx-auto px-4 pt-2"
    >
      {/* Top Greeting & Status Badge */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Dein Tag mit Goodies
            </span>

            {/* Clickable Abo Status Badge */}
            {isPro ? (
              <ProBadge
                size="sm"
                label="PRO"
                variant="gold"
                onClick={openAboModal}
              />
            ) : (
              <button
                type="button"
                onClick={openAboModal}
                title="Dein Goodies Abo ansehen"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 text-[11px] font-bold transition-all hover:scale-105 cursor-pointer"
              >
                <span>FREE</span>
                <span className="text-[10px] text-zinc-400 font-normal">
                  ({scanStatus.remaining} / 5 Scans frei)
                </span>
              </button>
            )}
          </div>

          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight mt-1 flex items-center gap-2">
            <span>Hallo {user.displayName || user.name || 'Du'}</span>
            <span className="text-xl">👋</span>
          </h1>
          <p className="text-xs text-zinc-500">
            Ernährungsprofil: <span className="font-semibold text-zinc-700">{user.diet}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={toggleTheme}
            title={isDarkMode ? 'Zu Hellmodus wechseln' : 'Zu Dunkelmodus wechseln'}
            aria-label={isDarkMode ? 'Zu Hellmodus wechseln' : 'Zu Dunkelmodus wechseln'}
            className="w-10 h-10 rounded-2xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center justify-center transition-all cursor-pointer"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-600" />
            )}
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView('profile')}
            className="w-11 h-11 rounded-2xl bg-emerald-100/70 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-sm shadow-sm hover:scale-105 transition-transform"
          >
            {(user.displayName || user.name || 'G').charAt(0).toUpperCase()}
          </motion.button>
        </div>
      </div>

      {/* Hero Scanner Banner */}
      <motion.div 
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-xl shadow-emerald-600/15"
      >
        <div className="relative z-10 max-w-[280px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-md text-emerald-50">
            <Sparkles className="w-3 h-3 text-amber-300" />
            Sofortige Analyse
          </span>
          <h2 className="text-xl font-bold mt-2 leading-tight">
            Lebensmittel scannen & verstehen
          </h2>
          <p className="text-xs text-emerald-100/90 mt-1.5 leading-relaxed">
            Barcode anvisieren: Goodies Score, Zusatzstoffe & gesündere Alternativen direkt sehen.
          </p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView('scanner')}
            className="mt-4 inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs py-3 px-5 rounded-2xl shadow-md transition-all"
          >
            <ScanLine className="w-4 h-4 text-emerald-600" />
            <span>Jetzt Barcode scannen</span>
          </motion.button>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-6 -bottom-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-4 bottom-4 opacity-15">
          <ScanLine className="w-32 h-32 text-white" />
        </div>
      </motion.div>

      {/* Daily Progress Dashboard Card */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900">Tagesenergie & Ziele</h3>
              <p className="text-[11px] text-zinc-500">
                <AnimatedCounter value={totalCalories} /> von {user.dailyGoals.calories} kcal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('tracker')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
          >
            <span>Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Grid */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Kalorien</span>
              <span className="font-bold text-zinc-700">{calPercent}%</span>
            </div>
            <div className="my-2">
              <span className="text-base font-extrabold text-zinc-900">
                <AnimatedCounter value={remainingCalories} />
              </span>
              <span className="text-[10px] text-zinc-400 ml-1">übrig</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${calPercent}%` }}
                transition={{ duration: 0.6 }}
                className="h-full bg-amber-500 rounded-full" 
              />
            </div>
          </div>

          <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Protein</span>
              <span className="font-bold text-zinc-700">{proteinPercent}%</span>
            </div>
            <div className="my-2">
              <span className="text-base font-extrabold text-zinc-900">
                <AnimatedCounter value={Math.round(totalProtein)} />g
              </span>
              <span className="text-[10px] text-zinc-400 ml-1">/ {user.dailyGoals.protein}g</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${proteinPercent}%` }}
                transition={{ duration: 0.6 }}
                className="h-full bg-emerald-500 rounded-full" 
              />
            </div>
          </div>

          <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Droplets className="w-3 h-3 text-cyan-500" /> Wasser
              </span>
              <span className="font-bold text-zinc-700">{waterPercent}%</span>
            </div>
            <div className="my-2">
              <span className="text-base font-extrabold text-zinc-900">{(waterIntakeMl / 1000).toFixed(1)}L</span>
              <span className="text-[10px] text-zinc-400 ml-1">/ {(user.dailyGoals.water / 1000).toFixed(1)}L</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${waterPercent}%` }}
                transition={{ duration: 0.6 }}
                className="h-full bg-cyan-500 rounded-full" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-zinc-500" />
            <h3 className="font-bold text-sm text-zinc-900">Zuletzt gescannt</h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('history')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Alle anzeigen ({scanHistory.length})
          </button>
        </div>

        {recentScans.length === 0 ? (
          <div className="p-6 bg-white rounded-3xl border border-zinc-200 text-center space-y-2">
            <p className="text-xs text-zinc-500">Noch keine Produkte gescannt.</p>
            <button
              type="button"
              onClick={() => setActiveView('scanner')}
              className="text-xs font-bold text-emerald-600"
            >
              Jetzt ersten Barcode scannen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {recentScans.map((item) => {
              const fullProduct = products.find(p => p.id === item.productId || p.barcode === item.barcode);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (fullProduct) {
                      openProductDetail(fullProduct);
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
                  className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center justify-between text-left hover:border-emerald-300 transition-colors group"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      {item.brand}
                    </span>
                    <h4 className="text-xs font-bold text-zinc-900 truncate group-hover:text-emerald-600 transition-colors">
                      {item.productName}
                    </h4>
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">
                      {item.scannedAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                        <AnimatedCounter value={item.goodiesScore} />/100
                      </span>
                      <span className="text-[9px] font-bold text-zinc-500 mt-0.5">
                        Nutri {item.nutriScore}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Recommended Goodies Picks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-zinc-900">Goodies Empfehlungen</h3>
          </div>
          <span className="text-xs font-medium text-zinc-400">Score 88+</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {topPicks.map((pick) => (
            <button
              key={pick.id}
              type="button"
              onClick={() => openProductDetail(pick)}
              className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-sm text-left hover:border-emerald-300 transition-all flex flex-col justify-between group"
            >
              <div className="relative w-full h-28 bg-zinc-100 rounded-xl overflow-hidden mb-2.5">
                <img loading="lazy"
                  src={pick.imageUrl}
                  alt={pick.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  
                />
                <div className="absolute top-2 right-2 bg-emerald-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                  <AnimatedCounter value={pick.goodiesScore} />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block truncate">
                  {pick.brand}
                </span>
                <h4 className="text-xs font-bold text-zinc-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                  {pick.name}
                </h4>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Nutri {pick.nutriScore}
                  </span>
                  <span className="text-[10px] text-zinc-500 truncate">
                    {pick.nutritionPer100g.calories} kcal
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Nutrition Tip of the Day */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-5 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-xs text-emerald-950 uppercase tracking-wide">
            Goodies Ernährungstipp
          </h4>
          <p className="text-xs text-emerald-900/80 mt-1 leading-relaxed">
            Auf die Zutatenliste achten: Zutaten sind nach Gewichtsanteil absteigend sortiert. Steht Zucker oder Glukosesirup unter den ersten drei Zutaten, ist das Produkt meist stark gesüßt.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
