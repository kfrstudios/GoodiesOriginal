import { useState } from 'react';
import { 
  X, 
  Check, 
  Crown, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  ListTodo,
  History,
  Scale,
  UtensilsCrossed,
  ScanLine
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export function ProModal() {
  const { 
    closePaywall, 
    paywallContext, 
    effectiveTier,
    openCheckout,
    setActiveView 
  } = useApp();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  // Context-specific messaging
  const getContextInfo = () => {
    switch (paywallContext) {
      case 'scans':
        return {
          icon: <ScanLine className="w-6 h-6 text-amber-600" />,
          badge: 'Tageskontingent erreicht (5/5)',
          title: 'Unbegrenzt Lebensmittel scannen',
          desc: 'Du hast deine 5 kostenlosen Scans für heute aufgebraucht. Mit Goodies PRO scannst du jeden Tag so viel du möchtest – ohne Limits.'
        };
      case 'lists':
        return {
          icon: <ListTodo className="w-6 h-6 text-emerald-600" />,
          badge: 'Free Limit: 1 Liste',
          title: 'Unbegrenzt viele Einkaufslisten',
          desc: 'Im Free-Plan ist 1 Einkaufsliste enthalten. Mit PRO erstellst du beliebig viele Listen für Supermarkt, Bio-Laden, Drogerie oder Rezepte.'
        };
      case 'history':
        return {
          icon: <History className="w-6 h-6 text-blue-600" />,
          badge: 'Free Limit: 20 Produkte',
          title: 'Lückenloser Scan-Verlauf',
          desc: 'Dein kostenloser Verlauf speichert die letzten 20 Produkte. Mit PRO behältst du all deine gescannten Produkte dauerhaft im Blick.'
        };
      case 'personal_match':
        return {
          icon: <Sparkles className="w-6 h-6 text-purple-600" />,
          badge: 'PRO Feature',
          title: 'Persönlicher Goodies Match %',
          desc: 'Erfahre für jedes Lebensmittel sofort, wie gut es mit deinen Allergien, deiner Ernährungsform und deinen Nährstoffzielen harmoniert.'
        };
      case 'alternatives':
        return {
          icon: <Scale className="w-6 h-6 text-emerald-600" />,
          badge: 'PRO Feature',
          title: 'Alle gesünderen Alternativen',
          desc: 'Entdecke für jedes Produkt die besten ernährungsphysiologischen Alternativen mit höherem Goodies-Score und weniger Zusatzstoffen.'
        };
      case 'meal_log':
        return {
          icon: <UtensilsCrossed className="w-6 h-6 text-amber-600" />,
          badge: 'PRO Feature',
          title: 'Mahlzeiten- & Kalorientracker',
          desc: 'Tracke gescannte Lebensmittel direkt in dein Tagesprotokoll mit automatischer Nährwertberechnung und Makro-Verteilung.'
        };
      default:
        return {
          icon: <Crown className="w-6 h-6 text-amber-600" />,
          badge: 'Goodies PRO Mitgliedschaft',
          title: 'Das Beste für deine Ernährung',
          desc: 'Erhalte unbegrenzte Scans, deinen persönlichen Goodies Match, alle Alternativen und den vollen Mahlzeitentracker.'
        };
    }
  };

  const contextInfo = getContextInfo();

  const handleOpenCheckout = () => {
    closePaywall();
    openCheckout({ plan: billingCycle, context: paywallContext });
  };

  const handleClose = () => {
    closePaywall();
    setActiveView('home');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-zinc-200 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0">
              {contextInfo.icon}
            </div>
            <div>
              <span className="inline-block text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full mb-1">
                {contextInfo.badge}
              </span>
              <h2 className="text-base font-extrabold text-zinc-900 leading-tight">
                {contextInfo.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed">
          {contextInfo.desc}
        </p>

        {/* Pricing Selection */}
        <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
              billingCycle === 'annual'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span className="block font-extrabold">Jahres-Abo</span>
            <span className="text-[10px] text-emerald-600 font-bold">29,99 € / Jahr</span>
          </button>

          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
              billingCycle === 'monthly'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span className="block font-extrabold">Monats-Abo</span>
            <span className="text-[10px] text-zinc-500">3,99 € / Monat</span>
          </button>
        </div>

        {/* Features Comparison */}
        <div className="space-y-2 pt-1 border-t border-zinc-100">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
            Vergleich: Free vs. PRO
          </span>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Tägliche Scans</span>
              <div className="flex items-center gap-3 font-semibold text-right">
                <span className="text-zinc-400 line-through text-[11px]">5 / Tag</span>
                <span className="text-emerald-700 font-bold">Unbegrenzt</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Einkaufslisten</span>
              <div className="flex items-center gap-3 font-semibold text-right">
                <span className="text-zinc-400 line-through text-[11px]">1 Liste</span>
                <span className="text-emerald-700 font-bold">Unbegrenzt</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Scan-Verlauf</span>
              <div className="flex items-center gap-3 font-semibold text-right">
                <span className="text-zinc-400 line-through text-[11px]">20 Produkte</span>
                <span className="text-emerald-700 font-bold">Unbegrenzt</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Persönlicher Match %</span>
              <div className="flex items-center gap-3 font-semibold text-right">
                <span className="text-zinc-400 text-[11px]">Gesperrt</span>
                <span className="text-emerald-700 font-bold">Vollständig</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Mahlzeitentracker & Makros</span>
              <div className="flex items-center gap-3 font-semibold text-right">
                <span className="text-zinc-400 text-[11px]">Gesperrt</span>
                <span className="text-emerald-700 font-bold">Freigeschaltet</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          {effectiveTier === 'PRO' ? (
            <div className="bg-amber-50 rounded-2xl p-3 text-center border border-amber-200/80">
              <span className="text-xs font-bold text-amber-900">
                ✨ Du hast aktuell Goodies PRO aktiviert.
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleOpenCheckout}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-amber-950 font-black text-xs py-3.5 px-4 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Crown className="w-4 h-4 text-amber-950 fill-amber-950" />
              <span>Jetzt PRO abonnieren ({billingCycle === 'annual' ? '29,99 € / Jahr' : '3,99 € / Monat'})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sichere Kasse • Jederzeit kündbar • Keine Mindestlaufzeit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
