import { useState, useEffect, FormEvent, useMemo } from 'react';
import { 
  Flame, 
  Droplets, 
  Plus, 
  Trash2, 
  Calendar, 
  BarChart2, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  Apple,
  Search,
  X,
  ScanLine,
  Check,
  AlertTriangle,
  Crown,
  Lock,
  Utensils,
  BookOpen,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MealType, Product, CustomFoodItem } from '../types';
import { ProBadge, ProNoticeBanner, LockedProFeature } from '../components/pro/ProDesignSystem';
import { WaterCelebration } from '../components/WaterCelebration';
import { WeeklyTrackerCard } from '../components/WeeklyTrackerCard';

export function TrackerView() {
  const { 
    user, 
    todayMeals, 
    logMeal,
    logCustomMeal,
    removeMealLog, 
    customFoods,
    addCustomFood,
    deleteCustomFood,
    waterIntakeMl, 
    addWater, 
    resetWater, 
    products,
    scanHistory,
    hasFeature,
    openPaywall,
    effectiveTier,
    setActiveView,
    showToast,
    weeklyTrackers
  } = useApp();

  const [showWaterCelebration, setShowWaterCelebration] = useState(false);

  // Daily water goal celebration check (runs once per day when target is reached)
  useEffect(() => {
    if (user?.dailyGoals?.water && waterIntakeMl >= user.dailyGoals.water) {
      const todayStr = new Date().toISOString().split('T')[0];
      const key = `goodies_water_celebrated_${todayStr}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, 'true');
        setShowWaterCelebration(true);
        const timer = setTimeout(() => {
          setShowWaterCelebration(false);
        }, 3200);
        return () => clearTimeout(timer);
      }
    }
  }, [waterIntakeMl, user?.dailyGoals?.water]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');

  // Inline Add Modal state
  const [activeMealTypeForAdd, setActiveMealTypeForAdd] = useState<MealType | null>(null);
  const [inlineSearchQuery, setInlineSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'database' | 'custom'>('all');

  // Selected item to log
  const [selectedProductForAdd, setSelectedProductForAdd] = useState<Product | null>(null);
  const [selectedCustomFoodForAdd, setSelectedCustomFoodForAdd] = useState<CustomFoodItem | null>(null);
  const [inlinePortion, setInlinePortion] = useState<number>(100);

  // Custom meal form mode
  const [isCustomFormOpen, setIsCustomFormOpen] = useState(false);
  const [customFormName, setCustomFormName] = useState('');
  const [customFormAmount, setCustomFormAmount] = useState('1 Portion');
  const [customFormCalories, setCustomFormCalories] = useState<string>('');
  const [customFormProtein, setCustomFormProtein] = useState<string>('');
  const [customFormCarbs, setCustomFormCarbs] = useState<string>('');
  const [customFormFat, setCustomFormFat] = useState<string>('');
  const [customFormNotes, setCustomFormNotes] = useState<string>('');

  const { totalCalories, totalProtein, totalCarbs, totalFat, totalSugar, totalSalt, remainingCalories, calPercent } = useMemo(() => {
    let calories = 0, protein = 0, carbs = 0, fat = 0, sugar = 0, salt = 0;
    
    // Create a lookup map for faster product resolution
    const productsMap = new Map(products.map(p => [p.id, p]));
    const productsNameMap = new Map(products.map(p => [p.name, p]));

    for (const m of todayMeals) {
      calories += m.calories;
      protein += m.protein;
      carbs += m.carbs;
      fat += m.fat;

      const prod = productsMap.get(m.productId) || productsNameMap.get(m.productName);
      if (prod) {
        sugar += (prod.nutritionPer100g.sugars * m.portionGrams) / 100;
        salt += (prod.nutritionPer100g.salt * m.portionGrams) / 100;
      }
    }

    return {
      totalCalories: calories,
      totalProtein: protein,
      totalCarbs: carbs,
      totalFat: fat,
      totalSugar: sugar,
      totalSalt: salt,
      remainingCalories: user.dailyGoals.calories - calories,
      calPercent: Math.min(100, Math.round((calories / user.dailyGoals.calories) * 100))
    };
  }, [todayMeals, products, user.dailyGoals.calories]);

  const mealCategories: { type: MealType; label: string; icon: string }[] = [
    { type: 'breakfast', label: 'Frühstück', icon: '☕' },
    { type: 'lunch', label: 'Mittagessen', icon: '🥗' },
    { type: 'dinner', label: 'Abendessen', icon: '🍲' },
    { type: 'snack', label: 'Snacks & Riegel', icon: '🍎' },
  ];

  // German action label according to user specification
  const getAddButtonLabel = (type: MealType | null) => {
    switch (type) {
      case 'breakfast': return 'Zu Frühstück hinzufügen';
      case 'lunch': return 'Zu Mittagessen hinzufügen';
      case 'dinner': return 'Zu Abendessen hinzufügen';
      case 'snack': return 'Zu Snacks hinzufügen';
      default: return 'Zur Mahlzeit hinzufügen';
    }
  };

  // Autocomplete / Search filters
  const cleanQuery = inlineSearchQuery.trim().toLowerCase();

  const matchingProducts: Product[] = useMemo(() => {
    return cleanQuery
      ? products.filter(p => 
          p.name.toLowerCase().includes(cleanQuery) ||
          p.brand.toLowerCase().includes(cleanQuery) ||
          p.category.toLowerCase().includes(cleanQuery)
        )
      : products.slice(0, 15);
  }, [cleanQuery, products]);

  const matchingCustomFoods: CustomFoodItem[] = useMemo(() => {
    return cleanQuery
      ? customFoods.filter(cf =>
          cf.name.toLowerCase().includes(cleanQuery) ||
          (cf.notes && cf.notes.toLowerCase().includes(cleanQuery))
        )
      : customFoods;
  }, [cleanQuery, customFoods]);

  const handleOpenInlineAdd = (type: MealType) => {
    if (!hasFeature('meal_logging')) {
      openPaywall('meal_log');
      return;
    }
    setActiveMealTypeForAdd(type);
    setInlineSearchQuery('');
    setFilterSource('all');
    setSelectedProductForAdd(null);
    setSelectedCustomFoodForAdd(null);
    setIsCustomFormOpen(false);
    setCustomFormName('');
    setCustomFormAmount('1 Portion');
    setCustomFormCalories('');
    setCustomFormProtein('');
    setCustomFormCarbs('');
    setCustomFormFat('');
    setCustomFormNotes('');
    setInlinePortion(100);
  };

  const handleOpenCustomForm = (prefillName = '') => {
    setIsCustomFormOpen(true);
    setCustomFormName(prefillName || inlineSearchQuery.trim());
    setSelectedProductForAdd(null);
    setSelectedCustomFoodForAdd(null);
  };

  // Add selected database product
  const handleConfirmProductAdd = () => {
    if (!selectedProductForAdd || !activeMealTypeForAdd) return;

    logMeal(selectedProductForAdd, inlinePortion, activeMealTypeForAdd);
    const catName = mealCategories.find(c => c.type === activeMealTypeForAdd)?.label || 'Mahlzeit';
    showToast(`${selectedProductForAdd.name} (${inlinePortion}g) zu ${catName} hinzugefügt`);
    setActiveMealTypeForAdd(null);
    setSelectedProductForAdd(null);
  };

  // Add selected personal custom food
  const handleConfirmCustomFoodAdd = () => {
    if (!selectedCustomFoodForAdd || !activeMealTypeForAdd) return;

    logCustomMeal({
      name: selectedCustomFoodForAdd.name,
      amountLabel: selectedCustomFoodForAdd.amount || '1 Portion',
      portionGrams: 100,
      calories: selectedCustomFoodForAdd.calories || 0,
      protein: selectedCustomFoodForAdd.protein || 0,
      carbs: selectedCustomFoodForAdd.carbs || 0,
      fat: selectedCustomFoodForAdd.fat || 0,
      mealType: activeMealTypeForAdd
    });

    const catName = mealCategories.find(c => c.type === activeMealTypeForAdd)?.label || 'Mahlzeit';
    showToast(`„${selectedCustomFoodForAdd.name}“ zu ${catName} hinzugefügt`);
    setActiveMealTypeForAdd(null);
    setSelectedCustomFoodForAdd(null);
  };

  // Save new custom food and directly log it
  const handleSaveAndAddCustomFood = (e: FormEvent) => {
    e.preventDefault();
    if (!customFormName.trim() || !activeMealTypeForAdd) return;

    const cal = customFormCalories ? Number(customFormCalories) : 0;
    const prot = customFormProtein ? Number(customFormProtein) : 0;
    const carbs = customFormCarbs ? Number(customFormCarbs) : 0;
    const fat = customFormFat ? Number(customFormFat) : 0;

    // 1. Save exclusively to personal user account
    const savedFood = addCustomFood({
      name: customFormName.trim(),
      amount: customFormAmount.trim() || '1 Portion',
      calories: cal,
      protein: prot,
      carbs,
      fat,
      notes: customFormNotes.trim() || undefined
    });

    // 2. Directly log to today's meal
    logCustomMeal({
      name: savedFood.name,
      amountLabel: savedFood.amount,
      portionGrams: 100,
      calories: savedFood.calories,
      protein: savedFood.protein,
      carbs: savedFood.carbs,
      fat: savedFood.fat,
      mealType: activeMealTypeForAdd
    });

    const catName = mealCategories.find(c => c.type === activeMealTypeForAdd)?.label || 'Mahlzeit';
    showToast(`„${savedFood.name}“ in deinem Account gespeichert & zu ${catName} hinzugefügt!`);
    setActiveMealTypeForAdd(null);
    setIsCustomFormOpen(false);
  };

  // 7-day data for weekly analytics
  const weeklyData = [
    { day: 'Mo', calories: 2050, target: user.dailyGoals.calories },
    { day: 'Di', calories: 2180, target: user.dailyGoals.calories },
    { day: 'Mi', calories: 1980, target: user.dailyGoals.calories },
    { day: 'Do', calories: 2210, target: user.dailyGoals.calories },
    { day: 'Fr', calories: 2090, target: user.dailyGoals.calories },
    { day: 'Sa', calories: 2300, target: user.dailyGoals.calories },
    { day: 'Heute', calories: totalCalories, target: user.dailyGoals.calories },
  ];

  return (
    <div className="space-y-5 pb-28 max-w-2xl mx-auto px-4 pt-2">
      {/* Title & View Switch */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            Ernährungstracker
          </span>
          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight mt-1">
            Dein Tag mit Goodies
          </h1>
        </div>

        <div className="flex bg-zinc-200/80 dark:bg-zinc-800/80 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'today' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Heute
          </button>
          <button
            type="button"
            onClick={() => {
              if (effectiveTier === 'FREE') {
                openPaywall('meal_log');
              } else {
                setActiveTab('week');
              }
            }}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'week' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <span>Woche</span>
            {effectiveTier === 'FREE' && (
              <ProBadge size="xs" label="PRO" variant="gold" />
            )}
          </button>
        </div>
      </div>

      {activeTab === 'today' ? (
        <>
          {/* Calorie Card */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Kalorienbilanz
              </span>
              <span className="text-xs font-semibold text-zinc-500">
                Tagesziel: {user.dailyGoals.calories} kcal
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-4xl font-black text-zinc-900 tracking-tight">
                  {Math.abs(remainingCalories)}
                </span>
                <span className="text-xs font-bold text-zinc-500 ml-1.5">
                  {remainingCalories >= 0 ? 'kcal übrig' : 'kcal über Ziel'}
                </span>
              </div>

              <div className="text-right">
                <div className="text-xs text-zinc-400">Aufgenommen</div>
                <div className="text-lg font-bold text-amber-600">{totalCalories} kcal</div>
              </div>
            </div>

            <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  remainingCalories >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${calPercent}%` }}
              />
            </div>

            {/* Macros 3-col */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 text-center">
              <div className="p-2.5 bg-zinc-50 rounded-2xl">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Protein</span>
                <div className="text-xs font-black text-zinc-900 mt-0.5">
                  {Math.round(totalProtein)}g <span className="text-[10px] text-zinc-400 font-normal">/ {user.dailyGoals.protein}g</span>
                </div>
              </div>
              <div className="p-2.5 bg-zinc-50 rounded-2xl">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Kohlenhydrate</span>
                <div className="text-xs font-black text-zinc-900 mt-0.5">
                  {Math.round(totalCarbs)}g <span className="text-[10px] text-zinc-400 font-normal">/ {user.dailyGoals.carbs}g</span>
                </div>
              </div>
              <div className="p-2.5 bg-zinc-50 rounded-2xl">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Fett</span>
                <div className="text-xs font-black text-zinc-900 mt-0.5">
                  {Math.round(totalFat)}g <span className="text-[10px] text-zinc-400 font-normal">/ {user.dailyGoals.fat}g</span>
                </div>
              </div>
            </div>

            {/* Zucker & Salz Limits Monitoring */}
            {(user.dailyGoals.maxSugar || user.dailyGoals.maxSalt) && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {user.dailyGoals.maxSugar && (
                  <div className="p-2 bg-amber-50/60 rounded-2xl border border-amber-100 text-[11px] flex items-center justify-between">
                    <span className="text-amber-900 font-bold">Zucker:</span>
                    <span className={`font-black ${totalSugar > user.dailyGoals.maxSugar ? 'text-rose-600' : 'text-amber-700'}`}>
                      {totalSugar.toFixed(1)}g / {user.dailyGoals.maxSugar}g
                    </span>
                  </div>
                )}
                {user.dailyGoals.maxSalt && (
                  <div className="p-2 bg-zinc-50 rounded-2xl border border-zinc-200 text-[11px] flex items-center justify-between">
                    <span className="text-zinc-700 font-bold">Salz:</span>
                    <span className={`font-black ${totalSalt > user.dailyGoals.maxSalt ? 'text-rose-600' : 'text-zinc-800'}`}>
                      {totalSalt.toFixed(1)}g / {user.dailyGoals.maxSalt}g
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Water Tracker */}
          <div className="relative overflow-hidden bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-3">
            <WaterCelebration active={showWaterCelebration} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-zinc-900">Wasserzähler</h3>
                  <p className="text-[11px] text-zinc-500">
                    {waterIntakeMl} von {user.dailyGoals.water} ml
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => addWater(250)}
                  className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-cyan-200 active:scale-95 transition-all"
                >
                  +250 ml
                </button>
                <button
                  type="button"
                  onClick={() => addWater(500)}
                  className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-cyan-200 active:scale-95 transition-all"
                >
                  +500 ml
                </button>
                <button
                  type="button"
                  onClick={resetWater}
                  className="text-zinc-400 hover:text-zinc-600 text-[11px] px-1.5 py-1"
                  title="Zurücksetzen"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (waterIntakeMl / user.dailyGoals.water) * 100)}%` }}
              />
            </div>
          </div>

          {/* ============================================================ */}
          {/* MEALS BY CATEGORY: INLINE HINZUFÜGEN PRO MAHLZEIT */}
          {/* ============================================================ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                Mahlzeiten ({todayMeals.length})
              </h3>
              {effectiveTier === 'FREE' && (
                <ProBadge 
                  size="xs" 
                  label="PRO Feature" 
                  variant="gold" 
                  onClick={() => openPaywall('meal_log')} 
                />
              )}
            </div>

            {/* PRO Notice Banner for FREE Users */}
            {effectiveTier === 'FREE' && (
              <ProNoticeBanner
                context="meal_log"
                title="Mahlzeitentracker & Kalorienbilanz"
                description="Wasserzähler ist 100% kostenlos. Tracke deine Mahlzeiten & Makronährstoffe mit Goodies PRO."
                buttonLabel="PRO abonnieren"
              />
            )}

            {mealCategories.map((cat) => {
              const items = todayMeals.filter(m => m.mealType === cat.type);
              const catCalories = items.reduce((sum, i) => sum + i.calories, 0);

              return (
                <div key={cat.type} className="bg-white rounded-3xl p-4 sm:p-5 border border-zinc-200/80 shadow-sm space-y-3">
                  {/* Category Header with Inline "+ Hinzufügen" Button */}
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.icon}</span>
                      <div>
                        <h4 className="font-extrabold text-xs text-zinc-900">{cat.label}</h4>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {items.length} {items.length === 1 ? 'Eintrag' : 'Einträge'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded-xl">
                        {catCalories} kcal
                      </span>

                      {/* Inline Add Trigger */}
                      {!hasFeature('mealLogging') ? (
                        <button
                          type="button"
                          onClick={() => handleOpenInlineAdd(cat.type)}
                          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-600 active:scale-95 text-xs font-bold px-2.5 py-1 rounded-xl border border-zinc-200 hover:border-amber-300 flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Mahlzeit hinzufügen (Goodies PRO)"
                        >
                          <Lock className="w-3 h-3 text-zinc-400" />
                          <span>Hinzufügen</span>
                          <ProBadge size="xs" label="PRO" variant="gold" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenInlineAdd(cat.type)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 active:scale-95 text-xs font-bold px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Hinzufügen</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Meal Items List */}
                  {items.length === 0 ? (
                    <div className="py-2 text-center">
                      <p className="text-[11px] text-zinc-400 italic">
                        Noch kein {cat.label} erfasst.
                      </p>
                      {!hasFeature('mealLogging') ? (
                        <button
                          type="button"
                          onClick={() => openPaywall('meal_log')}
                          className="text-xs font-semibold text-zinc-500 hover:text-amber-800 mt-1.5 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Lock className="w-3 h-3 text-zinc-400" />
                          <span>Mahlzeit erfassen</span>
                          <ProBadge size="xs" label="PRO" variant="gold" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenInlineAdd(cat.type)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 mt-1 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Jetzt erstes Produkt eintragen</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 divide-y divide-zinc-50">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between pt-2 first:pt-0"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-zinc-900 truncate block">
                                {item.productName}
                              </span>
                              {item.isCustom && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100/70 text-amber-800 border border-amber-200/80 shrink-0">
                                  Eigenes Gericht
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400">
                              {item.amountLabel || `${item.portionGrams}g`} • {item.protein}g Protein • {item.timestamp}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-bold text-zinc-700">
                              {item.calories} kcal
                            </span>
                            <button
                              type="button"
                              onClick={() => removeMealLog(item.id)}
                              className="text-zinc-300 hover:text-rose-500 transition-colors p-1"
                              title="Löschen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Weekly Analytics */
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-900">7-Tage-Verlauf</h3>
            <span className="text-xs text-zinc-500">Schnitt: ~2.120 kcal</span>
          </div>

          <div className="flex items-end justify-between h-44 pt-6 pb-2 px-2 gap-2 border-b border-zinc-100">
            {weeklyData.map((item, idx) => {
              const heightPercent = Math.min(100, Math.round((item.calories / 2500) * 100));
              const isToday = item.day === 'Heute';
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[9px] font-bold text-zinc-500">{item.calories}</span>
                  <div className="w-full bg-zinc-100 rounded-t-lg relative flex items-end h-full max-w-[28px]">
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        isToday ? 'bg-emerald-500' : 'bg-emerald-300'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold ${isToday ? 'text-emerald-600' : 'text-zinc-400'}`}>
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 space-y-1">
            <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Wochenauswertung
            </h4>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Deine Kalorienzufuhr ist stabil im Zielbereich. Dein durchschnittlicher Proteingehalt lag diese Woche bei 94g pro Tag.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* INLINE ADD PRODUCT & CUSTOM MEAL MODAL */}
      {/* ============================================================ */}
      {activeMealTypeForAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-[#171a20] rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-lg text-zinc-900 dark:text-zinc-100 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-[slideUp_0.2s_ease-out]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                {isCustomFormOpen && (
                  <button
                    type="button"
                    onClick={() => setIsCustomFormOpen(false)}
                    className="p-1 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors mr-1"
                    title="Zurück zur Suche"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    {isCustomFormOpen ? 'Persönlicher Speicher' : 'Mahlzeit erfassen'}
                  </span>
                  <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                    {isCustomFormOpen 
                      ? `Eigenes Gericht zu ${mealCategories.find(c => c.type === activeMealTypeForAdd)?.label}`
                      : `${mealCategories.find(c => c.type === activeMealTypeForAdd)?.label} hinzufügen`
                    }
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveMealTypeForAdd(null);
                  setIsCustomFormOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* VIEW A: CUSTOM FOOD FORM */}
            {isCustomFormOpen ? (
              <form onSubmit={handleSaveAndAddCustomFood} className="space-y-4">
                {/* Privacy Badge */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-emerald-900 leading-snug">
                    <strong>Nur für dich:</strong> Dieses Gericht wird ausschließlich in deinem persönlichen Account gespeichert. Es wird nicht in die zentrale Produktdatenbank übernommen und bleibt für spätere Mahlzeiten schnell abrufbar.
                  </p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Name des Gerichts oder Lebensmittels *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="z. B. Rührei mit Tomaten, Haferbrei..."
                    value={customFormName}
                    onChange={(e) => setCustomFormName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                {/* Portionsgröße */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Menge / Portionsgröße
                  </label>
                  <input
                    type="text"
                    placeholder="z. B. 1 Portion, 200g, 1 Schüssel..."
                    value={customFormAmount}
                    onChange={(e) => setCustomFormAmount(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                {/* Nährwerte (optional / grundlegend) */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
                    Nährwerte & Kalorien (optional)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] text-zinc-500 block mb-0.5">Kalorien (kcal)</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="350"
                        value={customFormCalories}
                        onChange={(e) => setCustomFormCalories(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block mb-0.5">Protein (g)</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="20"
                        value={customFormProtein}
                        onChange={(e) => setCustomFormProtein(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block mb-0.5">Kohlenhydrate (g)</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="30"
                        value={customFormCarbs}
                        onChange={(e) => setCustomFormCarbs(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block mb-0.5">Fett (g)</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="12"
                        value={customFormFat}
                        onChange={(e) => setCustomFormFat(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Notiz */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Notiz (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="z. B. mit etwas Olivenöl und Kräutern zubereitet..."
                    value={customFormNotes}
                    onChange={(e) => setCustomFormNotes(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                {/* Form Actions */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomFormOpen(false)}
                    className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs py-3 rounded-xl transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={!customFormName.trim()}
                    className="flex-[2] bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Speichern & {getAddButtonLabel(activeMealTypeForAdd)}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* VIEW B: AUTOCOMPLETE SEARCH & PRODUCT SELECTION */
              <div className="space-y-3.5">
                {/* Quick Action: Barcode Scanner Shortcut */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMealTypeForAdd(null);
                      setActiveView('scanner');
                    }}
                    className="flex-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold p-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <ScanLine className="w-4 h-4 text-emerald-600" />
                    <span>Barcode scannen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCustomForm(inlineSearchQuery)}
                    className="flex-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 text-xs font-bold p-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Utensils className="w-3.5 h-3.5 text-zinc-600" />
                    <span>Eigenes Gericht anlegen</span>
                  </button>
                </div>

                {/* Autocomplete Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Produkt oder Gericht suchen (z. B. Haferflocken, Spaghetti)..."
                    value={inlineSearchQuery}
                    onChange={(e) => {
                      setInlineSearchQuery(e.target.value);
                      setSelectedProductForAdd(null);
                      setSelectedCustomFoodForAdd(null);
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  />
                  {inlineSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setInlineSearchQuery('');
                        setSelectedProductForAdd(null);
                        setSelectedCustomFoodForAdd(null);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterSource('all')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 ${
                      filterSource === 'all'
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    Alle
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterSource('custom')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      filterSource === 'custom'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    <span>Eigene Gerichte</span>
                    {customFoods.length > 0 && (
                      <span className="text-[10px] opacity-90 px-1 bg-black/20 rounded-md">
                        {customFoods.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterSource('database')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 ${
                      filterSource === 'database'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    Goodies Produkte
                  </button>
                </div>

                {/* Unmatched Text Hint / Create Custom Meal card */}
                {inlineSearchQuery.trim().length > 0 && matchingProducts.length === 0 && matchingCustomFoods.length === 0 && (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-2">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-950">
                          Kein Produkt zu „{inlineSearchQuery}“ in der Datenbank gefunden
                        </p>
                        <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                          Erfasse es jetzt als dein eigenes Gericht mit Nährwerten. Es wird nur in deinem Konto gespeichert.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenCustomForm(inlineSearchQuery)}
                      className="w-full bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Eigenes Gericht „{inlineSearchQuery}“ anlegen</span>
                    </button>
                  </div>
                )}

                {/* Selection list: Matching Personal Custom Foods & Central Products */}
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {/* Personal Custom Foods Group */}
                  {(filterSource === 'all' || filterSource === 'custom') && matchingCustomFoods.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider px-2 py-0.5 bg-amber-50/70 rounded-md flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-amber-600" />
                        <span>Deine eigenen Gerichte ({matchingCustomFoods.length})</span>
                      </div>
                      {matchingCustomFoods.map((cf) => {
                        const isSelected = selectedCustomFoodForAdd?.id === cf.id;
                        return (
                          <button
                            key={cf.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomFoodForAdd(cf);
                              setSelectedProductForAdd(null);
                            }}
                            className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-amber-50 border-amber-500 shadow-xs'
                                : 'bg-white border-zinc-200 hover:bg-zinc-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200/60">
                                <Utensils className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h5 className="text-xs font-bold text-zinc-900 truncate">
                                    {cf.name}
                                  </h5>
                                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1 rounded">
                                    Privat
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-500 block truncate">
                                  {cf.amount || '1 Portion'} • {cf.calories} kcal • {cf.protein}g Protein
                                </span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Central Database Products */}
                  {(filterSource === 'all' || filterSource === 'database') && matchingProducts.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {filterSource === 'all' && matchingCustomFoods.length > 0 && (
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-0.5">
                          Goodies Produkte ({matchingProducts.length})
                        </div>
                      )}
                      {matchingProducts.map((p) => {
                        const isSelected = selectedProductForAdd?.id === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedProductForAdd(p);
                              setSelectedCustomFoodForAdd(null);
                            }}
                            className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                                : 'bg-white border-zinc-200 hover:bg-zinc-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img loading="lazy"
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-9 h-9 rounded-xl object-cover bg-zinc-100 shrink-0 border border-zinc-100"
                              />
                              <div className="min-w-0">
                                <span className="text-[10px] text-zinc-400 font-bold block truncate">
                                  {p.brand}
                                </span>
                                <h5 className="text-xs font-bold text-zinc-900 truncate">
                                  {p.name}
                                </h5>
                                <span className="text-[10px] text-zinc-500">
                                  {p.nutritionPer100g.calories} kcal / 100g • {p.nutritionPer100g.protein}g Protein
                                </span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SELECTED CUSTOM FOOD DETAILS & ACTION */}
                {selectedCustomFoodForAdd && (
                  <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                          Ausgewähltes persönliches Gericht
                        </span>
                        <h4 className="text-xs font-bold text-zinc-900">
                          {selectedCustomFoodForAdd.name}
                        </h4>
                      </div>
                      <span className="text-sm font-black text-amber-900">
                        {selectedCustomFoodForAdd.calories} kcal
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-600 flex items-center gap-3">
                      <span>Portion: <strong>{selectedCustomFoodForAdd.amount || '1 Portion'}</strong></span>
                      <span>Protein: <strong>{selectedCustomFoodForAdd.protein}g</strong></span>
                      {selectedCustomFoodForAdd.carbs !== undefined && (
                        <span>Carbs: <strong>{selectedCustomFoodForAdd.carbs}g</strong></span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmCustomFoodAdd}
                      className="w-full bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{getAddButtonLabel(activeMealTypeForAdd)}</span>
                    </button>
                  </div>
                )}

                {/* SELECTED DATABASE PRODUCT PORTION ADJUSTER & ACTION */}
                {selectedProductForAdd && (
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-700">Portionsgröße:</span>
                      <div className="flex items-center gap-1.5">
                        {[50, 100, 150, 200, 250].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setInlinePortion(preset)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                              inlinePortion === preset
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-zinc-600 border-zinc-200'
                            }`}
                          >
                            {preset}g
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        step="10"
                        min="10"
                        max="1500"
                        value={inlinePortion}
                        onChange={(e) => setInlinePortion(Math.max(10, Number(e.target.value)))}
                        className="w-24 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900"
                      />
                      <span className="text-xs text-zinc-500 font-medium">Gramm / ml</span>

                      <div className="ml-auto text-right">
                        <span className="text-sm font-black text-emerald-600 block">
                          +{Math.round((selectedProductForAdd.nutritionPer100g.calories * inlinePortion) / 100)} kcal
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          +{((selectedProductForAdd.nutritionPer100g.protein * inlinePortion) / 100).toFixed(1)}g Protein
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmProductAdd}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{getAddButtonLabel(activeMealTypeForAdd)}</span>
                    </button>
                  </div>
                )}

                {/* IF NO ITEM IS SELECTED BUT USER ENTERED TEXT: Trigger button opens custom food form */}
                {!selectedProductForAdd && !selectedCustomFoodForAdd && inlineSearchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => handleOpenCustomForm(inlineSearchQuery)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{getAddButtonLabel(activeMealTypeForAdd)}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
