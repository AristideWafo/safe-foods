import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Camera as CameraIcon, AlertTriangle, Loader2, X, Image as ImageIcon, Keyboard, Zap, ZapOff, Barcode, Leaf } from 'lucide-react';
import { fetchProductByBarcode } from '../services/OpenFoodFacts';
import { analyzeProduct } from '../services/AnalysisEngine';
import { Product } from '../types';
import { AppHeader } from '../components/navigation/AppHeader';
import { Button } from '../components/primitives/Button';
import { IconButton } from '../components/primitives/IconButton';
import { ManualBarcodeSheet } from '../components/scanner/ManualBarcodeSheet';
import { clsx } from 'clsx';

type ScannerMode = 'barcode' | 'ingredients';
type ScannerState = 'ready' | 'analyzing' | 'error' | 'permission-denied';

export const Scanner = () => {
  const navigate = useNavigate();
  const { allergies } = useStore();
  const [mode, setMode] = useState<ScannerMode>('barcode');
  const [state, setState] = useState<ScannerState>('ready');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerContainerId = "reader-container";

  const transitionMutexRef = useRef<Promise<void>>(Promise.resolve());

  async function withScannerLock(action: () => Promise<void>) {
    const prev = transitionMutexRef.current;
    let release: () => void;
    transitionMutexRef.current = new Promise<void>(resolve => {
      release = () => resolve();
    });
    try {
      await prev;
      await action();
    } finally {
      release!();
    }
  }

  async function stopScannerSafely() {
    await withScannerLock(async () => {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop().catch(console.error);
      }
    });
  }

  // Initialize Barcode Scanner
  useEffect(() => {
    let isMounted = true;
    
    if (state === 'analyzing' || state === 'error' || state === 'permission-denied') return;

    const startScanner = async () => {
      await withScannerLock(async () => {
        try {
          if (scannerRef.current?.isScanning) {
            await scannerRef.current.stop().catch(console.error);
          }

          if (!isMounted) return;

          if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(readerContainerId);
          }

          await scannerRef.current.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 290, height: mode === 'barcode' ? 230 : 350 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              if (mode === 'barcode' && state === 'ready') {
                handleBarcodeScanned(decodedText);
              }
            },
            (errorMessage) => {
              // Ignore normal scanning errors
            }
          );

          if (!isMounted) {
            await scannerRef.current.stop().catch(console.error);
            return;
          }

          // Check flash support
          const track = scannerRef.current.getRunningTrackCameraCapabilities();
          if (track && 'torch' in track) {
            setFlashSupported(true);
          }

        } catch (err: any) {
          if (!isMounted) return;
          console.error("Camera start error:", err);
          setState('error');
          
          if (err?.name === 'NotAllowedError' || err?.message?.includes('permission')) {
            setState('permission-denied');
            setErrorMsg("L'accès à la caméra a été refusé. Veuillez l'autoriser dans les paramètres de votre navigateur.");
          } else if (err?.name === 'NotFoundError' || err?.message?.includes('device not found')) {
            setErrorMsg("Aucune caméra n'a été trouvée sur cet appareil.");
          } else if (err?.name === 'NotReadableError' || err?.message?.includes('already in use')) {
            setErrorMsg("La caméra est déjà utilisée par une autre application.");
          } else {
            setErrorMsg("Caméra indisponible ou permission refusée.");
          }
        }
      });
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScannerSafely();
    };
  }, [mode, state]);

  const toggleFlash = async () => {
    if (!scannerRef.current || !scannerRef.current.isScanning) return;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: !flashOn } as any]
      });
      setFlashOn(!flashOn);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setState('analyzing');
    await stopScannerSafely();

    try {
      const product = await fetchProductByBarcode(barcode);
      if (!product) {
        navigate(`/result/${barcode}`, {
          state: {
            barcode,
            result: {
              status: 'UNKNOWN',
              explanation: "Produit introuvable. Vous pouvez photographier les ingrédients.",
              detectedAllergens: [],
              detectedTraces: [],
            }
          }
        });
        return;
      }
      const result = analyzeProduct(product, allergies);
      navigate(`/result/${barcode}`, { state: { product, result, barcode } });
    } catch (error) {
      console.error(error);
      setState('error');
      setErrorMsg("Erreur réseau lors de la recherche du produit.");
    }
  };

  const processImageWithAI = async (base64String: string) => {
    if (!window.confirm('Cette photo sera envoyée à Google Gemini pour lire les ingrédients. SafeEat ne conserve pas la photo sur son serveur. Évitez les informations personnelles. Continuer ?')) return;
    setState('analyzing');
    await stopScannerSafely();

    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64String, consent: true })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Analyse photo indisponible.');
      
      const product: Product = {
        barcode: 'SCAN_OCR',
        name: 'Produit (Analyse Photo)',
        ingredientsText: data.ingredientsText || '',
        allergensHierarchy: data.allergensHierarchy || [],
        tracesTags: data.tracesTags || []
      };
      
      const result = analyzeProduct(product, allergies);
      navigate(`/result/OCR-${Date.now()}`, { state: { product, result, barcode: 'SCAN_OCR' } });
    } catch (error) {
      console.error(error);
      setState('error');
      setErrorMsg(error instanceof Error ? error.message : 'Erreur lors de l’analyse de l’image.');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      processImageWithAI(base64String);
    };
    reader.readAsDataURL(file);
  };

  const captureLiveFrame = () => {
    const videoElement = document.querySelector(`#${readerContainerId} video`) as HTMLVideoElement;
    if (videoElement) {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const base64String = canvas.toDataURL('image/jpeg', 0.8);
        processImageWithAI(base64String);
        return;
      }
    }
    // Fallback if video isn't available
    fileInputRef.current?.click();
  };

  const resetScanner = () => {
    setState('ready');
    setErrorMsg(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-black h-full relative z-0 overflow-hidden">
      {/* Camera Preview */}
      <div 
        id={readerContainerId} 
        className="absolute inset-0 w-full h-full object-cover [&>video]:object-cover" 
      />

      {/* Scrim Overlays */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-camera)' }} />
      
      <div className="relative z-10 flex flex-col h-full pointer-events-none pb-[calc(74px+max(12px,env(safe-area-inset-bottom)))]">
        
        {/* Top Controls */}
        <div className="pt-[max(16px,env(safe-area-inset-top))] px-6 w-full flex justify-between items-center pointer-events-auto h-14">
          <IconButton icon={<X />} tone="light" onClick={() => window.history.back()} aria-label="Fermer" />
          <IconButton 
            icon={flashOn ? <Zap /> : <ZapOff />} 
            tone="light" 
            onClick={toggleFlash}
            aria-label="Activer le flash"
            className={!flashSupported ? "opacity-0 pointer-events-none" : ""}
          />
        </div>

        {/* Mode Selector */}
        <div className="px-6 w-full pointer-events-auto mt-4">
          <div className="bg-white rounded-pill p-1 flex h-[54px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] relative" role="tablist">
            <div 
              className={clsx(
                "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary-500 rounded-pill transition-transform duration-[220ms] ease-[cubic-bezier(.22,1,.36,1)]",
                mode === 'ingredients' ? "translate-x-full" : "translate-x-0"
              )} 
            />
            <button 
              role="tab"
              aria-selected={mode === 'barcode'}
              onClick={() => setMode('barcode')}
              className={clsx(
                "flex-1 rounded-pill font-bold text-[15px] z-10 transition-colors flex items-center justify-center gap-2",
                mode === 'barcode' ? "text-white" : "text-text-primary"
              )}
            >
              <Barcode className="w-5 h-5" />
              Code-barres
            </button>
            <button 
              role="tab"
              aria-selected={mode === 'ingredients'}
              onClick={() => setMode('ingredients')}
              className={clsx(
                "flex-1 rounded-pill font-bold text-[15px] z-10 transition-colors flex items-center justify-center gap-2",
                mode === 'ingredients' ? "text-white" : "text-text-primary"
              )}
            >
              <Leaf className="w-5 h-5" />
              Ingrédients
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          {state === 'analyzing' ? (
            <div className="flex flex-col items-center bg-black/60 backdrop-blur-md p-8 rounded-2xl">
              <Loader2 className="w-12 h-12 animate-spin text-white mb-4" />
              <p className="text-white font-bold text-[16px]">Analyse en cours...</p>
            </div>
          ) : state === 'error' || state === 'permission-denied' ? (
            <div className="flex flex-col items-center bg-black/80 backdrop-blur-md p-8 rounded-2xl mx-6 pointer-events-auto text-center">
              {state === 'permission-denied' ? (
                <CameraIcon className="w-12 h-12 text-white/50 mb-4" />
              ) : (
                <AlertTriangle className="w-12 h-12 text-warning mb-4" />
              )}
              <p className="text-white font-bold text-[18px] mb-2">
                {state === 'permission-denied' ? 'Caméra bloquée' : 'Erreur'}
              </p>
              <p className="text-white/80 text-[15px] mb-6 leading-relaxed">{errorMsg}</p>
              <div className="flex flex-col gap-3 w-full">
                {state !== 'permission-denied' && (
                  <Button variant="primary" fullWidth onClick={resetScanner}>Réessayer</Button>
                )}
                <Button variant={state === 'permission-denied' ? 'primary' : 'ghost'} className={state === 'permission-denied' ? '' : 'text-white'} fullWidth onClick={() => fileInputRef.current?.click()}>
                  Importer une photo
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 text-white text-[16px] font-bold tracking-wide pointer-events-auto drop-shadow-md">
                {mode === 'barcode' ? "Aligner le code-barres" : "Photographier les ingrédients"}
              </div>

              {/* Scan Frame */}
              <div 
                className={clsx(
                  "relative transition-all duration-[360ms] ease-out shadow-[0_0_0_9999px_rgba(5,12,28,0.56)]",
                  mode === 'barcode' ? "w-[290px] h-[230px] rounded-[24px]" : "w-[300px] h-[400px] rounded-[24px]"
                )}
              >
                <div className="absolute top-0 left-0 w-[36px] h-[36px] border-t-[5px] border-l-[5px] border-white rounded-tl-[24px]" />
                <div className="absolute top-0 right-0 w-[36px] h-[36px] border-t-[5px] border-r-[5px] border-white rounded-tr-[24px]" />
                <div className="absolute bottom-0 left-0 w-[36px] h-[36px] border-b-[5px] border-l-[5px] border-white rounded-bl-[24px]" />
                <div className="absolute bottom-0 right-0 w-[36px] h-[36px] border-b-[5px] border-r-[5px] border-white rounded-br-[24px]" />
                
                {mode === 'barcode' && (
                  <div className="absolute left-4 right-4 h-1 bg-[#1769ff] rounded-full shadow-[0_0_12px_#1769ff] animate-[scan_1.8s_ease-in-out_infinite]" />
                )}
              </div>
            </>
          )}
        </div>

        {/* Bottom Actions */}
        {state === 'ready' && (
          <div className="pb-6 px-6 w-full flex items-center justify-center pointer-events-auto">
            {mode === 'ingredients' ? (
              <div className="flex justify-between w-full">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform"
                  aria-label="Importer une photo"
                >
                  <ImageIcon className="w-6 h-6" />
                </button>
                <button 
                  onClick={captureLiveFrame}
                  className="w-[72px] h-[72px] rounded-full border-[4px] border-white/50 flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Prendre la photo"
                >
                  <div className="w-[56px] h-[56px] rounded-full bg-white shadow-lg flex items-center justify-center text-black">
                    <CameraIcon className="w-6 h-6" />
                  </div>
                </button>
                <div className="w-14 h-14" /> {/* Spacer */}
              </div>
            ) : (
              <Button variant="dark" leadingIcon={<Keyboard className="w-5 h-5" />} onClick={() => setShowManual(true)}>
                Saisir le code
              </Button>
            )}
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
          </div>
        )}
      </div>

      {showManual && (
        <ManualBarcodeSheet 
          onClose={() => setShowManual(false)} 
          onSubmit={(code) => {
            setShowManual(false);
            handleBarcodeScanned(code);
          }} 
        />
      )}

      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { top: 90%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-[scan_1.8s_ease-in-out_infinite] {
            animation: none;
            top: 50%;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
