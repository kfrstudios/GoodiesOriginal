import React, { useState } from 'react';
import { AlertTriangle, X, Send, CheckCircle2, Bug, Package } from 'lucide-react';
import { Product } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'product' | 'bug';
  product?: Product;
  onSubmit: (data: {
    type: 'product' | 'bug';
    reason: string;
    details: string;
    productId?: string;
    productName?: string;
    productBrand?: string;
    productBarcode?: string;
  }) => Promise<void> | void;
}

const PRODUCT_REASONS = [
  'Falsche Nährwertangaben',
  'Falsche Zutaten oder Allergene',
  'Falscher Goodies-Score / Nutri-Score',
  'Produkt existiert nicht mehr / Falsches Produkt',
  'Veraltetes oder falsches Produktbild',
  'Sonstige Unstimmigkeit'
];

const BUG_REASONS = [
  'Barcode-Scanner funktioniert nicht oder scannt nicht',
  'App stürzt ab oder friert ein',
  'Darstellungsfehler / Text abgeschnitten / Layout-Problem',
  'Synchronisierung / Datenverlust',
  'Konto- oder Anmeldeproblem',
  'Sonstiger App-Fehler'
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  type,
  product,
  onSubmit
}) => {
  const isProduct = type === 'product';
  const reasons = isProduct ? PRODUCT_REASONS : BUG_REASONS;

  const [selectedReason, setSelectedReason] = useState<string>(reasons[0]);
  const [details, setDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        reason: selectedReason,
        details: details.trim(),
        productId: product?.id,
        productName: product?.name,
        productBrand: product?.brand,
        productBarcode: product?.barcode
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setDetails('');
        onClose();
      }, 1400);
    } catch (err) {
      console.error('Error sending report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="bg-white dark:bg-[#171a20] w-full max-w-md rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
              isProduct ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600'
            }`}>
              {isProduct ? <Package className="w-5 h-5" /> : <Bug className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                {isProduct ? 'Produktanalyse melden' : 'Problem oder Bug melden'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {isProduct ? 'Hilf uns, fehlerhafte Produktdaten zu korrigieren.' : 'Melde einen App-Fehler direkt an das Goodies-Team.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product preview if reporting a product */}
        {isProduct && product && (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-5 h-5 text-zinc-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{product.name}</p>
              <p className="text-[10px] text-zinc-400 truncate">
                {product.brand} • Barcode: {product.barcode}
              </p>
            </div>
          </div>
        )}

        {isSuccess ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto animate-bounce" />
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Vielen Dank für deine Meldung!</p>
            <p className="text-[11px] text-zinc-400">Wir prüfen dein Feedback schnellstmöglich.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reason selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                Grund der Meldung *
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#13161b] border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                {reasons.map((r, idx) => (
                  <option key={idx} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional details */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <span>Zusätzliche Details (optional)</span>
                <span className="text-[10px] text-zinc-400 font-normal">{details.length}/300</span>
              </label>
              <textarea
                rows={3}
                maxLength={300}
                placeholder={
                  isProduct
                    ? 'z. B. "Der Zuckergehalt auf der Verpackung beträgt laut Tabelle 4,2g statt 12g."'
                    : 'z. B. "Beim Klick auf Wasser hinzufügen stürzt die Ansicht ab."'
                }
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#13161b] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isSubmitting ? (
                  <span>Wird gesendet...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Meldung senden</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
