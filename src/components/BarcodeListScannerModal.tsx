import { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import { 
  X, 
  ScanLine, 
  SwitchCamera, 
  Flashlight, 
  FlashlightOff, 
  Check, 
  Plus, 
  Search, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { useApp } from '../context/AppContext';
import { getProductByBarcode } from '../services/productService';
import { Product } from '../types';
import { playScanSound, triggerScanHaptic } from '../utils/audio';

interface BarcodeListScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  listTitle: string;
  initialQuery?: string; // Optional: if opened from "unbekanntes Produkt melden"
  existingItemId?: string; // If replacing/linking an existing list item
}

export function BarcodeListScannerModal({
  isOpen,
  onClose,
  listId,
  listTitle,
  initialQuery = '',
  existingItemId
}: BarcodeListScannerModalProps) {
  const { 
    products, 
    addShoppingItem, 
    updateShoppingItem, 
    submitUnknownBarcode, 
    showToast 
  } = useApp();

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Result states
  const [detectedProduct, setDetectedProduct] = useState<Product | null>(null);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState<string>(initialQuery ? `Eingegeben als: ${initialQuery}` : '');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const isMountedRef = useRef(true);

  // Initialize ZXing reader
  useEffect(() => {
    isMountedRef.current = true;
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      zxingReaderRef.current = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 150,
        delayBetweenScanSuccess: 500
      });
    } catch (err) {
      console.warn('ZXing init error in ListScanner:', err);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Process detected barcode
  const handleBarcodeDetected = useCallback(async (barcode: string) => {
    if (!barcode || isProcessing) return;
    const cleanCode = barcode.trim();
    if (cleanCode.length < 3) return;

    setIsProcessing(true);
    setIsScanning(false);
    playScanSound();
    triggerScanHaptic();

    try {
      const result = await getProductByBarcode(cleanCode);
      if (!isMountedRef.current) return;

      if (result && result.product) {
        setDetectedProduct(result.product);
        setUnknownBarcode(null);
      } else {
        setDetectedProduct(null);
        setUnknownBarcode(cleanCode);
      }
    } catch (err) {
      console.warn('Error querying product for barcode:', cleanCode, err);
      setDetectedProduct(null);
      setUnknownBarcode(cleanCode);
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [isProcessing]);

  // Start / Stop Camera Stream
  const startCamera = useCallback(async () => {
    if (!isOpen) return;

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError('Kamera wird in diesem Browser-Kontext nicht unterstützt.');
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Check torch capabilities
      const track = stream.getVideoTracks()[0];
      if (track) {
        const caps = track.getCapabilities ? (track.getCapabilities() as any) : {};
        setTorchSupported(Boolean(caps?.torch));
      }

      setHasCamera(true);
      setCameraError(null);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setHasCamera(false);
      setCameraError('Kamerazugriff verweigert oder keine Kamera verfügbar.');
    }
  }, [isOpen, facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Continuous decode loop using ZXing
  useEffect(() => {
    if (!isOpen || !isScanning || detectedProduct || unknownBarcode) {
      return;
    }

    let isDecoding = true;

    const decodeLoop = async () => {
      if (!isDecoding || !isScanning || !videoRef.current || !zxingReaderRef.current) return;

      try {
        if (videoRef.current.readyState >= 2) {
          const result = await zxingReaderRef.current.decode(videoRef.current);
          if (result && result.getText()) {
            handleBarcodeDetected(result.getText());
            return;
          }
        }
      } catch {
        // ZXing throws NotFoundException when no barcode is in view, which is expected
      }

      if (isDecoding && isScanning) {
        requestAnimationFrame(decodeLoop);
      }
    };

    const timer = setTimeout(() => {
      decodeLoop();
    }, 400);

    return () => {
      isDecoding = false;
      clearTimeout(timer);
    };
  }, [isOpen, isScanning, detectedProduct, unknownBarcode, handleBarcodeDetected]);

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsScanning(true);
      setDetectedProduct(null);
      setUnknownBarcode(null);
      setManualCode('');
      setReportSubmitted(false);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Action: Add recognized product directly to current shopping list
  const handleAddRecognizedProduct = () => {
    if (!detectedProduct) return;

    if (existingItemId) {
      // If we are replacing/linking an existing custom item with this recognized product
      updateShoppingItem(listId, existingItemId, {
        name: detectedProduct.name,
        productId: detectedProduct.id,
        amount: detectedProduct.quantity || '1x',
        calories: detectedProduct.nutritionPer100g.calories,
        isCustom: false
      });
      showToast(`„${detectedProduct.name}“ mit Datenbank verknüpft!`);
    } else {
      // Add as fresh recognized item
      addShoppingItem(
        listId,
        detectedProduct.name,
        detectedProduct.quantity || '1x',
        detectedProduct.id,
        detectedProduct.nutritionPer100g.calories,
        false
      );
      showToast(`„${detectedProduct.name}“ zur Einkaufsliste hinzugefügt!`);
    }

    onClose();
  };

  // Action: Submit unknown barcode report
  const handleReportUnknown = () => {
    if (!unknownBarcode) return;
    const notes = reportNote.trim() || (initialQuery ? `Eingegeben als: ${initialQuery}` : 'Aus Einkaufsliste gemeldet');
    submitUnknownBarcode(unknownBarcode, notes);
    setReportSubmitted(true);
    showToast(`Barcode ${unknownBarcode} zur Prüfung eingereicht!`);

    // If an initial item name was entered, also make sure it exists on the list
    if (initialQuery && !existingItemId) {
      addShoppingItem(listId, initialQuery, '1x', undefined, undefined, true);
    }

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Manual code submission
  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDetected(manualCode.trim());
  };

  const handleResetScan = () => {
    setDetectedProduct(null);
    setUnknownBarcode(null);
    setReportSubmitted(false);
    setIsScanning(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 leading-tight">
                Barcode scannen
              </h3>
              <p className="text-[11px] text-zinc-400">
                Für Liste: <span className="font-semibold text-zinc-600 truncate">{listTitle}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {hasCamera && (
              <>
                {torchSupported && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 rounded-xl border transition-colors ${
                      torchOn 
                        ? 'bg-amber-100 text-amber-800 border-amber-300' 
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                    }`}
                    title="Blitz / Taschenlampe"
                  >
                    {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="p-2 rounded-xl bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors"
                  title="Kamera wechseln"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors ml-1"
              title="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* CAMERA VIEWPORT */}
          {!detectedProduct && !unknownBarcode && (
            <div className="relative w-full aspect-4/3 bg-zinc-950 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />

              {/* Aiming Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="relative w-64 h-36 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  {/* Glowing Laser Scan Bar */}
                  <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_10px_#10b981] animate-pulse" style={{ top: '50%' }} />
                </div>
                <span className="text-[11px] font-semibold text-white/90 bg-black/60 px-3 py-1 rounded-full mt-3 backdrop-blur-xs">
                  Halte den Barcode in das Zielfeld
                </span>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-zinc-900/90 text-white p-5 flex flex-col items-center justify-center text-center space-y-2">
                  <AlertCircle className="w-7 h-7 text-amber-400" />
                  <p className="text-xs font-semibold">{cameraError}</p>
                  <p className="text-[11px] text-zinc-400 max-w-xs">
                    Du kannst Barcodes unten auch direkt manuell eingeben oder Testcodes auswählen.
                  </p>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-xs">
                  <div className="bg-white/95 px-4 py-2.5 rounded-2xl flex items-center gap-2.5 text-zinc-800 text-xs font-bold shadow-lg">
                    <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span>Produkt wird analysiert...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RECOGNIZED PRODUCT VIEW */}
          {detectedProduct && (
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-3xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Produkt erfolgreich erkannt!</span>
              </div>

              <div className="flex items-start gap-3.5 bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs">
                <img
                  src={detectedProduct.imageUrl}
                  alt={detectedProduct.name}
                  className="w-16 h-16 rounded-xl object-cover bg-zinc-100 shrink-0 border border-zinc-100"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                    {detectedProduct.brand} • {detectedProduct.quantity}
                  </span>
                  <h4 className="font-extrabold text-sm text-zinc-900 leading-tight truncate">
                    {detectedProduct.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Score: {detectedProduct.goodiesScore}/100
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-700">
                      Nutri {detectedProduct.nutriScore}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {detectedProduct.nutritionPer100g.calories} kcal / 100g
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button: Zur Liste hinzufügen */}
              <button
                type="button"
                onClick={handleAddRecognizedProduct}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/15"
              >
                <Plus className="w-4 h-4" />
                <span>Zur Liste hinzufügen</span>
              </button>

              <button
                type="button"
                onClick={handleResetScan}
                className="w-full text-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 py-1"
              >
                Anderen Barcode scannen
              </button>
            </div>
          )}

          {/* UNKNOWN BARCODE VIEW */}
          {unknownBarcode && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Produkt nicht in der Datenbank gefunden</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-100 space-y-2">
                <p className="text-xs text-zinc-700">
                  Der Barcode <code className="bg-zinc-100 px-2 py-0.5 rounded font-mono font-bold text-zinc-900">{unknownBarcode}</code> ist noch nicht im Goodies-Katalog erfasst.
                </p>
                <p className="text-[11px] text-zinc-500">
                  Du kannst diesen Barcode direkt zur Prüfung an die Entwickler übermitteln. Unser Team prüft und pflegt neue Produkte laufend ein.
                </p>
              </div>

              {reportSubmitted ? (
                <div className="p-3 bg-emerald-100/70 rounded-2xl border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>Barcode zur Prüfung eingereicht! Vielen Dank.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Optionaler Produktname oder Notiz..."
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
                  />

                  <button
                    type="button"
                    onClick={handleReportUnknown}
                    className="w-full bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Barcode melden & trotzdem auf Liste vermerken</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetScan}
                    className="w-full text-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 py-1"
                  >
                    Erneut scannen
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MANUAL ENTRY / QUICK TEST CODES */}
          {!detectedProduct && !unknownBarcode && (
            <div className="space-y-3 pt-1 border-t border-zinc-100">
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Barcode-Nummer manuell eingeben..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="bg-zinc-800 hover:bg-zinc-900 disabled:opacity-40 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
                >
                  Prüfen
                </button>
              </form>

              {/* Schnelltest-Vorschläge aus Datenbank */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Schnelltest-Barcodes aus Datenbank:
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {products.slice(0, 5).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleBarcodeDetected(p.barcode)}
                      className="whitespace-nowrap bg-zinc-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-zinc-200/80 text-[10px] font-medium text-zinc-700 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {p.name.split(' ')[0]} ({p.barcode.slice(-4)})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
