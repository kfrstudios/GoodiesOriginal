import { useState } from 'react';
import { 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Sparkles, 
  Scale, 
  TrendingUp, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  Flame,
  Layers,
  HeartHandshake
} from 'lucide-react';
import { Product, UserProfile } from '../types';
import { generateProductScoreExplanation, ScoreDimension, DetailedFactor } from '../utils/scoreExplanation';

interface ProductScoreExplainerProps {
  product: Product;
  user?: UserProfile;
  topAlternative?: Product;
  onCompareWithAlternative?: (alt: Product) => void;
}

export function ProductScoreExplainer({
  product,
  user,
  topAlternative,
  onCompareWithAlternative
}: ProductScoreExplainerProps) {
  const [activeQuestion, setActiveQuestion] = useState<number>(1);
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);

  const report = generateProductScoreExplanation(product, user);

  return (
    <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
      {/* Header & Subtitle */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                Goodies Score-Analyse & Einordnung
              </h3>
              <p className="text-[11px] text-zinc-400">
                Die 4 Kernfragen zu deinem gescannten Lebensmittel
              </p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
            Kostenlos & Transparent
          </span>
        </div>
      </div>

      {/* 4 Question Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-zinc-100/90 rounded-2xl">
        {[
          { id: 1, label: '1. Warum dieser Score?', icon: HelpCircle },
          { id: 2, label: '2. Gut & Schlecht', icon: Scale },
          { id: 3, label: '3. Was heißt das?', icon: HeartHandshake },
          { id: 4, label: '4. Bessere Wahl?', icon: TrendingUp },
        ].map((q) => {
          const Icon = q.icon;
          const isActive = activeQuestion === q.id;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setActiveQuestion(q.id)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`} />
              <span className="truncate">{q.label}</span>
            </button>
          );
        })}
      </div>

      {/* QUESTION 1: Warum hat dieses Produkt diesen Score? */}
      {activeQuestion === 1 && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          <div className="bg-zinc-50 rounded-2xl p-3.5 border border-zinc-100">
            <p className="text-xs text-zinc-700 leading-relaxed font-medium">
              {report.whyScoreSummary}
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Zusammensetzung der 100 Punkte:
            </span>

            <div className="space-y-2">
              {report.dimensions.map((dim) => {
                const isExpanded = expandedDimension === dim.name;
                const statusColor = 
                  dim.status === 'excellent' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                  dim.status === 'good' ? 'text-emerald-700 bg-emerald-50/70 border-emerald-100' :
                  dim.status === 'moderate' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                  'text-rose-700 bg-rose-50 border-rose-200';

                return (
                  <div
                    key={dim.name}
                    className="border border-zinc-100 bg-zinc-50/60 rounded-2xl p-3 hover:bg-zinc-50 transition-colors"
                  >
                    <div 
                      onClick={() => setExpandedDimension(isExpanded ? null : dim.name)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-900">{dim.name}</span>
                          <span className="text-[10px] text-zinc-400 font-medium">({dim.weight})</span>
                        </div>
                        <div className="w-48 max-w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              dim.score >= 80 ? 'bg-emerald-500' : dim.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${dim.score}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${statusColor}`}>
                          {dim.earnedPoints} / {dim.maxPoints} Pkt
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <p className="text-[11px] text-zinc-600 mt-2.5 pt-2 border-t border-zinc-200/60 leading-relaxed">
                        {dim.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* QUESTION 2: Was ist an diesem Produkt gut oder schlecht? */}
      {activeQuestion === 2 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Positive Factors */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Positive Eigenschaften ({report.positiveFactors.length})</span>
            </div>

            {report.positiveFactors.length === 0 ? (
              <p className="text-xs text-zinc-400 italic bg-zinc-50 p-3 rounded-xl">
                Keine herausragenden positiven Nährwertmerkmale gefunden.
              </p>
            ) : (
              <div className="space-y-2">
                {report.positiveFactors.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950">{f.title}</span>
                      <span className="text-[10px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                        {f.value}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-900/80 leading-snug">
                      {f.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Negative Factors */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Kritische Eigenschaften & Abzüge ({report.negativeFactors.length})</span>
            </div>

            {report.negativeFactors.length === 0 ? (
              <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                ✅ Sehr sauberes Profil: Keine kritischen Nährwertmängel oder bedenklichen Zusätze!
              </p>
            ) : (
              <div className="space-y-2">
                {report.negativeFactors.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-950">{f.title}</span>
                      <span className="text-[10px] font-black text-rose-700 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                        {f.value}
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-900/80 leading-snug">
                      {f.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUESTION 3: Was bedeutet das für mich? */}
      {activeQuestion === 3 && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {/* Portion Reality Check */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
              Alltags-Portion & Blutzucker
            </span>
            <p className="text-xs text-zinc-800 leading-relaxed font-medium">
              {report.personalMeaning.portionCheck}
            </p>
          </div>

          {/* Satiety & Energy */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
              Sättigung & Leistungsfähigkeit
            </span>
            <p className="text-xs text-zinc-800 leading-relaxed font-medium">
              {report.personalMeaning.satietyAndEnergy}
            </p>
          </div>

          {/* User Goals Alignment */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
              Abgleich mit deinen Zielen ({user?.diet || 'Allesesser'}):
            </span>
            <ul className="space-y-1 text-xs text-zinc-700">
              {report.personalMeaning.goalAlignment.map((goal, idx) => (
                <li key={idx} className="leading-snug">{goal}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* QUESTION 4: Welche bessere Alternative gibt es? */}
      {activeQuestion === 4 && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {topAlternative ? (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 rounded-3xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Top-Alternative in dieser Kategorie
                </span>
                <span className="text-xs font-black text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                  +{topAlternative.goodiesScore - product.goodiesScore} Punkte besser
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs">
                <img
                  src={topAlternative.imageUrl}
                  alt={topAlternative.name}
                  className="w-14 h-14 rounded-xl object-cover bg-zinc-100 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                    {topAlternative.brand}
                  </span>
                  <h4 className="text-xs font-extrabold text-zinc-900 truncate">
                    {topAlternative.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                    <span>Score: <strong>{topAlternative.goodiesScore}</strong></span>
                    <span>•</span>
                    <span>Nutri-Score: <strong>{topAlternative.nutriScore}</strong></span>
                    <span>•</span>
                    <span>{topAlternative.nutritionPer100g.calories} kcal</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-emerald-900 font-medium leading-snug">
                💡 <strong>Warum besser?</strong> Liefert eine höhere Nährwertdichte mit weniger zugesetztem Zucker und natürlicherer Verarbeitung.
              </p>

              {onCompareWithAlternative && (
                <button
                  type="button"
                  onClick={() => onCompareWithAlternative(topAlternative)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Jetzt direkt 1:1 vergleichen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-center space-y-1">
              <ShieldCheck className="w-6 h-6 text-emerald-600 mx-auto" />
              <h5 className="text-xs font-bold text-zinc-900">Bereits die beste Wahl</h5>
              <p className="text-[11px] text-zinc-500">
                In dieser Kategorie gehört dieses Produkt bereits zu den Spitzenreitern. Es gibt aktuell keine signifikant gesündere Alternative.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
