import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Crown, 
  Sparkles, 
  Check, 
  ScanLine, 
  ListChecks, 
  History, 
  ShieldCheck, 
  ArrowRight,
  CreditCard,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FREE_LIMITS } from '../services/entitlements';
import { ProBadge, ProButton, ProSymbol } from './pro/ProDesignSystem';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPaywall: () => void;
}

export function SubscriptionModal({ isOpen, onClose, onOpenPaywall }: SubscriptionModalProps) {
  const { user, openCheckout } = useApp();

  if (!isOpen) return null;

  const isPro = user.subscriptionTier === 'PRO' || Boolean(user.isPro);
  const scanCountToday = user.dailyScanCount || 0;
  const scansLimit = FREE_LIMITS.dailyScans;
  const scansPercent = Math.min(100, Math.round((scanCountToday / scansLimit) * 100));

  const handleSubscribeClick = () => {
    onClose();
    openCheckout({ plan: 'annual' });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isPro ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isPro ? (
                  <ProSymbol size="md" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-900">
                  Dein Goodies Abo
                </h3>
                <p className="text-xs text-zinc-500">
                  Status & enthaltene Funktionen
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors"
              aria-label="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Status Card */}
          <div className={`p-4 rounded-2xl border ${
            isPro 
              ? 'bg-amber-50/70 border-amber-200/80 text-amber-950' 
              : 'bg-zinc-50 border-zinc-200/80 text-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider">
                  Aktiver Plan:
                </span>
                {isPro ? (
                  <ProBadge size="sm" label="Goodies PRO" variant="gold" />
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-zinc-200 text-zinc-700">
                    Goodies FREE
                  </span>
                )}
              </div>
            </div>

            {isPro ? (
              <p className="text-xs text-amber-900 mt-2 leading-relaxed">
                Dein Account verfügt über alle PRO-Vorteile. Unbegrenzte Scans, persönlicher Match %, lückenloser Verlauf und erweiterter Mahlzeitentracker sind aktiv.
              </p>
            ) : (
              <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
                Du nutzt die kostenlose Basisversion mit 5 Scans pro Tag, 1 Einkaufsliste und Basisfunktionen.
              </p>
            )}
          </div>

          {/* Usage Stats (for Free tier) */}
          {!isPro && (
            <div className="bg-zinc-50/70 rounded-2xl p-4 border border-zinc-200/70 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700">
                <span className="flex items-center gap-1.5">
                  <ScanLine className="w-3.5 h-3.5 text-zinc-500" />
                  Heutige Scans
                </span>
                <span className="font-mono">{scanCountToday} / {scansLimit}</span>
              </div>
              <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    scansPercent >= 100 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${scansPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Feature List */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 block">
              Feature-Übersicht
            </span>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50">
                <span className="font-medium text-zinc-700">Tägliche Scans</span>
                <span className="font-bold text-zinc-900">{isPro ? 'Unbegrenzt' : '5 / Tag'}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50">
                <span className="font-medium text-zinc-700">Einkaufslisten</span>
                <span className="font-bold text-zinc-900">{isPro ? 'Unbegrenzt' : '1 Liste'}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50">
                <span className="font-medium text-zinc-700">Scan-Verlauf</span>
                <span className="font-bold text-zinc-900">{isPro ? 'Unbegrenzt' : 'Max. 20 Produkte'}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50">
                <span className="font-medium text-zinc-700">Mahlzeiten- & Makrotracker</span>
                <span className={`font-bold ${isPro ? 'text-emerald-600' : 'text-zinc-400'}`}>
                  {isPro ? 'Freigeschaltet' : 'Nur mit PRO'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50">
                <span className="font-medium text-zinc-700">Persönlicher Match & KI</span>
                <span className={`font-bold ${isPro ? 'text-emerald-600' : 'text-zinc-400'}`}>
                  {isPro ? 'Aktiviert' : 'Nur mit PRO'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            {!isPro ? (
              <ProButton
                onClick={handleSubscribeClick}
                fullWidth
                size="md"
              >
                Jetzt Goodies PRO abonnieren
              </ProButton>
            ) : (
              <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-200 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-700">
                  <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Abonnement aktiv</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Verwaltung und Abrechnung erfolgen über den jeweiligen Zahlungsanbieter oder die zentrale Nutzerdatenbank.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
