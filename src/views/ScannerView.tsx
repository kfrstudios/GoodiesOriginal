import { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import { 
  ArrowLeft, 
  Flashlight, 
  FlashlightOff, 
  SwitchCamera,
  Volume2,
  VolumeX,
  ShieldCheck,
  Sparkles,
  Heart,
  Share2,
  ListPlus,
  Flame,
  ChevronUp,
  ChevronDown,
  Check,
  AlertTriangle,
  RefreshCw,
  X,
  Send,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { BrowserMultiFormatReader, BrowserCodeReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { useApp } from '../context/AppContext';
import { 
  getProductByBarcode, 
  calculateGoodiesMatch, 
  getBetterAlternatives,
  MatchCalculation 
} from '../services/productService';
import { playScanSound, triggerScanHaptic } from '../utils/audio';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { Product, MealType, NutriScore } from '../types';
import { ProBadge } from '../components/pro/ProDesignSystem';

type SheetMode = 'closed' | 'compact' | 'expanded';
type ActiveSheetType = 'none' | 'product' | 'unknown' | 'error';

interface SessionState {
  sessionId: string;
  count: number;
  totalScore: number;
  avgScore: number;
}

export function ScannerView() {
  const { 
    setActiveView, 
    products, 
    user, 
    effectiveTier,
    canPerformScan,
    consumeScan,
    openPaywall,
    addToScanHistory, 
    isFavorite, 
    toggleFavorite, 
    shoppingLists, 
    addShoppingItem, 
    removeShoppingItem,
    logMeal, 
    submitUnknownBarcode,
    showToast 
  } = useApp();

  // -----------------------------------------------------------------
  // 1. SCANNER ENGINE STATE & HARDWARE REFS (EXACT WORKING ENGINE)
  // -----------------------------------------------------------------
  const [isScanning, setIsScanning] = useState(true);
  const isScanningRef = useRef(true);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentFlash, setRecentFlash] = useState(false);

  // Hardware & Video Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const nativeDetectorRef = useRef<any>(null);

  const frameCounterRef = useRef(0);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // -----------------------------------------------------------------
  // 2. SCAN SESSION STATE (Articles count & Avg Goodies score)
  // -----------------------------------------------------------------
  const [scanSession, setScanSession] = useState<SessionState>(() => ({
    sessionId: `session_${Date.now()}`,
    count: 0,
    totalScore: 0,
    avgScore: 0
  }));

  // -----------------------------------------------------------------
  // 3. PRODUCT LOOKUP & BOTTOM SHEET STATE
  // -----------------------------------------------------------------
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [activeSheet, setActiveSheet] = useState<ActiveSheetType>('none');
  const [sheetMode, setSheetMode] = useState<SheetMode>('closed');
  const [detectedProduct, setDetectedProduct] = useState<Product | null>(null);
  const [detectedMatch, setDetectedMatch] = useState<MatchCalculation | null>(null);
  const [unresolvedBarcode, setUnresolvedBarcode] = useState<string>('');
  const [reportNotes, setReportNotes] = useState<string>('');

  // Modals inside Expanded Analysis: Meal Tracker & Shopping List
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [portionGrams, setPortionGrams] = useState<number>(100);
  const [showListModal, setShowListModal] = useState(false);

  useEffect(() => {
    isScanningRef.current = isScanning && activeSheet === 'none';
  }, [isScanning, activeSheet]);

  // -----------------------------------------------------------------
  // 4. INITIALIZE DECODING ENGINES (PROVEN WORKING IMPLEMENTATION)
  // -----------------------------------------------------------------
  useEffect(() => {
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      zxingReaderRef.current = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 130,
        delayBetweenScanSuccess: 400
      });
    } catch (err) {
      console.warn('ZXing init error:', err);
    }

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        nativeDetectorRef.current = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
        });
      } catch {
        try {
          nativeDetectorRef.current = new (window as any).BarcodeDetector();
        } catch {
          nativeDetectorRef.current = null;
        }
      }
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
  }, []);

  // -----------------------------------------------------------------
  // 5. CAMERA STREAM MANAGEMENT (KEEPS RUNNING IN BACKGROUND)
  // -----------------------------------------------------------------
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError('Kamera wird in diesem Browser nicht direkt unterstützt.');
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
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.setAttribute('muted', 'true');
        await videoRef.current.play().catch(() => {});
      }

      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};
        setTorchSupported(Boolean(capabilities.torch));
      }

      setHasCamera(true);
      setCameraError(null);
    } catch (err: any) {
      console.warn('Kamera Fehler:', err);
      setHasCamera(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Kamerazugriff verweigert. Bitte Berechtigung im Browser erteilen.'
          : 'Kamera nicht verfügbar oder wird blockiert.'
      );
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [startCamera]);

  // -----------------------------------------------------------------
  // 6. BARCODE DISPATCHER & DECOUPLED PRODUCT LOOKUP
  // -----------------------------------------------------------------
  const handleBarcodeDetected = useCallback(async (rawCode: string) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    const now = Date.now();
    // Debounce identical scans within 1.4 seconds
    if (lastScannedCodeRef.current === cleanCode && now - lastScanTimeRef.current < 1400) {
      return;
    }

    // Check daily scan entitlement
    const scanStatus = canPerformScan();
    if (!scanStatus.allowed) {
      showToast('Du hast dein tägliches Free-Limit von 5 Scans erreicht.');
      openPaywall('scans');
      return;
    }

    lastScannedCodeRef.current = cleanCode;
    lastScanTimeRef.current = now;

    // Visual & Haptic confirmation
    if (soundEnabled) {
      playScanSound();
    }
    triggerScanHaptic();

    setRecentFlash(true);
    setTimeout(() => setRecentFlash(false), 450);

    // Consume scan from daily quota
    consumeScan();

    // Asynchronous lookup pipeline
    setIsLookingUp(true);

    try {
      const result = await getProductByBarcode(cleanCode, products);

      if (result && result.product) {
        const found = result.product;
        const match = calculateGoodiesMatch(found, user);

        setDetectedProduct(found);
        setDetectedMatch(match);
        setActiveSheet('product');
        setSheetMode('compact');

        // Update Scan Session stats
        setScanSession(prev => {
          const nextCount = prev.count + 1;
          const nextTotal = prev.totalScore + found.goodiesScore;
          const nextAvg = Math.round(nextTotal / nextCount);
          return {
            ...prev,
            count: nextCount,
            totalScore: nextTotal,
            avgScore: nextAvg
          };
        });

        // Add to persistent Scan History
        addToScanHistory(found, match.score, scanSession.sessionId);
      } else {
        // Unknown barcode: Show friendly unknown sheet (never do nothing!)
        setUnresolvedBarcode(cleanCode);
        setActiveSheet('unknown');
        setSheetMode('compact');
      }
    } catch (err) {
      console.warn('Lookup pipeline error:', err);
      setUnresolvedBarcode(cleanCode);
      setActiveSheet('error');
      setSheetMode('compact');
    } finally {
      setIsLookingUp(false);
    }
  }, [products, user, soundEnabled, scanSession.sessionId, addToScanHistory, canPerformScan, consumeScan, openPaywall, showToast]);

  // -----------------------------------------------------------------
  // 7. CONTINUOUS SCAN CYCLE (EXACT SAME RECOGNITION LOGIC)
  // -----------------------------------------------------------------
  useEffect(() => {
    let isCancelled = false;
    let timerId: NodeJS.Timeout | null = null;

    const runScanCycle = async () => {
      if (isCancelled || !isScanningRef.current || !videoRef.current) {
        return;
      }

      const video = videoRef.current;
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      frameCounterRef.current += 1;
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      // PASS 1: Native BarcodeDetector (Hardware Accelerated)
      if (nativeDetectorRef.current) {
        try {
          const barcodes = await nativeDetectorRef.current.detect(video);
          if (isCancelled) return; // Prevent state updates if component unmounted
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleBarcodeDetected(barcodes[0].rawValue);
            return;
          }
        } catch {
          // Continue to ZXing
        }
      }

      // PASS 2: ZXing MultiFormat Engine with Correct Grayscale Bitmap
      if (zxingReaderRef.current && canvasRef.current && !isCancelled) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          // Center Focus Crop
          const cropW = Math.min(640, Math.floor(vw * 0.75));
          const cropH = Math.min(380, Math.floor(vh * 0.55));
          const sx = Math.max(0, Math.floor((vw - cropW) / 2));
          const sy = Math.max(0, Math.floor((vh - cropH) / 2));

          canvas.width = cropW;
          canvas.height = cropH;
          ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

          try {
            const bitmap = BrowserCodeReader.createBinaryBitmapFromCanvas(canvas);
            const result = zxingReaderRef.current.decodeBitmap(bitmap);
            if (result && result.getText()) {
              handleBarcodeDetected(result.getText());
              return;
            }
          } catch {
            // NotFoundException is standard
          }

          // Alternating Full-Frame Pass
          if (frameCounterRef.current % 2 === 0) {
            try {
              const fullW = Math.min(800, vw);
              const fullH = Math.round((vh / vw) * fullW);
              canvas.width = fullW;
              canvas.height = fullH;
              ctx.drawImage(video, 0, 0, fullW, fullH);

              const bitmapFull = BrowserCodeReader.createBinaryBitmapFromCanvas(canvas);
              const resultFull = zxingReaderRef.current.decodeBitmap(bitmapFull);
              if (resultFull && resultFull.getText()) {
                handleBarcodeDetected(resultFull.getText());
                return;
              }
            } catch {
              // NotFoundException is normal
            }
          }
        }
      }
    };

    timerId = setInterval(runScanCycle, 140);

    return () => {
      isCancelled = true;
      if (timerId) clearInterval(timerId);

      // Cleanup ZXing resources to prevent memory leaks and stuck video loops
      // Since it's decoding from a canvas bitmap manually, there's no ongoing stream in zxing to stop,
      // but we can clear the reader reference.
      if (zxingReaderRef.current) {
         zxingReaderRef.current = null;
      }
    };
  }, [handleBarcodeDetected]);

  // -----------------------------------------------------------------
  // 8. ACTIONS & DRAGGABLE SHEET CONTROLS
  // -----------------------------------------------------------------
  const resumeScanning = () => {
    setActiveSheet('none');
    setSheetMode('closed');
    setDetectedProduct(null);
    setDetectedMatch(null);
    setUnresolvedBarcode('');
    setShowMealModal(false);
    setShowListModal(false);
    lastScannedCodeRef.current = null;
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y < -60 || info.velocity.y < -300) {
      // Swiped UP -> expand
      setSheetMode('expanded');
    } else if (info.offset.y > 90 || info.velocity.y > 400) {
      if (sheetMode === 'expanded') {
        // Swiped DOWN from expanded -> compact
        setSheetMode('compact');
      } else {
        // Swiped DOWN from compact -> close & resume
        resumeScanning();
      }
    }
  };

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
      console.warn('Torch toggle error:', err);
    }
  };

  const flipCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleReportSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (unresolvedBarcode) {
      submitUnknownBarcode(unresolvedBarcode, reportNotes.trim() || undefined);
      setReportNotes('');
      resumeScanning();
    }
  };

  const handleLogMealSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (detectedProduct) {
      logMeal(detectedProduct, portionGrams, selectedMealType);
      setShowMealModal(false);
      showToast(`${detectedProduct.name} zu „Dein Tag“ hinzugefügt`);
    }
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

  const betterAlternatives = detectedProduct 
    ? getBetterAlternatives(detectedProduct, products) 
    : [];

  return (
    <div className="relative min-h-[calc(100vh-65px)] bg-zinc-950 text-white flex flex-col justify-between overflow-hidden select-none">
      
      {/* ============================================================ */}
      {/* TOP BAR: MINIMAL HEADER WITH ANIMATED SCAN SESSION STATS     */}
      {/* ============================================================ */}
      <div className="relative z-20 flex items-center justify-between p-3.5 bg-gradient-to-b from-zinc-950 via-zinc-950/80 to-transparent">
        <button
          type="button"
          onClick={() => setActiveView('home')}
          className="w-10 h-10 rounded-2xl bg-zinc-900/80 backdrop-blur-md flex items-center justify-center text-zinc-300 hover:text-white border border-zinc-800 shadow-md transition-all active:scale-95"
          title="Zurück"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Scan-Session-Anzeige: "X Artikel · Ø X Goodies" mit sanfter Zähler-Animation */}
        <div className="flex items-center gap-2 bg-zinc-900/85 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800/90 shadow-lg text-xs font-semibold text-zinc-200">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono font-bold text-white">
              <AnimatedCounter value={scanSession.count} />
            </span>
            <span className="text-zinc-400">
              {scanSession.count === 1 ? 'Artikel' : 'Artikel'}
            </span>
          </div>

          <span className="text-zinc-600 font-bold">•</span>

          <div className="flex items-center gap-1">
            <span className="text-zinc-400">Ø</span>
            <span className="font-mono font-bold text-emerald-400">
              <AnimatedCounter value={scanSession.avgScore} />
            </span>
            <span className="text-zinc-400">Goodies</span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-9 h-9 rounded-xl backdrop-blur-md flex items-center justify-center border transition-all ${
              soundEnabled ? 'bg-zinc-800 text-emerald-400 border-zinc-700' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
            title="Ton an/aus"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {torchSupported && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`w-9 h-9 rounded-xl backdrop-blur-md flex items-center justify-center border transition-all ${
                torchOn ? 'bg-amber-400 text-zinc-950 border-amber-300' : 'bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
              title="Taschenlampe"
            >
              {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={flipCamera}
            className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 backdrop-blur-md flex items-center justify-center transition-all active:scale-95"
            title="Kamera wechseln"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Free Tier Daily Scan Quota Reminder */}
      {effectiveTier === 'FREE' && (
        <div className="relative z-20 px-4 py-1.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-300">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Heute noch <strong>{canPerformScan().remaining} von 5</strong> Scans frei</span>
          </div>
          <button
            type="button"
            onClick={() => openPaywall('scans')}
            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <span className="text-[10px] font-bold text-amber-300">Unbegrenzt</span>
            <ProBadge size="xs" label="PRO" variant="gold" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* FINALER MINIMALISTISCHER SCANNER-VIEWPORT                    */}
      {/* ============================================================ */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4">
        {hasCamera && !cameraError ? (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-xs text-zinc-400 max-w-sm mb-3">{cameraError}</p>
            <button
              type="button"
              onClick={startCamera}
              className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Erneut verbinden
            </button>
          </div>
        )}

        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-black/25" />

        {/* Minimalistischer weißer Rahmen */}
        <div className={`relative z-10 w-72 sm:w-80 h-44 sm:h-48 rounded-2xl border-2 transition-all duration-300 overflow-hidden flex items-center justify-center ${
          recentFlash 
            ? 'border-emerald-400 shadow-[0_0_35px_#10B981] bg-emerald-500/20 scale-[1.02]' 
            : 'border-white/85 shadow-[0_0_24px_rgba(255,255,255,0.12)]'
        }`}>
          {/* Dezente Eckmarkierungen */}
          <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl" />
          <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr" />
          <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl" />
          <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-white rounded-br" />

          {/* Dezente Scan-Linie */}
          {activeSheet === 'none' && !isLookingUp && (
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10B981]"
              animate={{ y: [-50, 50, -50] }}
              transition={{ repeat: Infinity, duration: 1.9, ease: 'easeInOut' }}
            />
          )}

          {/* Lookup Spinner (dezent im Rahmen) */}
          {isLookingUp && (
            <div className="flex flex-col items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
              <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
              <span className="text-[11px] font-medium text-white tracking-wide">
                Produkt wird gesucht...
              </span>
            </div>
          )}
        </div>

        {/* Nur kleiner, weißer und dezenter Hinweis: "Barcode im Rahmen platzieren" */}
        <p className="relative z-10 text-[11px] font-medium text-white/90 mt-4 text-center px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 tracking-wide">
          Barcode im Rahmen platzieren
        </p>
      </div>

      {/* ============================================================ */}
      {/* DRAGGABLE PRODUKT-BOTTOM-SHEET (KOMPAKT → EXPANDED)          */}
      {/* ============================================================ */}
      <AnimatePresence>
        {activeSheet === 'product' && detectedProduct && (
          <motion.div
            key="product-sheet"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={`fixed inset-x-0 bottom-0 z-40 bg-white text-zinc-900 rounded-t-[32px] shadow-2xl border-t border-zinc-200/80 flex flex-col overflow-hidden transition-all duration-300 ${
              sheetMode === 'expanded' ? 'h-[88vh] max-h-[88vh]' : 'max-h-[72vh]'
            }`}
          >
            {/* Drag Handle Bar */}
            <div className="pt-3 pb-2 flex flex-col items-center cursor-grab active:cursor-grabbing shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-zinc-300" />
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
              
              {/* KOMPAKTE PRODUKTVORSCHAU */}
              <div className="flex gap-4 items-center">
                {/* Kontrollierter Produktbild-Container: Ragt nie heraus, blockiert keine Buttons */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-50 overflow-hidden shrink-0 border border-zinc-200/70 relative p-1.5 flex items-center justify-center">
                  <img loading="lazy"
                    src={detectedProduct.imageUrl}
                    alt={detectedProduct.name}
                    className="w-full h-full object-contain"
                  />
                  {detectedProduct.quantity && (
                    <span className="absolute bottom-1 left-1 bg-black/65 backdrop-blur-sm text-white font-mono text-[9px] px-1.5 py-0.2 rounded-full">
                      {detectedProduct.quantity}
                    </span>
                  )}
                </div>

                {/* Produktname & Marke */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider truncate">
                    <span>{detectedProduct.brand}</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-semibold">{detectedProduct.category}</span>
                  </div>

                  <h2 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight leading-snug line-clamp-2">
                    {detectedProduct.name}
                  </h2>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getNutriColor(detectedProduct.nutriScore)}`}>
                      Nutri-Score {detectedProduct.nutriScore}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 truncate">
                      EAN: {detectedProduct.barcode}
                    </span>
                  </div>
                </div>

                {/* Quick Favorite & Share */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(detectedProduct.id)}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                      isFavorite(detectedProduct.id)
                        ? 'bg-rose-50 border-rose-200 text-rose-500 shadow-sm'
                        : 'bg-zinc-100/80 border-zinc-200 text-zinc-400 hover:text-zinc-600'
                    }`}
                    title="Favorit"
                  >
                    <Heart className={`w-4 h-4 ${isFavorite(detectedProduct.id) ? 'fill-rose-500' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: detectedProduct.name, text: `${detectedProduct.name} auf Goodies`, url: window.location.href });
                      } else {
                        showToast('Link kopiert');
                      }
                    }}
                    className="w-9 h-9 rounded-xl bg-zinc-100/80 border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-all"
                    title="Teilen"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* DUAL SCORE CARDS MIT ANIMIERTEN WERTEN */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Goodies Score Card */}
                <div className="bg-zinc-50 rounded-2xl p-3.5 border border-zinc-200/80 flex flex-col justify-between space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                      Goodies Score
                    </span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-zinc-900 font-mono">
                      <AnimatedCounter value={detectedProduct.goodiesScore} duration={600} />
                    </span>
                    <span className="text-xs font-bold text-zinc-400">/ 100</span>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${detectedProduct.goodiesScore}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        detectedProduct.goodiesScore >= 80 
                          ? 'bg-emerald-500' 
                          : detectedProduct.goodiesScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                    />
                  </div>

                  <span className="text-[10px] font-semibold text-zinc-600">
                    {detectedProduct.goodiesScore >= 85 ? 'Hervorragende Wahl' : detectedProduct.goodiesScore >= 65 ? 'Gute Zusammensetzung' : 'Kritische Werte'}
                  </span>
                </div>

                {/* Goodies Match Card */}
                <div className="bg-zinc-50 rounded-2xl p-3.5 border border-zinc-200/80 flex flex-col justify-between space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                      Dein Match
                    </span>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                      <AnimatedCounter value={detectedMatch?.score || 90} duration={600} />
                    </span>
                    <span className="text-xs font-bold text-emerald-600">%</span>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${detectedMatch?.score || 90}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>

                  <span className="text-[10px] font-semibold text-zinc-600 truncate">
                    {detectedMatch?.verdict || 'Passt gut zu dir'}
                  </span>
                </div>
              </div>

              {/* PERSÖNLICHE WARNUNG ODER EMPFEHLUNG */}
              {detectedMatch && detectedMatch.warnings.length > 0 ? (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-800 space-y-0.5">
                    <span className="font-bold block">Hinweis für deine Ernährung:</span>
                    {detectedMatch.warnings.slice(0, 2).map((w, idx) => (
                      <p key={idx} className="text-[11px] text-rose-700">{w}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200/70 rounded-2xl p-3 flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-emerald-800 font-medium">
                    ✓ Passt hervorragend zu deinen individuellen Zielen & Ernährungsweise ({user.diet})
                  </p>
                </div>
              )}

              {/* EXPANDED DETAILS (WENN HOCHGEZOGEN ODER TIPP AUF DETAILS) */}
              {sheetMode === 'expanded' && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4 pt-2"
                >
                  {/* NÄHRWERTE MIT ANIMIERTEN PROGRESS BARS */}
                  <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
                        Nährwerte je 100g
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {detectedProduct.nutritionPer100g.calories} kcal
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between text-zinc-600 text-[11px] mb-1">
                          <span>Eiweiß</span>
                          <span className="font-bold text-zinc-900">{detectedProduct.nutritionPer100g.protein} g</span>
                        </div>
                        <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (detectedProduct.nutritionPer100g.protein / 30) * 100)}%` }}
                            transition={{ duration: 0.6 }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-zinc-600 text-[11px] mb-1">
                          <span>Zucker</span>
                          <span className="font-bold text-zinc-900">{detectedProduct.nutritionPer100g.sugars} g</span>
                        </div>
                        <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (detectedProduct.nutritionPer100g.sugars / 30) * 100)}%` }}
                            transition={{ duration: 0.6 }}
                            className={`h-full rounded-full ${detectedProduct.nutritionPer100g.sugars > 15 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-zinc-600 text-[11px] mb-1">
                          <span>Fett</span>
                          <span className="font-bold text-zinc-900">{detectedProduct.nutritionPer100g.fat} g</span>
                        </div>
                        <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (detectedProduct.nutritionPer100g.fat / 40) * 100)}%` }}
                            transition={{ duration: 0.6 }}
                            className="h-full bg-amber-500 rounded-full"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-zinc-600 text-[11px] mb-1">
                          <span>Ballaststoffe</span>
                          <span className="font-bold text-zinc-900">{detectedProduct.nutritionPer100g.fiber} g</span>
                        </div>
                        <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (detectedProduct.nutritionPer100g.fiber / 15) * 100)}%` }}
                            transition={{ duration: 0.6 }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ZUTATEN & ALLERGENE */}
                  <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/80 space-y-2 text-xs">
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-900 block">
                      Zutaten
                    </span>
                    <p className="text-zinc-600 leading-relaxed text-[11px]">
                      {detectedProduct.ingredients || 'Keine Zutatenliste verfügbar'}
                    </p>

                    {detectedProduct.allergens.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                          Allergene
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {detectedProduct.allergens.map((a, i) => (
                            <span key={i} className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BESSERE ALTERNATIVEN (FALLS VORHANDEN) */}
                  {betterAlternatives.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-wider text-zinc-400 block">
                        Bessere Alternativen in Goodies
                      </span>
                      <div className="space-y-2">
                        {betterAlternatives.slice(0, 2).map((alt) => (
                          <div
                            key={alt.id}
                            onClick={() => {
                              setDetectedProduct(alt);
                              setDetectedMatch(calculateGoodiesMatch(alt, user));
                            }}
                            className="bg-zinc-50 hover:bg-zinc-100 p-3 rounded-2xl border border-zinc-200/80 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <img loading="lazy" src={alt.imageUrl} alt={alt.name} className="w-10 h-10 object-contain rounded-xl bg-white p-1 border" />
                              <div>
                                <span className="font-bold text-xs text-zinc-900 block">{alt.name}</span>
                                <span className="text-[10px] text-zinc-400">{alt.brand}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 font-mono font-bold text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                              <span>Score {alt.goodiesScore}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* EXPAND / COLLAPSE BUTTON */}
              <button
                type="button"
                onClick={() => setSheetMode(prev => prev === 'expanded' ? 'compact' : 'expanded')}
                className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                {sheetMode === 'expanded' ? (
                  <>
                    <span>Weniger anzeigen</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Vollständige Produktanalyse</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* PRIMARY ACTION BUTTONS: WEITER SCANNEN & INTEGRATIONEN */}
              <div className="pt-2 space-y-2">
                {/* WEITER SCANNEN (HERVORRAGEND & SOFORT BEREIT) */}
                <button
                  type="button"
                  onClick={resumeScanning}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all"
                >
                  <span>Weiter scannen</span>
                </button>

                {/* Sekundäre Aktionen: Zu heute hinzufügen & Zur Liste */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMealModal(true)}
                    className="bg-zinc-100 hover:bg-zinc-200 active:scale-98 text-zinc-900 font-bold text-xs py-3 px-3 rounded-2xl border border-zinc-200/80 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>Zu heute hinzufügen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowListModal(true)}
                    className="bg-zinc-100 hover:bg-zinc-200 active:scale-98 text-zinc-900 font-bold text-xs py-3 px-3 rounded-2xl border border-zinc-200/80 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ListPlus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Zur Liste hinzufügen</span>
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* BOTTOM SHEET: UNBEKANNTES PRODUKT                            */}
      {/* ============================================================ */}
      <AnimatePresence>
        {activeSheet === 'unknown' && (
          <motion.div
            key="unknown-sheet"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-40 bg-white text-zinc-900 rounded-t-[32px] p-6 shadow-2xl border-t border-zinc-200 max-w-lg mx-auto space-y-4"
          >
            <div className="w-12 h-1.5 rounded-full bg-zinc-300 mx-auto" />

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900">
                  Produkt noch nicht in Goodies
                </h3>
                <p className="text-xs text-zinc-500">
                  Barcode <span className="font-mono font-bold text-zinc-700">{unresolvedBarcode}</span> wurde erfolgreich erkannt.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
              Dieser Barcode wurde erkannt, aber wir kennen das Produkt noch nicht. Hilf der Community und reiche das Produkt ein!
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Optional: Produktname oder Marke..."
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500"
              />

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs py-3 rounded-2xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Produkt melden</span>
                </button>

                <button
                  type="button"
                  onClick={resumeScanning}
                  className="bg-zinc-100 hover:bg-zinc-200 active:scale-98 text-zinc-800 font-bold text-xs py-3 rounded-2xl border border-zinc-200 transition-all"
                >
                  Weiter scannen
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* BOTTOM SHEET: FEHLERZUSTAND                                  */}
      {/* ============================================================ */}
      <AnimatePresence>
        {activeSheet === 'error' && (
          <motion.div
            key="error-sheet"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-40 bg-white text-zinc-900 rounded-t-[32px] p-6 shadow-2xl border-t border-zinc-200 max-w-lg mx-auto space-y-4 text-center"
          >
            <div className="w-12 h-1.5 rounded-full bg-zinc-300 mx-auto" />
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-zinc-900">
              Produkt konnte gerade nicht geladen werden.
            </h3>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              Der Barcode ({unresolvedBarcode}) wurde erkannt, aber die Verbindung konnte nicht hergestellt werden.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleBarcodeDetected(unresolvedBarcode)}
                className="bg-emerald-600 text-white font-bold text-xs py-3 rounded-2xl"
              >
                Erneut versuchen
              </button>
              <button
                type="button"
                onClick={resumeScanning}
                className="bg-zinc-100 text-zinc-800 font-bold text-xs py-3 rounded-2xl"
              >
                Weiter scannen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL: MAHLZEIT-AUSWAHL FÜR KALORIENTRACKER                  */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showMealModal && detectedProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl text-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <h3 className="font-black text-base text-zinc-900">Zu heute hinzufügen</h3>
                </div>
                <button type="button" onClick={() => setShowMealModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-zinc-500 font-medium">
                {detectedProduct.name} ({detectedProduct.brand})
              </p>

              <form onSubmit={handleLogMealSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                    Mahlzeit auswählen
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'breakfast', label: 'Frühstück' },
                      { id: 'lunch', label: 'Mittagessen' },
                      { id: 'dinner', label: 'Abendessen' },
                      { id: 'snack', label: 'Snacks & Riegel' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMealType(m.id as MealType)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          selectedMealType === m.id
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                            : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    <span>Portionsgröße</span>
                    <span className="font-mono text-zinc-900">{portionGrams} g</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={500}
                    step={10}
                    value={portionGrams}
                    onChange={(e) => setPortionGrams(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1">
                    <span>10g</span>
                    <span>
                      ca. {Math.round((detectedProduct.nutritionPer100g.calories * portionGrams) / 100)} kcal
                    </span>
                    <span>500g</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-2xl shadow-md transition-all"
                >
                  Mahlzeit erfassen
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL: EINKAUFSLISTEN-AUSWAHL                                */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showListModal && detectedProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl text-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListPlus className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-base text-zinc-900">Zur Liste hinzufügen</h3>
                </div>
                <button type="button" onClick={() => setShowListModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {shoppingLists.map((list) => {
                  const alreadyInList = list.items.some(i => i.productId === detectedProduct.id);
                  return (
                    <div
                      key={list.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-zinc-200 bg-zinc-50"
                    >
                      <div>
                        <span className="font-bold text-xs text-zinc-900 block">{list.title}</span>
                        <span className="text-[10px] text-zinc-400">{list.items.length} Artikel</span>
                      </div>

                      {alreadyInList ? (
                        <button
                          type="button"
                          onClick={() => {
                            const foundItem = list.items.find(i => i.productId === detectedProduct.id);
                            if (foundItem) {
                              removeShoppingItem(list.id, foundItem.id);
                              showToast(`Aus „${list.title}“ entfernt`);
                            }
                          }}
                          className="text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-all"
                        >
                          Entfernen
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            addShoppingItem(list.id, detectedProduct.name, detectedProduct.quantity, detectedProduct.id);
                            showToast(`Zu „${list.title}“ hinzugefügt`);
                          }}
                          className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          Hinzufügen
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowListModal(false)}
                className="w-full bg-zinc-100 text-zinc-700 font-bold text-xs py-2.5 rounded-xl"
              >
                Schließen
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
