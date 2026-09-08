import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Crown, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PAYWALL_CONTEXT_MAP } from '../services/entitlements';
import { PaywallContext } from '../types';
import { ProSymbol, ProBadge, ProButton } from './pro/ProDesignSystem';

interface ProPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: PaywallContext;
}

export function ProPaywallModal({ isOpen, onClose, context = 'general' }: ProPaywallModalProps) {
  const { openCheckout } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const contextData = PAYWALL_CONTEXT_MAP[context] || PAYWALL_CONTEXT_MAP.general;

  const coreBenefits = [
    { title: 'Unbegrenzte Barcode-Scans', desc: 'Prüfe beliebig viele Produkte im Supermarkt ohne Tageslimit.' },
    { title: 'Persönlicher Goodies Match', desc: 'Maßgeschneidert auf deine Ernährungsform, Allergien & Ziele.' },
    { title: 'Intelligente Listenanalyse', desc: 'Gesamtanalyse deines Einkaufs mit Nährwert-Check & Alternativen.' },
    { title: 'Mahlzeiten & Makro-Tracking', desc: 'Erfasse Frühstück, Mittag, Abendessen & Snacks mit Kalorienbilanz.' },
    { title: 'Ausschlussliste & E-Nummern', desc: 'Sofortige Warnung bei unerwünschten Zutaten & kritischen Stoffen.' },
    { title: 'Wochenanalyse & KI-Erklärungen', desc: 'Fundierte Ernährungstrends und klare Begründungen für deinen Körper.' },
  ];

  const handleProceedToCheckout = () => {
    onClose();
    openCheckout({ plan: billingCycle, context });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Card / Bottom Sheet */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200/80 shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto z-10"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <ProSymbol size="lg" />

              <div>
                <div className="flex items-center gap-2">
                  <ProBadge size="xs" label={contextData.badge} variant="gold" />
                </div>
                <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight mt-0.5">
                  {contextData.title}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors shrink-0"
              aria-label="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Context-Specific Banner */}
          <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/50 border border-amber-200/80 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{contextData.subtitle}</span>
            </div>
            <p className="text-xs text-amber-950/90 leading-relaxed">
              {contextData.specificMessage}
            </p>
          </div>

          {/* Pricing Options */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
                Wähle dein Abonnement:
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Annual Plan */}
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`relative p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  billingCycle === 'annual'
                    ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                    : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.2 rounded-full tracking-wide">
                  37% Ersparnis
                </span>
                <div>
                  <span className="text-xs font-extrabold text-zinc-900 block">Jahres-Abo</span>
                  <span className="text-sm font-black text-amber-900 block mt-0.5">29,99 €</span>
                  <span className="text-[10px] text-zinc-500 block">pro Jahr (~2,50 € / Mo.)</span>
                </div>
              </button>

              {/* Monthly Plan */}
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  billingCycle === 'monthly'
                    ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                    : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <div>
                  <span className="text-xs font-extrabold text-zinc-900 block">Monats-Abo</span>
                  <span className="text-sm font-black text-zinc-900 block mt-0.5">3,99 €</span>
                  <span className="text-[10px] text-zinc-500 block">pro Monat flexibel</span>
                </div>
              </button>
            </div>
          </div>

          {/* All PRO Features List */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 block">
              Alle Vorteile von Goodies PRO:
            </span>

            <div className="grid grid-cols-1 gap-1.5">
              {coreBenefits.map((b, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2 rounded-xl bg-zinc-50/70 border border-zinc-100"
                >
                  <div className="w-5 h-5 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">{b.title}</h4>
                    <p className="text-[11px] text-zinc-500 leading-snug">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Action Button -> Opens Checkout Modal */}
          <div className="pt-2 space-y-2">
            <ProButton
              onClick={handleProceedToCheckout}
              fullWidth
              size="lg"
            >
              Jetzt Pro abonnieren ({billingCycle === 'annual' ? '29,99 € / Jahr' : '3,99 € / Monat'})
            </ProButton>

            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sicherer Zahlungsdialog • Jederzeit kündbar • Keine versteckten Kosten</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
