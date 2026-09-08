import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Lock, 
  Crown, 
  Check, 
  CreditCard, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  Info,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Receipt
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PaywallContext } from '../types';

export type PaymentMethodType = 'card' | 'apple_google' | 'paypal' | 'sepa';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: 'monthly' | 'annual';
  sourceContext?: PaywallContext;
}

export function CheckoutModal({ 
  isOpen, 
  onClose, 
  defaultPlan = 'annual',
  sourceContext = 'general' 
}: CheckoutModalProps) {
  const { user } = useApp();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(defaultPlan);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');
  
  // Credit Card Form states (for preview UI)
  const [cardName, setCardName] = useState(user.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [sepaIban, setSepaIban] = useState('');

  // Processing & Simulation Dialog states
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmationNotice, setShowConfirmationNotice] = useState(false);

  if (!isOpen) return null;

  // Plan pricing
  const planDetails = billingCycle === 'annual' 
    ? {
        name: 'Goodies PRO Jahresabo',
        totalPrice: '29,99 €',
        netPrice: '25,20 €',
        tax: '4,79 €',
        pricePerMonth: '2,50 €',
        cycleLabel: 'pro Jahr',
        savingsLabel: '37% Ersparnis gegenüber Monatsabo',
        badge: 'Beliebteste Wahl'
      }
    : {
        name: 'Goodies PRO Monatsabo',
        totalPrice: '3,99 €',
        netPrice: '3,35 €',
        tax: '0,64 €',
        pricePerMonth: '3,99 €',
        cycleLabel: 'pro Monat',
        savingsLabel: 'Flexibel jeden Monat kündbar',
        badge: 'Maximale Flexibilität'
      };

  const handleCardNumberChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    const parts = clean.match(/[\s\S]{1,4}/g) || [];
    setCardNumber(parts.join(' '));
  };

  const handleExpiryChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 3) {
      setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
    } else {
      setCardExpiry(clean);
    }
  };

  const handleCvcChange = (val: string) => {
    setCardCvc(val.replace(/\D/g, '').slice(0, 4));
  };

  /**
   * Prepared Checkout Confirmation:
   * STRICT SECURITY DIRECTIVE:
   * This function NEVER modifies `user.subscriptionTier` or sets `isPro = true` in client state!
   * It presents the architecture preview informing that actual billing will be verified server-side.
   */
  const handleSubmitCheckout = () => {
    setIsProcessing(true);
    // Simulate secure hand-off to payment provider
    setTimeout(() => {
      setIsProcessing(false);
      setShowConfirmationNotice(true);
    }, 1200);
  };

  const handleCloseModal = () => {
    setShowConfirmationNotice(false);
    setIsProcessing(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCloseModal}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        />

        {/* Checkout Modal Window */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200/90 shadow-2xl overflow-hidden z-10 max-h-[94vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
                <Crown className="w-4 h-4 fill-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-extrabold text-zinc-900 tracking-tight">
                    Goodies PRO Checkout
                  </h3>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    <Lock className="w-2.5 h-2.5" />
                    256-Bit SSL
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Vorbereitete Kasse für zukünftige Zahlungsanbindung
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseModal}
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors"
              aria-label="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {showConfirmationNotice ? (
              /* Informational Notice Screen */
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 py-2"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200/80 flex items-center justify-center text-amber-800 mx-auto">
                  <Info className="w-7 h-7 text-amber-700" />
                </div>

                <div className="text-center space-y-1.5">
                  <h4 className="text-base font-black text-zinc-900">
                    Zahlungsdialog & Checkout-Bereitstellung
                  </h4>
                  <p className="text-xs text-zinc-600 max-w-md mx-auto leading-relaxed">
                    Diese Oberfläche bildet den vollständigen Checkout-Prozess für die spätere serverseitige Zahlungsanbindung (z. B. via Stripe Checkout / Webhooks) ab.
                  </p>
                </div>

                <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/80 space-y-2.5 text-xs text-zinc-700">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Keine Abbuchung:</strong> Im aktuellen Systemstand wurde noch keine echte Zahlung durchgeführt.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span><strong>Sichere Architektur:</strong> Der Pro-Status kann niemals clientseitig oder per UI vergeben werden. Dein Account bleibt auf <strong>FREE</strong>, bis ein autorisierter Server den Zahlungseingang bestätigt.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Crown className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Admin-Verwaltung:</strong> Zu Testzwecken kann ein Nutzer weiterhin im Admin-Hub oder direkt in der Datenbank auf PRO gesetzt werden.</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full bg-zinc-900 hover:bg-black text-white font-bold text-xs py-3.5 px-4 rounded-2xl transition-all shadow-md"
                >
                  Verstanden & Schließen
                </button>
              </motion.div>
            ) : (
              /* Regular Checkout Form */
              <>
                {/* 1. Subscription Plan Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-800 uppercase tracking-wider block">
                    1. Gewähltes Abonnement
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Annual Plan */}
                    <button
                      type="button"
                      onClick={() => setBillingCycle('annual')}
                      className={`relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        billingCycle === 'annual'
                          ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                          : 'bg-zinc-50/60 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="absolute -top-2.5 right-3 bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-xs">
                        37% Ersparnis
                      </span>

                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-zinc-900">Jahres-Abo</span>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            ~2,50 € / Mo.
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">29,99 € einmal jährlich</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-600 font-medium">Jederzeit kündbar</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          billingCycle === 'annual' ? 'border-amber-600 bg-amber-600 text-white' : 'border-zinc-300'
                        }`}>
                          {billingCycle === 'annual' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </button>

                    {/* Monthly Plan */}
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        billingCycle === 'monthly'
                          ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                          : 'bg-zinc-50/60 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-zinc-900">Monats-Abo</span>
                          <span className="text-[11px] font-bold text-zinc-700 bg-zinc-200/70 px-1.5 py-0.5 rounded">
                            Flexibel
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">3,99 € jeden Monat</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-600 font-medium">Monatlich kündbar</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          billingCycle === 'monthly' ? 'border-amber-600 bg-amber-600 text-white' : 'border-zinc-300'
                        }`}>
                          {billingCycle === 'monthly' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Included PRO Features List */}
                <div className="bg-zinc-50/80 rounded-2xl p-3.5 border border-zinc-200/70 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                    In deinem Pro-Abo enthalten:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-zinc-700">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      <span>Unbegrenzte Scans ohne Tageslimit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      <span>Persönlicher Goodies Match %</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      <span>Mahlzeitentracker mit Makros</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      <span>Alle gesunden Produktalternativen</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      <span>Lückenloser Scan-Verlauf</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      <span>Unbegrenzte Einkaufslisten</span>
                    </div>
                  </div>
                </div>

                {/* 3. Payment Method Selection */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-zinc-800 uppercase tracking-wider block">
                    2. Zahlungsmethode wählen
                  </label>

                  {/* Payment Tabs / Radio Options */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {/* Card */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        paymentMethod === 'card'
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="text-[11px] font-bold">Kreditkarte</span>
                    </button>

                    {/* Apple / Google Pay */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('apple_google')}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        paymentMethod === 'apple_google'
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <span className="text-sm font-black"> / G</span>
                      <span className="text-[11px] font-bold">Pay Wallet</span>
                    </button>

                    {/* PayPal */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paypal')}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        paymentMethod === 'paypal'
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <span className="text-xs font-black text-blue-500">PayPal</span>
                      <span className="text-[11px] font-bold">PayPal</span>
                    </button>

                    {/* SEPA */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('sepa')}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        paymentMethod === 'sepa'
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <Receipt className="w-4 h-4" />
                      <span className="text-[11px] font-bold">SEPA-Last</span>
                    </button>
                  </div>

                  {/* Payment Method Detail Box */}
                  <div className="bg-zinc-50/70 p-4 rounded-2xl border border-zinc-200/80 space-y-3">
                    {paymentMethod === 'card' && (
                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block mb-1">
                            Name auf der Karte
                          </label>
                          <input
                            type="text"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            placeholder="Max Mustermann"
                            className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block mb-1">
                            Kartennummer
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={cardNumber}
                              onChange={(e) => handleCardNumberChange(e.target.value)}
                              placeholder="4000 1234 5678 9010"
                              className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono text-zinc-800 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                            <CreditCard className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block mb-1">
                              Gültig bis (MM/JJ)
                            </label>
                            <input
                              type="text"
                              value={cardExpiry}
                              onChange={(e) => handleExpiryChange(e.target.value)}
                              placeholder="12/28"
                              className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block mb-1">
                              Sicherheitscode (CVC)
                            </label>
                            <input
                              type="password"
                              value={cardCvc}
                              onChange={(e) => handleCvcChange(e.target.value)}
                              placeholder="•••"
                              className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'apple_google' && (
                      <div className="text-center py-3 space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-200 rounded-full text-zinc-800 text-xs font-bold">
                          <span> Pay</span>
                          <span>•</span>
                          <span>G Pay</span>
                        </div>
                        <p className="text-xs text-zinc-600">
                          1-Klick-Zahlung über deine hinterlegte Wallet wird beim Abschließen aufgerufen.
                        </p>
                      </div>
                    )}

                    {paymentMethod === 'paypal' && (
                      <div className="text-center py-3 space-y-1.5">
                        <span className="text-base font-black text-blue-600">PayPal</span>
                        <p className="text-xs text-zinc-600">
                          Du wirst zur sicheren Autorisierung kurz zu PayPal weitergeleitet.
                        </p>
                      </div>
                    )}

                    {paymentMethod === 'sepa' && (
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block mb-1">
                            IBAN für Bankeinzug
                          </label>
                          <input
                            type="text"
                            value={sepaIban}
                            onChange={(e) => setSepaIban(e.target.value.toUpperCase())}
                            placeholder="DE89 3704 0044 0532 0130 00"
                            className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-snug">
                          Mit Klick auf Bestätigen ermächtigst du Goodies, Zahlungen von deinem Konto mittels Lastschrift einzuziehen.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Price Breakdown Summary */}
                <div className="border-t border-zinc-100 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-500">
                    <span>{planDetails.name} (Netto)</span>
                    <span className="font-mono">{planDetails.netPrice}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Inkl. 19% MwSt.</span>
                    <span className="font-mono">{planDetails.tax}</span>
                  </div>
                  <div className="flex justify-between text-zinc-900 font-extrabold text-sm pt-1 border-t border-zinc-100">
                    <span>Gesamtbetrag {planDetails.cycleLabel}</span>
                    <span className="text-amber-700 font-mono">{planDetails.totalPrice}</span>
                  </div>
                </div>

                {/* 5. Checkout Action Button */}
                <div className="pt-2 space-y-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    disabled={isProcessing}
                    onClick={handleSubmitCheckout}
                    className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-600 text-amber-950 font-black text-xs py-3.5 px-4 rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-950" />
                        <span>Sichere Verbindung zum Zahlungsanbieter...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Jetzt zahlungspflichtig abonnieren ({planDetails.totalPrice} {planDetails.cycleLabel})</span>
                      </>
                    )}
                  </motion.button>

                  <div className="flex items-center justify-center gap-3 text-[10px] text-zinc-400 font-medium pt-1">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Jederzeit mit 1 Klick kündbar
                    </span>
                    <span>•</span>
                    <span>Keine versteckten Gebühren</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
