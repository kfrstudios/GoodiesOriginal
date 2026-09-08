import { useState, FormEvent } from 'react';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  PlusCircle, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Info,
  ChevronRight,
  ListPlus,
  Flame,
  Scale,
  Crown,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateGoodiesMatch, getBetterAlternatives } from '../services/productService';
import { NutriScore, MealType } from '../types';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { DynamicScoreGauge } from '../components/DynamicScoreGauge';
import { ProductScoreExplainer } from '../components/ProductScoreExplainer';
import { ProBadge } from '../components/pro/ProDesignSystem';
import { ReportModal } from '../components/ReportModal';
import { CleanNumberInput } from '../components/CleanNumberInput';

export function ProductDetailView() {
  const { 
    selectedProduct, 
    products, 
    user, 
    openProductDetail, 
    setActiveView, 
    isFavorite, 
    toggleFavorite,
    logMeal,
    shoppingLists,
    addShoppingItem,
    effectiveTier,
    openPaywall,
    hasFeature,
    showToast,
    openComparison,
    addReport
  } = useApp();

  const [portionGrams, setPortionGrams] = useState<number>(100);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [showShoppingModal, setShowShoppingModal] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  if (!selectedProduct) {
    return (
      <div className="p-6 text-center space-y-4 max-w-md mx-auto">
        <p className="text-zinc-500 text-sm">Kein Produkt ausgewählt.</p>
        <button
          type="button"
          onClick={() => setActiveView('home')}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold"
        >
          Zur Startseite
        </button>
      </div>
    );
  }

  const p = selectedProduct;
  const match = calculateGoodiesMatch(p, user);
  const alternatives = getBetterAlternatives(p, products);
  const isFav = isFavorite(p.id);

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getNutriColor = (score: NutriScore) => {
    switch (score) {
      case 'A': return 'bg-[#00813f] text-white';
      case 'B': return 'bg-[#84bb25] text-white';
      case 'C': return 'bg-[#fecb02] text-zinc-900';
      case 'D': return 'bg-[#ee8100] text-white';
      case 'E': return 'bg-[#e63e11] text-white';
    }
  };

  const handleLogSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!hasFeature('mealLogging')) {
      setShowLogModal(false);
      openPaywall('meal_log');
      return;
    }
    logMeal(p, portionGrams, selectedMealType);
    setShowLogModal(false);
  };

  return (
    <div className="pb-32 max-w-2xl mx-auto px-4 pt-2 space-y-5">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveView('home')}
          className="w-10 h-10 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-zinc-900 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openComparison(p)}
            className="h-10 px-3 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center gap-1.5 text-zinc-700 hover:text-emerald-700 font-bold text-xs shadow-sm active:scale-95 transition-all"
            title="Mit anderem Produkt vergleichen"
          >
            <Scale className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Vergleichen</span>
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite(p.id)}
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all ${
              isFav 
                ? 'bg-rose-50 border-rose-200 text-rose-500 shadow-sm' 
                : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-700'
            }`}
          >
            <Heart className={`w-5 h-5 ${isFav ? 'fill-rose-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowShoppingModal(true)}
            className="w-10 h-10 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-zinc-900 shadow-sm"
            title="Zur Einkaufsliste"
          >
            <ListPlus className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="w-10 h-10 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-amber-600 hover:border-amber-200 transition-colors shadow-sm cursor-pointer"
            title="Produktanalyse melden (z. B. falsche Angaben)"
            aria-label="Produktanalyse melden"
          >
            <AlertTriangle className="w-4.5 h-4.5 text-zinc-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: p.name, text: `${p.name} auf Goodies`, url: window.location.href });
              } else {
                showToast('Link kopiert');
              }
            }}
            className="w-10 h-10 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-zinc-900 shadow-sm"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Product Card */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm flex flex-col sm:flex-row gap-5 items-center">
        <div className="w-36 h-36 rounded-2xl bg-zinc-100 overflow-hidden shrink-0 border border-zinc-100 relative">
          <img
            src={p.imageUrl}
            alt={p.name}
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white font-mono text-[10px] px-2 py-0.5 rounded-full">
            {p.quantity}
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1.5 w-full">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            <span>{p.brand}</span>
            <span>•</span>
            <span>{p.category}</span>
          </div>

          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight leading-snug">
            {p.name}
          </h1>

          <p className="text-[11px] font-mono text-zinc-400">
            EAN: {p.barcode}
          </p>

          {/* Labels chips */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 pt-2">
            {p.labels.map((label) => (
              <span
                key={label}
                className="text-[10px] font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Dual Scores Row: Animated Dynamic Goodies Score & Personal Match */}
      <div className="grid grid-cols-2 gap-3">
        {/* Dynamic Goodies Score */}
        <div className="bg-white rounded-3xl p-4 border border-zinc-200/80 shadow-sm flex flex-col items-center justify-center space-y-1.5 text-center">
          <DynamicScoreGauge
            score={p.goodiesScore}
            size="md"
            animateOnMount={true}
            label="Goodies Score"
            showVerdict={false}
          />
          <span className="text-[10px] font-semibold text-zinc-500">
            {p.goodiesScore >= 85 ? 'Hervorragende Qualität' : p.goodiesScore >= 65 ? 'Gute Zusammensetzung' : 'Kritische Werte'}
          </span>
        </div>

        {/* Goodies Match (PRO feature: gray deactivated styling with golden ProBadge in FREE) */}
        <div 
          onClick={() => {
            if (effectiveTier === 'FREE') {
              openPaywall('personal_match');
            }
          }}
          className={`rounded-3xl p-4 border shadow-sm flex flex-col justify-between space-y-2 relative transition-all ${
            effectiveTier === 'FREE' 
              ? 'bg-zinc-50 border-zinc-200/90 cursor-pointer hover:border-amber-300 group' 
              : 'bg-white border-zinc-200/80'
          }`}
          title={effectiveTier === 'FREE' ? 'Persönlicher Goodies Match (Goodies PRO Funktion)' : 'Dein persönlicher Goodies Match'}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wide ${effectiveTier === 'FREE' ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Dein Match
            </span>
            {effectiveTier === 'FREE' ? (
              <ProBadge size="xs" label="PRO" variant="gold" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-500" />
            )}
          </div>

          <div className="flex items-baseline gap-1">
            {effectiveTier === 'FREE' ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-zinc-400 blur-[2.5px] select-none">
                  88%
                </span>
                <span className="text-[11px] text-amber-700 font-extrabold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <Lock className="w-3 h-3 text-amber-700" /> PRO
                </span>
              </div>
            ) : (
              <>
                <span className="text-3xl font-black tracking-tight text-emerald-600">
                  <AnimatedCounter value={match.score} />%
                </span>
                <span className="text-xs text-zinc-400 font-bold">Passung</span>
              </>
            )}
          </div>

          <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                effectiveTier === 'FREE' ? 'bg-zinc-300' : 'bg-emerald-500'
              }`}
              style={{ width: `${effectiveTier === 'FREE' ? 70 : match.score}%` }}
            />
          </div>

          <span className={`text-[10px] font-semibold truncate ${effectiveTier === 'FREE' ? 'text-zinc-500' : 'text-zinc-700'}`}>
            {effectiveTier === 'FREE' ? 'Persönlicher Match (Nur mit PRO)' : `${user.diet}: ${match.verdict}`}
          </span>
        </div>
      </div>

      {/* Match Warnings & Feedback */}
      {match.warnings.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Ernährungshinweise für dich:</span>
          </div>
          <ul className="text-xs text-rose-700 list-disc list-inside space-y-0.5 pl-1">
            {match.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 4-Fragen Goodies Score-Analyse & Nährwert-Deep-Dive */}
      <ProductScoreExplainer 
        product={p} 
        user={user} 
        topAlternative={alternatives[0]}
        onCompareWithAlternative={(alt) => openComparison(p, alt)}
      />

      {/* Nutri-Score & Nova Processing Section */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
            Offizielle Einstufung
          </h3>
          <span className="text-[11px] text-zinc-400">EU-Lebensmittelstandards</span>
        </div>

        <div className="grid grid-cols-2 gap-4 items-center">
          {/* Nutri-Score visual bar */}
          <div className="bg-zinc-50 rounded-2xl p-3.5 border border-zinc-100 space-y-2">
            <span className="text-[11px] font-bold text-zinc-500 block">Nutri-Score</span>
            <div className="flex items-center gap-1">
              {(['A', 'B', 'C', 'D', 'E'] as NutriScore[]).map((score) => {
                const isSelected = p.nutriScore === score;
                return (
                  <div
                    key={score}
                    className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-transform ${
                      isSelected
                        ? `${getNutriColor(score)} ring-2 ring-zinc-900 scale-110 shadow-sm`
                        : 'bg-zinc-200 text-zinc-400 opacity-60'
                    }`}
                  >
                    {score}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nova Score */}
          <div className="bg-zinc-50 rounded-2xl p-3.5 border border-zinc-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500">Nova Gruppe</span>
              <span className="text-xs font-black text-zinc-900 bg-zinc-200 px-2 py-0.5 rounded-md">
                Stufe {p.novaScore}
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 leading-snug">
              {p.novaScore === 1 && 'Unverarbeitet oder minimal verarbeitet'}
              {p.novaScore === 2 && 'Verarbeitete kulinarische Zutat'}
              {p.novaScore === 3 && 'Verarbeitetes Lebensmittel'}
              {p.novaScore === 4 && 'Ultra-hochverarbeitetes Produkt'}
            </p>
          </div>
        </div>
      </div>

      {/* Nutrition Breakdown per 100g */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
              Nährwerttabelle
            </h3>
            <p className="text-xs text-zinc-600 font-semibold">Pro 100g / 100ml</p>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-zinc-900">{p.nutritionPer100g.calories}</span>
            <span className="text-xs text-zinc-400 ml-1 font-bold">kcal</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-zinc-50 rounded-xl p-2.5 flex justify-between">
            <span className="text-zinc-500">Fett</span>
            <span className="font-bold text-zinc-900">{p.nutritionPer100g.fat} g</span>
          </div>
          <div className="bg-zinc-50 rounded-xl p-2.5 flex justify-between">
            <span className="text-zinc-500">davon gesättigt</span>
            <span className="font-bold text-zinc-900">{p.nutritionPer100g.saturatedFat} g</span>
          </div>
          <div className="bg-zinc-50 rounded-xl p-2.5 flex justify-between">
            <span className="text-zinc-500">Kohlenhydrate</span>
            <span className="font-bold text-zinc-900">{p.nutritionPer100g.carbohydrates} g</span>
          </div>
          <div className="bg-zinc-50 rounded-xl p-2.5 flex justify-between">
            <span className="text-zinc-500">davon Zucker</span>
            <span className={`font-bold ${p.nutritionPer100g.sugars > 10 ? 'text-amber-600' : 'text-zinc-900'}`}>
              {p.nutritionPer100g.sugars} g
            </span>
          </div>
          <div className="bg-zinc-50 rounded-xl p-2.5 flex justify-between">
            <span className="text-zinc-500">Ballaststoffe</span>
            <span className="font-bold text-emerald-700">{p.nutritionPer100g.fiber} g</span>
          </div>
          <div className="bg-zinc-50 rounded-xl p-2.5 flex justify-between">
            <span className="text-zinc-500">Protein</span>
            <span className="font-bold text-emerald-700">{p.nutritionPer100g.protein} g</span>
          </div>
        </div>
      </div>

      {/* Ingredients & Allergens */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
          Zutaten & Allergene
        </h3>
        <p className="text-xs text-zinc-700 leading-relaxed">
          {p.ingredients}
        </p>

        {p.allergens.length > 0 && (
          <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-zinc-500">Allergene:</span>
            {p.allergens.map((alg) => (
              <span
                key={alg}
                className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md"
              >
                {alg}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Additives Check (Zusatzstoffe) */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
            Zusatzstoffanalyse
          </h3>
          <span className="text-[11px] text-zinc-500">
            {p.additives.length === 0 ? 'Keine Zusatzstoffe' : `${p.additives.length} Zusatzstoff(e)`}
          </span>
        </div>

        {p.additives.length === 0 ? (
          <div className="bg-emerald-50 rounded-2xl p-3 flex items-center gap-2 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Dieses Produkt ist frei von künstlichen Zusatzstoffen oder E-Nummern.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {p.additives.map((add) => (
              <div
                key={add.code}
                className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-black text-zinc-900">{add.code}</span>
                    <span className="text-xs font-medium text-zinc-700">{add.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      add.risk === 'safe'
                        ? 'bg-emerald-100 text-emerald-800'
                        : add.risk === 'moderate'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {add.risk === 'safe' ? 'Unbedenklich' : add.risk === 'moderate' ? 'Mäßig' : 'Bedenklich'}
                  </span>
                </div>
                {add.note && (
                  <p className="text-[11px] text-zinc-500 leading-snug">{add.note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pros and Cons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-3xl p-4 border border-zinc-200/80 shadow-sm space-y-2">
          <h4 className="text-xs font-bold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Vorteile
          </h4>
          <ul className="text-xs text-zinc-600 space-y-1.5">
            {p.pros.map((pro, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-500 shrink-0">•</span>
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-zinc-200/80 shadow-sm space-y-2">
          <h4 className="text-xs font-bold text-rose-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Nachteile
          </h4>
          <ul className="text-xs text-zinc-600 space-y-1.5">
            {p.cons.map((con, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-rose-500 shrink-0">•</span>
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Health Verdict */}
      <div className="bg-emerald-50/70 rounded-3xl p-4 border border-emerald-200 space-y-1.5">
        <h4 className="text-xs font-extrabold uppercase tracking-wide text-emerald-950">
          Goodies Fazit
        </h4>
        <p className="text-xs text-emerald-900 leading-relaxed font-medium">
          {p.healthVerdict}
        </p>
      </div>

      {/* Better Product Alternatives */}
      {alternatives.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
              Bessere Alternativen
            </h3>
            <span className="text-[11px] text-emerald-600 font-semibold">Höherer Score</span>
          </div>

          <div className="space-y-2">
            {(effectiveTier === 'FREE' ? alternatives.slice(0, 1) : alternatives).map((alt) => (
              <button
                key={alt.id}
                type="button"
                onClick={() => openProductDetail(alt)}
                className="w-full bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between text-left hover:border-emerald-300 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={alt.imageUrl}
                    alt={alt.name}
                    className="w-12 h-12 rounded-xl object-cover bg-zinc-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                      {alt.brand}
                    </span>
                    <h5 className="text-xs font-bold text-zinc-900 truncate group-hover:text-emerald-600 transition-colors">
                      {alt.name}
                    </h5>
                    <span className="text-[10px] text-zinc-500">
                      Nutri {alt.nutriScore} • {alt.nutritionPer100g.calories} kcal
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                    <AnimatedCounter value={alt.goodiesScore} />
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-500 transition-colors" />
                </div>
              </button>
            ))}

            {/* FREE Teaser for more alternatives */}
            {effectiveTier === 'FREE' && alternatives.length > 1 && (
              <div 
                onClick={() => openPaywall('alternatives')}
                className="w-full bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/90 shadow-2xs flex items-center justify-between cursor-pointer hover:border-amber-300 transition-all group"
                title="Alle gesünderen Alternativen freischalten (Goodies PRO)"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-200/70 text-zinc-500 flex items-center justify-center font-bold">
                    <Scale className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-700 group-hover:text-amber-800 transition-colors">
                      +{alternatives.length - 1} weitere gesündere Alternativen
                    </h5>
                    <p className="text-[10px] text-zinc-400">
                      Entdecke alle Empfehlungen mit Goodies PRO
                    </p>
                  </div>
                </div>
                <ProBadge size="sm" label="PRO" variant="gold" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-zinc-200/80 p-3 pb-safe">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 px-3 rounded-2xl shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Flame className="w-4 h-4" />
            <span>Mahlzeit erfassen</span>
          </button>

          <button
            type="button"
            onClick={() => openComparison(p)}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs py-3.5 px-3.5 rounded-2xl flex items-center gap-1.5 active:scale-95 transition-all shadow-2xs"
            title="Mit einem anderen Produkt vergleichen"
          >
            <Scale className="w-4 h-4 text-emerald-600" />
            <span>Vergleichen</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShoppingModal(true)}
            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs py-3.5 px-3.5 rounded-2xl flex items-center gap-1.5 active:scale-95 transition-all"
            title="Zur Einkaufsliste hinzufügen"
          >
            <ListPlus className="w-4 h-4" />
            <span>Liste</span>
          </button>
        </div>
      </div>

      {/* Log Meal Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-zinc-200">
            <h3 className="font-extrabold text-base text-zinc-900">
              Mahlzeit erfassen
            </h3>
            <p className="text-xs text-zinc-500">
              {p.name} ({p.brand})
            </p>

            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-500 block mb-1.5">
                  Mahlzeit-Kategorie
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMealType(m)}
                      className={`text-xs font-semibold py-2 px-3 rounded-xl border transition-all ${
                        selectedMealType === m
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                      }`}
                    >
                      {m === 'breakfast' && 'Frühstück'}
                      {m === 'lunch' && 'Mittagessen'}
                      {m === 'dinner' && 'Abendessen'}
                      {m === 'snack' && 'Snack'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-zinc-500">Portionsgröße (g/ml)</label>
                  <span className="text-xs font-black text-emerald-600">
                    {Math.round((p.nutritionPer100g.calories * portionGrams) / 100)} kcal
                  </span>
                </div>
                <CleanNumberInput
                  min={10}
                  max={2000}
                  step={10}
                  value={portionGrams}
                  onChange={setPortionGrams}
                  placeholder="100"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs py-2.5 rounded-xl transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm"
                >
                  Hinzufügen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report link banner */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer py-1.5 px-3 rounded-xl hover:bg-zinc-100"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
          <span>Falsche Nährwerte oder Angaben? Produktanalyse melden</span>
        </button>
      </div>

      {/* Add to Shopping List Modal */}
      {showShoppingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-zinc-200">
            <h3 className="font-extrabold text-base text-zinc-900">
              Zur Einkaufsliste hinzufügen
            </h3>
            <p className="text-xs text-zinc-500">
              Wähle eine Zielliste für „{p.name}“:
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {shoppingLists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => {
                    addShoppingItem(list.id, p.name, '1x', p.id);
                    setShowShoppingModal(false);
                  }}
                  className="w-full p-3 rounded-2xl border border-zinc-200 bg-zinc-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-zinc-800">{list.title}</span>
                  <span className="text-[10px] text-zinc-400">{list.items.length} Einträge</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowShoppingModal(false)}
              className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Product Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        type="product"
        product={p}
        onSubmit={async (data) => {
          await addReport(data);
        }}
      />
    </div>
  );
}
