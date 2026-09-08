import { useState, FormEvent } from 'react';
import { 
  Crown, 
  Shield, 
  Check, 
  Plus,
  X,
  Target,
  LogOut,
  Trash2,
  AlertCircle,
  Ban,
  Sliders,
  Sun,
  Moon,
  Monitor,
  AlertTriangle,
  Pencil
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DietType } from '../types';
import { ProBadge, ProButton } from '../components/pro/ProDesignSystem';
import { CleanNumberInput } from '../components/CleanNumberInput';
import { ReportModal } from '../components/ReportModal';

export function ProfileView() {
  const { 
    user, 
    updateUserProfile, 
    openAboModal,
    openCheckout,
    setActiveView, 
    showToast,
    logout,
    deleteAccount,
    isAdmin,
    theme,
    setTheme,
    addReport
  } = useApp();

  const [diet, setDiet] = useState<DietType>(user.diet || 'Allesesser');
  const [allergies, setAllergies] = useState<string[]>(user.allergies);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>(user.excludedIngredients || []);
  const [customExcluded, setCustomExcluded] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Display name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user.displayName || user.name || '');

  // Bug & Issue reporting
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleSaveName = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    updateUserProfile({ displayName: trimmed, name: trimmed });
    setIsEditingName(false);
    showToast('Anzeigename geändert');
  };

  // Daily goals state
  const [caloriesGoal, setCaloriesGoal] = useState<number>(user.dailyGoals.calories);
  const [proteinGoal, setProteinGoal] = useState<number>(user.dailyGoals.protein);
  const [carbsGoal, setCarbsGoal] = useState<number>(user.dailyGoals.carbs || 230);
  const [fatGoal, setFatGoal] = useState<number>(user.dailyGoals.fat || 65);
  const [waterGoal, setWaterGoal] = useState<number>(user.dailyGoals.water);
  const [maxSugarGoal, setMaxSugarGoal] = useState<number>(user.dailyGoals.maxSugar || 35);
  const [maxSaltGoal, setMaxSaltGoal] = useState<number>(user.dailyGoals.maxSalt || 5);

  const availableDiets: DietType[] = ['Allesesser', 'Vegetarisch', 'Vegan', 'Pescetarisch', 'Low Carb'];
  
  const commonAllergens = [
    'Milch (Laktose)',
    'Weizen (Gluten)',
    'Soja',
    'Nüsse',
    'Erdnüsse',
    'Eier',
    'Fisch',
    'Krebstiere',
    'Sellerie',
    'Senf',
    'Sesam'
  ];

  const suggestedExclusions = [
    'Palmöl',
    'Schweinefleisch',
    'Gelatine',
    'Künstliche Süßstoffe',
    'Aspartam',
    'Farbstoffe',
    'Konservierungsstoffe',
    'Glukose-Fruktose-Sirup',
    'Koffein',
    'Alkohol'
  ];

  const handleDietChange = (newDiet: DietType) => {
    setDiet(newDiet);
    updateUserProfile({ diet: newDiet });
    showToast(`Ernährungsform auf „${newDiet}“ gesetzt`);
  };

  const toggleAllergen = (item: string) => {
    const next = allergies.includes(item)
      ? allergies.filter(a => a !== item)
      : [...allergies, item];
    setAllergies(next);
    updateUserProfile({ allergies: next });
  };

  const toggleExcluded = (item: string) => {
    const next = excludedIngredients.includes(item)
      ? excludedIngredients.filter(i => i !== item)
      : [...excludedIngredients, item];
    setExcludedIngredients(next);
    updateUserProfile({ excludedIngredients: next });
  };

  const handleAddCustomExcluded = (e: FormEvent) => {
    e.preventDefault();
    const clean = customExcluded.trim();
    if (!clean) return;
    if (excludedIngredients.includes(clean)) {
      setCustomExcluded('');
      return;
    }
    const next = [...excludedIngredients, clean];
    setExcludedIngredients(next);
    updateUserProfile({ excludedIngredients: next });
    setCustomExcluded('');
    showToast(`„${clean}“ zur Ausschlussliste hinzugefügt`);
  };

  const removeExcluded = (item: string) => {
    const next = excludedIngredients.filter(i => i !== item);
    setExcludedIngredients(next);
    updateUserProfile({ excludedIngredients: next });
  };

  const handleSaveGoals = (e: FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      dailyGoals: {
        calories: caloriesGoal,
        protein: proteinGoal,
        carbs: carbsGoal,
        fat: fatGoal,
        water: waterGoal,
        maxSugar: maxSugarGoal,
        maxSalt: maxSaltGoal,
      }
    });
    showToast('Ernährungsziele erfolgreich gespeichert');
  };

  return (
    <div className="space-y-5 pb-28 max-w-2xl mx-auto px-4 pt-2">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">
          Profil & Ernährungsziele
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Passe deinen persönlichen Goodies Match, Ausschlusskriterien und Nährwertlimits an.
        </p>
      </div>

      {/* User Header Card */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 text-xl font-black shrink-0">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || user.name} className="w-full h-full rounded-2xl object-cover" referrerPolicy="no-referrer" />
            ) : (
              (user.displayName || user.name || user.email || 'G').charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-1.5 py-0.5">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Anzeigename eingeben..."
                  autoFocus
                  className="bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1 text-xs font-bold text-zinc-900 focus:outline-none focus:border-emerald-500 max-w-[170px]"
                />
                <button
                  type="submit"
                  className="p-1.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="Speichern"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(user.displayName || user.name || '');
                    setIsEditingName(false);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg transition-colors cursor-pointer"
                  title="Abbrechen"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-base text-zinc-900 truncate">
                  {user.displayName || user.name}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(user.displayName || user.name || '');
                    setIsEditingName(true);
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                  title="Anzeigenamen ändern"
                  aria-label="Anzeigenamen ändern"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {user.isPro || user.subscriptionTier === 'PRO' ? (
                  <ProBadge size="xs" label="PRO" variant="gold" />
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                    Free
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{user.email || 'Keine E-Mail'}</p>
            {user.authProvider && (
              <span className="inline-block text-[10px] text-zinc-400 font-semibold mt-0.5">
                Angemeldet via {user.authProvider === 'google.com' ? 'Google' : user.authProvider === 'apple.com' ? 'Apple' : 'E-Mail & Passwort'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Grey warning icon for bug reporting */}
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
            title="Problem oder Bug melden"
            aria-label="Problem oder Bug melden"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>

          {user.isPro || user.subscriptionTier === 'PRO' ? (
            <button
              type="button"
              onClick={openAboModal}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors text-zinc-700"
            >
              Plan verwalten
            </button>
          ) : (
            <ProButton
              size="sm"
              onClick={() => openCheckout({ plan: 'annual' })}
            >
              Pro abonnieren
            </ProButton>
          )}
        </div>
      </div>

      {/* Theme Switcher */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
            Erscheinungsbild
          </h3>
          <span className="text-[11px] font-bold text-zinc-600 bg-zinc-100 px-2.5 py-0.5 rounded-full">
            {theme === 'dark' ? 'Dunkelmodus' : theme === 'light' ? 'Hellmodus' : 'Automatisch (System)'}
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          Wähle zwischen hellem und dunklem Design oder passe die Ansicht automatisch an dein Betriebssystem an.
        </p>

        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              showToast('Hellmodus aktiviert');
            }}
            className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-2 ${
              theme === 'light'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${theme === 'light' ? 'bg-amber-100 text-amber-600' : 'bg-zinc-200 text-zinc-500'}`}>
              <Sun className="w-4 h-4" />
            </div>
            <span>Hell</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              showToast('Dunkelmodus aktiviert');
            }}
            className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-2 ${
              theme === 'dark'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-indigo-100 text-indigo-600' : 'bg-zinc-200 text-zinc-500'}`}>
              <Moon className="w-4 h-4" />
            </div>
            <span>Dunkel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('system');
              showToast('Systemdesign aktiviert');
            }}
            className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-2 ${
              theme === 'system'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${theme === 'system' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-500'}`}>
              <Monitor className="w-4 h-4" />
            </div>
            <span>System</span>
          </button>
        </div>
      </div>

      {/* Diet Selection */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
            Ernährungsform
          </h3>
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
            Aktiv: {diet}
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          Bestimmt die Einstufung und Eignung gescannter Lebensmittel.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {availableDiets.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDietChange(d)}
              className={`p-3 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                diet === d
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <span>{d}</span>
              {diet === d && <Check className="w-4 h-4 text-emerald-600" />}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* AUSSCHLUSSLISTE (Zutaten, Stoffe & Unerwünschtes) */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Ban className="w-4 h-4 text-rose-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-800">
              Ausschlussliste (Zutaten & Stoffe)
            </h3>
          </div>
          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
            {excludedIngredients.length} aktiv
          </span>
        </div>

        <p className="text-xs text-zinc-500">
          Produkte, die diese Stoffe enthalten, lösen beim Scannen eine direkte Warnung aus und erhalten Punktabzug.
        </p>

        {/* Active Excluded Tags */}
        {excludedIngredients.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2.5 bg-rose-50/50 rounded-2xl border border-rose-100">
            {excludedIngredients.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 bg-white text-rose-700 border border-rose-200 font-bold text-xs px-2.5 py-1 rounded-xl shadow-xs"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => removeExcluded(item)}
                  className="hover:text-rose-900 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add custom tag */}
        <form onSubmit={handleAddCustomExcluded} className="flex gap-2">
          <input
            type="text"
            placeholder="Eigenen Ausschluss hinzufügen (z. B. Hefeextrakt, Gelatine)..."
            value={customExcluded}
            onChange={(e) => setCustomExcluded(e.target.value)}
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-rose-400"
          />
          <button
            type="submit"
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 rounded-xl flex items-center gap-1 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Hinzufügen</span>
          </button>
        </form>

        {/* Suggested Exclusions */}
        <div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Häufige Ausschlüsse zur Auswahl:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {suggestedExclusions.map((item) => {
              const active = excludedIngredients.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleExcluded(item)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-xl border transition-all ${
                    active
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {active ? `✓ ${item}` : `+ ${item}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Allergies & Intolerances */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
          Allergene & Unverträglichkeiten
        </h3>
        <p className="text-xs text-zinc-500">
          Gesetzlich kennzeichnungspflichtige Allergene, auf die du strikt reagierst.
        </p>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {commonAllergens.map((alg) => {
            const active = allergies.includes(alg);
            return (
              <button
                key={alg}
                type="button"
                onClick={() => toggleAllergen(alg)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                  active
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {alg}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* SPEZIFISCHE ERNÄHRUNGSZIELE & GRENZWERTE */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-800">
              Ernährungsziele & Tageslimits
            </h3>
          </div>
          <Sliders className="w-4 h-4 text-zinc-400" />
        </div>

        <p className="text-xs text-zinc-500">
          Diese Werte steuern deinen Tracker und fließen in die Bewertung von Zucker- und Salzgehalten ein.
        </p>

        <form onSubmit={handleSaveGoals} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                Kalorienziel (kcal/Tag)
              </label>
              <CleanNumberInput
                value={caloriesGoal}
                onChange={setCaloriesGoal}
                min={0}
                step={50}
                placeholder="2000"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                Mindest-Protein (g/Tag)
              </label>
              <CleanNumberInput
                value={proteinGoal}
                onChange={setProteinGoal}
                min={0}
                step={5}
                placeholder="60"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                Wasserziel (ml/Tag)
              </label>
              <CleanNumberInput
                value={waterGoal}
                onChange={setWaterGoal}
                min={0}
                step={250}
                placeholder="2000"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Zucker-Limit */}
            <div>
              <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                Max. Zucker (g/Tag) ⚠️
              </label>
              <CleanNumberInput
                value={maxSugarGoal}
                onChange={setMaxSugarGoal}
                min={0}
                step={1}
                placeholder="35"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-amber-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Salz-Limit */}
            <div>
              <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                Max. Salz (g/Tag) ⚠️
              </label>
              <CleanNumberInput
                value={maxSaltGoal}
                onChange={setMaxSaltGoal}
                min={0}
                step={0.5}
                placeholder="5"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                Kohlenhydrate (g/Tag)
              </label>
              <CleanNumberInput
                value={carbsGoal}
                onChange={setCarbsGoal}
                min={0}
                step={10}
                placeholder="230"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-2xl shadow-sm transition-all active:scale-95"
          >
            Alle Ziele speichern
          </button>
        </form>
      </div>

      {/* Problem oder Bug in der App melden */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
            <AlertTriangle className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-800">
              Problem oder Bug melden
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Etwas funktioniert nicht wie erwartet? Lass es uns wissen.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="text-xs font-bold px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
          <span>Melden</span>
        </button>
      </div>

      {/* Account Management & Security */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
          Benutzerkonto & Sitzung
        </h3>
        <p className="text-xs text-zinc-500">
          Verwalte deine aktuelle Anmeldung und deine privaten Daten.
        </p>

        <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={logout}
            className="flex-1 py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-95"
          >
            <LogOut className="w-4 h-4 text-zinc-600" />
            <span>Abmelden</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-rose-200/80 active:scale-95"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Konto löschen</span>
          </button>
        </div>
      </div>

      {/* Admin Hub Link - Only visible to Admins */}
      {isAdmin && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setActiveView('admin')}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-3.5 rounded-2xl border border-zinc-800 flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Admin Goodies Hub (Nutzerverwaltung & Datenbank)</span>
          </button>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-zinc-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">Konto wirklich löschen?</h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Diese Aktion kann nicht rückgängig gemacht werden. Dein Benutzerprofil, deine Einkaufslisten, Favoriten und dein gesamter Scan-Verlauf werden dauerhaft gelöscht.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-2xl border border-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteAccount();
                  } finally {
                    setIsDeleting(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Löschen...' : 'Endgültig löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bug & Problem Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        type="bug"
        onSubmit={async (data) => {
          await addReport(data);
        }}
      />
    </div>
  );
}
