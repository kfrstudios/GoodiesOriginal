import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Plus, 
  X, 
  ShieldAlert, 
  Heart, 
  Flame, 
  Droplet,
  Scale
} from 'lucide-react';
import { DietType, Gender, ActivityLevel, HealthGoal } from '../types';
import { calculateDailyTargets } from '../utils/nutritionCalculations';

interface OnboardingViewProps {
  initialName?: string;
  onComplete: (data: {
    diet: DietType;
    priorities: string[];
    excludedIngredients: string[];
    allergies: string[];
    gender: Gender;
    age: number;
    heightCm: number;
    weightKg: number;
    activityLevel: ActivityLevel;
    healthGoal: HealthGoal;
    calculatedGoals: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      water: number;
      maxSugar: number;
      maxSalt: number;
    };
  }) => void;
}

export function OnboardingView({ initialName = 'Goodies Genießer', onComplete }: OnboardingViewProps) {
  const [step, setStep] = useState<number>(1);

  // Step 1: Priorities ("Was ist dir wichtig?")
  const availablePriorities = [
    'Weniger Zucker',
    'Weniger Salz',
    'Mehr Eiweiß',
    'Mehr Ballaststoffe',
    'Kalorienbewusst',
    'Keine Zusatzstoffe'
  ];
  const [priorities, setPriorities] = useState<string[]>(['Weniger Zucker', 'Mehr Eiweiß']);

  // Step 2: Diet
  const diets: { value: DietType; label: string; desc: string }[] = [
    { value: 'Allesesser', label: 'Allesesser', desc: 'Keine allgemeinen Einschränkungen bei Fleisch & Fisch' },
    { value: 'Vegetarisch', label: 'Vegetarisch', desc: 'Pflanzlich & Milchprodukte, kein Fleisch oder Fisch' },
    { value: 'Vegan', label: 'Vegan', desc: '100% rein pflanzliche Ernährung' },
    { value: 'Pescetarisch', label: 'Pescetarisch', desc: 'Vegetarisch ergänzt mit Fisch und Meeresfrüchten' },
    { value: 'Low Carb', label: 'Low Carb', desc: 'Fokus auf reduzierte Kohlenhydrate' }
  ];
  const [selectedDiet, setSelectedDiet] = useState<DietType>('Allesesser');

  // Step 3: Exclusions
  const commonExclusions = [
    'Palmöl',
    'Schweinefleisch',
    'Gelatine',
    'Künstliche Süßstoffe',
    'Aspartam',
    'Glukose-Fruktose-Sirup',
    'Koffein',
    'Farbstoffe',
    'Konservierungsstoffe'
  ];
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>(['Palmöl']);
  const [customExcludedInput, setCustomExcludedInput] = useState('');

  // Step 4: Personal metrics for daily goals
  const [gender, setGender] = useState<Gender>('female');
  const [age, setAge] = useState<number>(28);
  const [heightCm, setHeightCm] = useState<number>(172);
  const [weightKg, setWeightKg] = useState<number>(68);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [healthGoal, setHealthGoal] = useState<HealthGoal>('healthy_eating');

  // Calculate targets live
  const calculatedTargets = calculateDailyTargets({
    gender,
    age,
    heightCm,
    weightKg,
    activityLevel,
    healthGoal,
    priorities
  });

  const togglePriority = (item: string) => {
    setPriorities(prev => 
      prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]
    );
  };

  const toggleExclusion = (item: string) => {
    setExcludedIngredients(prev => 
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const addCustomExclusion = () => {
    const clean = customExcludedInput.trim();
    if (!clean) return;
    if (!excludedIngredients.includes(clean)) {
      setExcludedIngredients(prev => [...prev, clean]);
    }
    setCustomExcludedInput('');
  };

  const handleFinish = () => {
    onComplete({
      diet: selectedDiet,
      priorities,
      excludedIngredients,
      allergies: [],
      gender,
      age,
      heightCm,
      weightKg,
      activityLevel,
      healthGoal,
      calculatedGoals: calculatedTargets
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-zinc-900 flex flex-col justify-between max-w-xl mx-auto px-4 py-8">
      {/* Progress Bar & Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
              G
            </div>
            <span className="text-sm font-extrabold text-zinc-900 tracking-tight">Goodies Onboarding</span>
          </div>
          <span className="text-xs font-bold text-zinc-400">Schritt {step} von 5</span>
        </div>

        <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden mb-6">
          <motion.div 
            className="h-full bg-emerald-600 rounded-full"
            initial={{ width: '20%' }}
            animate={{ width: `${(step / 5) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Content Multi-Step Card */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* STEP 1: PRIORITIES */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Dein Fokus
                </span>
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                  Was ist dir besonders wichtig?
                </h1>
                <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                  Wähle deine Prioritäten aus. Sie beeinflussen direkt deinen persönlichen Goodies Match beim Scannen.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {availablePriorities.map((item) => {
                  const active = priorities.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => togglePriority(item)}
                      className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        active 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-1 ring-emerald-500/20' 
                          : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      <span className="font-bold text-sm">{item}</span>
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                        active ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300 bg-zinc-50'
                      }`}>
                        {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2: DIET */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 mb-2">
                  <Heart className="w-3.5 h-3.5 text-emerald-600" />
                  Ernährungsform
                </span>
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                  Wie ernährst du dich?
                </h1>
                <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                  Damit warnt Goodies dich sofort, wenn ein Produkt nicht zu deiner Lebensweise passt.
                </p>
              </div>

              <div className="space-y-2.5">
                {diets.map((d) => {
                  const active = selectedDiet === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setSelectedDiet(d.value)}
                      className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        active 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-1 ring-emerald-500/20' 
                          : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-sm text-zinc-900">{d.label}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{d.desc}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300'
                      }`}>
                        {active && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 3: EXCLUSION LIST */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 mb-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  Ausschlussliste
                </span>
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                  Gibt es Zutaten, vor denen du gewarnt werden möchtest?
                </h1>
                <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                  Goodies kennzeichnet diese Stoffe beim Barcode-Scan sofort rot.
                </p>
              </div>

              {/* Selected tags */}
              {excludedIngredients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-3 bg-rose-50/60 rounded-2xl border border-rose-100">
                  {excludedIngredients.map((item) => (
                    <span 
                      key={item}
                      className="inline-flex items-center gap-1.5 bg-white text-rose-700 border border-rose-200 font-bold text-xs px-3 py-1 rounded-xl shadow-xs"
                    >
                      <span>{item}</span>
                      <button 
                        type="button" 
                        onClick={() => toggleExclusion(item)}
                        className="hover:text-rose-900"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Custom input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Eigene Zutat (z. B. Hefeextrakt)..."
                  value={customExcludedInput}
                  onChange={(e) => setCustomExcludedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomExclusion())}
                  className="flex-1 bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={addCustomExclusion}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs px-3.5 rounded-xl flex items-center gap-1 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Hinzufügen</span>
                </button>
              </div>

              {/* Suggested items */}
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  Beliebte Ausschlüsse zum Antippen:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {commonExclusions.map((item) => {
                    const active = excludedIngredients.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleExclusion(item)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                          active 
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm' 
                            : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        {active ? `✓ ${item}` : `+ ${item}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: METRICS FOR DAILY GOALS */}
          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 mb-2">
                  <Scale className="w-3.5 h-3.5 text-blue-600" />
                  Körper & Tagesziele
                </span>
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                  Deine Daten für präzise Tagesziele
                </h1>
                <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                  Goodies berechnet daraus deinen optimalen Kalorien-, Protein- und Wasserbedarf.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-sm">
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">Geschlecht</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800"
                  >
                    <option value="female">Weiblich</option>
                    <option value="male">Männlich</option>
                    <option value="other">Divers / Neutral</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">Alter</label>
                  <input
                    type="number"
                    min="14"
                    max="100"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">Größe (cm)</label>
                  <input
                    type="number"
                    min="120"
                    max="220"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">Gewicht (kg)</label>
                  <input
                    type="number"
                    min="35"
                    max="200"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">Aktivitätsniveau im Alltag</label>
                  <select
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800"
                  >
                    <option value="sedentary">Sitzend (Bürojob, wenig Bewegung)</option>
                    <option value="light">Leicht aktiv (1-2x Sport / Spaziergänge)</option>
                    <option value="moderate">Mäßig aktiv (3-4x Training / stehende Tätigkeit)</option>
                    <option value="active">Sehr aktiv (5+ Trainingseinheiten / anstrengend)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">Hauptziel</label>
                  <select
                    value={healthGoal}
                    onChange={(e) => setHealthGoal(e.target.value as HealthGoal)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800"
                  >
                    <option value="healthy_eating">Gesünder & bewusster ernähren</option>
                    <option value="maintain">Gewicht halten & Energie steigern</option>
                    <option value="lose_weight">Gesund abnehmen</option>
                    <option value="build_muscle">Muskelaufbau & High Protein</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: SUMMARY & READY */}
          {step === 5 && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <Sparkles className="w-8 h-8 text-emerald-600" />
              </div>

              <div>
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                  Dein Goodies Profil ist bereit!
                </h1>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Alle Empfehlungen, Scans und Tageswerte sind jetzt maßgeschneidert auf dich abgestimmt.
                </p>
              </div>

              {/* Calculated Targets Overview Card */}
              <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm text-left space-y-3.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                  Berechnete Tagesempfehlungen:
                </span>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100">
                    <Flame className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                    <div className="text-base font-black text-amber-900">{calculatedTargets.calories}</div>
                    <div className="text-[10px] font-bold text-amber-700">kcal / Tag</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                    <Check className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <div className="text-base font-black text-emerald-900">{calculatedTargets.protein}g</div>
                    <div className="text-[10px] font-bold text-emerald-700">Protein min.</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-cyan-50/70 border border-cyan-100">
                    <Droplet className="w-4 h-4 text-cyan-600 mx-auto mb-1" />
                    <div className="text-base font-black text-cyan-900">{(calculatedTargets.water / 1000).toFixed(1)}L</div>
                    <div className="text-[10px] font-bold text-cyan-700">Wasser</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 text-xs text-zinc-600 flex items-center justify-between">
                  <span>Ernährungsform:</span>
                  <span className="font-extrabold text-zinc-900">{selectedDiet}</span>
                </div>
                <div className="text-xs text-zinc-600 flex items-center justify-between">
                  <span>Aktive Ausschlüsse:</span>
                  <span className="font-extrabold text-rose-600">{excludedIngredients.length} Stoffe</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation Buttons */}
      <div className="pt-6 flex items-center justify-between gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(prev => prev - 1)}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </button>
        ) : (
          <div />
        )}

        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep(prev => prev + 1)}
            className="flex-1 max-w-[200px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3.5 px-5 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span>Weiter</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-4 px-6 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Goodies starten</span>
          </button>
        )}
      </div>
    </div>
  );
}
