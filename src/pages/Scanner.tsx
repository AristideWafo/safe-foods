import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Camera, AlertTriangle, Loader2, X, Image as ImageIcon, Keyboard, Zap, ZapOff, Barcode, Leaf } from 'lucide-react';
import { useStore } from '../store/useStore';
import { fetchProductByBarcode } from '../services/OpenFoodFacts';
import { isValidBarcode } from '../services/Barcode';
import { preparePhoto, analyzePhoto } from '../services/Photo';
import type { Product } from '../types';
import { Button } from '../components/primitives/Button';
import { IconButton } from '../components/primitives/IconButton';
import { ManualBarcodeSheet } from '../components/scanner/ManualBarcodeSheet';
import { BottomSheet } from '../components/layout/BottomSheet';
import { clsx } from 'clsx';

type Mode = 'barcode' | 'ingredients';
type CameraState = 'idle' | 'starting' | 'running' | 'error';
export const Scanner = () => {
  const navigate = useNavigate();
  const { allergies, recordScan } = useStore();
  const [mode, setMode] = useState<Mode>('barcode');
  const [enabled, setEnabled] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [camera, setCamera] = useState<CameraState>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<() => Promise<string>>();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const processing = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const lockRef = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(true);
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  const lock = useCallback(async (action: () => Promise<void>) => {
    const previous = lockRef.current;
    let release: () => void = () => {};
    lockRef.current = new Promise(resolve => { release = resolve; });
    try { await previous; await action(); } finally { release(); }
  }, []);
  const stop = useCallback(() => lock(async () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) await scanner.stop().catch(() => {});
  }), [lock]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; requestRef.current?.abort(); void stop(); };
  }, [stop]);
  const run = useCallback(async (load: (signal: AbortSignal) => Promise<Product | null>) => {
    if (processing.current) return;
    processing.current = true; setAnalyzing(true); setError(null); setEnabled(false);
    const controller = new AbortController(); requestRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 65000);
    try {
      await stop();
      const product = await load(controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      if (!product) throw new Error('Produit introuvable. Photographiez les ingrédients ou vérifiez le code.');
      navigate(`/scan/${recordScan(product)}`);
    } catch (err) {
      if (mounted.current) setError(controller.signal.aborted ? 'La demande a été interrompue ou a pris trop de temps. Réessayez.' : err instanceof Error ? err.message : 'L’analyse a échoué. Réessayez.');
    } finally {
      clearTimeout(timer); processing.current = false;
      if (mounted.current) { setAnalyzing(false); setCamera('idle'); }
    }
  }, [navigate, recordScan, stop]);
  const scanBarcode = useCallback((code: string) => {
    if (modeRef.current === 'barcode' && isValidBarcode(code)) void run(signal => fetchProductByBarcode(code, signal));
  }, [run]);
  useEffect(() => {
    if (!enabled || analyzing || manual || pendingPhoto) return;
    let live = true;
    void lock(async () => {
      if (!live) return;
      setCamera('starting'); setCameraError(null); setFlashOn(false); setFlashSupported(false);
      try {
        if (scannerRef.current?.isScanning) await scannerRef.current.stop();
        if (!live) return;
        scannerRef.current ??= new Html5Qrcode('reader-container', { formatsToSupport: [Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.UPC_A], verbose: false });
        await scannerRef.current.start({ facingMode: 'environment' }, { fps: mode === 'barcode' ? 10 : 1, aspectRatio: 1, qrbox: mode === 'barcode' ? (width, height) => ({ width: Math.min(260, Math.floor(width * 0.8)), height: Math.min(160, Math.floor(height * 0.5)) }) : undefined }, scanBarcode, () => {});
        if (!live) { await scannerRef.current.stop(); return; }
        setCamera('running');
        setFlashSupported(scannerRef.current.getRunningTrackCameraCapabilities().torchFeature().isSupported());
      } catch (err) {
        if (!live) return;
        setCamera('error');
        const name = err instanceof Error ? err.name : '';
        setCameraError(name === 'NotAllowedError' ? 'Accès caméra refusé. Vous pouvez saisir le code ou importer une photo.' : 'Caméra indisponible. Vous pouvez saisir le code ou importer une photo.');
      }
    });
    return () => { live = false; void stop(); };
  }, [enabled, cameraAttempt, analyzing, manual, pendingPhoto, mode, scanBarcode, lock, stop]);
  const flash = async () => {
    if (!scannerRef.current?.isScanning || !flashSupported) return;
    try { await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: !flashOn } as MediaTrackConstraintSet] }); setFlashOn(value => !value); }
    catch { setFlashSupported(false); setFlashOn(false); }
  };
  const importPhoto = (file: File) => { if (!processing.current) setPendingPhoto(() => () => preparePhoto(file)); };
  const capture = () => {
    const video = document.querySelector<HTMLVideoElement>('#reader-container video');
    if (!video?.videoWidth || !video.videoHeight) { fileRef.current?.click(); return; }
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 2000 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * ratio); canvas.height = Math.round(video.videoHeight * ratio);
    const ctx = canvas.getContext('2d'); if (!ctx) { setError('Impossible de capturer la photo. Importez un fichier.'); return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', 0.9); setPendingPhoto(() => async () => data);
  };
  return <div className="flex-1 min-h-0 h-full relative bg-black text-white flex flex-col overflow-hidden">
    <div id="reader-container" className="absolute inset-0 [&_video]:object-cover [&_video]:h-full" />
    <div className="absolute inset-0 bg-black/50 pointer-events-none" />
    <div className="relative z-10 h-full min-h-0 flex flex-col p-4 gap-4">
      <div className="flex justify-between shrink-0"><IconButton icon={<X />} tone="light" onClick={() => navigate('/')} aria-label="Fermer le scanner" />{flashSupported && <IconButton icon={flashOn ? <Zap /> : <ZapOff />} tone="light" onClick={() => void flash()} aria-label={flashOn ? 'Désactiver le flash' : 'Activer le flash'} />}</div>
      <div className="flex bg-white rounded-pill p-1 text-text-primary shrink-0" aria-label="Mode de lecture">
        {(['barcode', 'ingredients'] as const).map(item => <button key={item} type="button" aria-pressed={mode === item} disabled={analyzing} onClick={() => { setMode(item); setError(null); }} className={clsx('flex-1 p-3 rounded-pill font-bold flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary-300', mode === item && 'bg-primary-500 text-white')}>
          {item === 'barcode' ? <Barcode className="w-5 h-5" /> : <Leaf className="w-5 h-5" />}{item === 'barcode' ? 'Code-barres' : 'Ingrédients'}
        </button>)}
      </div>
      {!allergies.length && <div className="rounded-xl p-3 bg-amber-100 text-amber-950 text-[13px] shrink-0">Aucune allergie renseignée. <button className="underline font-bold" onClick={() => navigate('/profile')}>Configurer mon profil</button></div>}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center gap-4 text-center">
        {analyzing ? <div role="status" aria-live="polite" className="space-y-4"><Loader2 className="w-12 h-12 animate-spin mx-auto" /><p>Analyse en cours…</p></div> : <>
          {error && <div role="alert" className="bg-black/80 rounded-2xl p-4"><AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-300" /><p>{error}</p></div>}
          {cameraError && <p role="status" className="bg-black/80 rounded-xl p-3">{cameraError}</p>}
          {camera === 'running' ? <>
            <p className="font-bold">{mode === 'barcode' ? 'Alignez le code-barres' : 'Cadrez toute la liste des ingrédients et les traces'}</p>
            <div aria-hidden="true" className={clsx('border-4 border-white rounded-3xl w-[min(260px,75vw)] shrink-0', mode === 'barcode' ? 'h-[min(160px,22dvh)]' : 'h-[min(300px,32dvh)]')} />
          </> : <Button variant="primary" disabled={camera === 'starting'} onClick={() => { setCameraError(null); setEnabled(true); setCameraAttempt(value => value + 1); }} leadingIcon={<Camera className="w-5 h-5" />}>{camera === 'starting' ? 'Ouverture de la caméra…' : 'Activer la caméra'}</Button>}
        </>}
      </div>
      <div className="shrink-0 flex flex-col gap-3 pb-[max(8px,env(safe-area-inset-bottom))]">
        {mode === 'ingredients' && camera === 'running' && <Button fullWidth disabled={analyzing} onClick={capture} leadingIcon={<Camera className="w-5 h-5" />}>Photographier les ingrédients</Button>}
        <Button variant="dark" fullWidth disabled={analyzing} onClick={() => setManual(true)} leadingIcon={<Keyboard className="w-5 h-5" />}>Saisir le code</Button>
        <Button variant="dark" fullWidth disabled={analyzing} onClick={() => fileRef.current?.click()} leadingIcon={<ImageIcon className="w-5 h-5" />}>Importer une photo</Button>
      </div>
    </div>
    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choisir une photo des ingrédients" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) importPhoto(file); }} />
    {manual && <ManualBarcodeSheet onClose={() => setManual(false)} onSubmit={code => { setManual(false); void run(signal => fetchProductByBarcode(code, signal)); }} />}
    <BottomSheet isOpen={!!pendingPhoto} onClose={() => setPendingPhoto(undefined)} title="Analyser cette photo ?">
      <p className="text-text-secondary leading-relaxed mb-4">La photo sera envoyée à Google Gemini pour lire les ingrédients. SafeEat ne conserve pas la photo sur son serveur. Évitez les informations personnelles et photographiez toute l’étiquette.</p>
      <Button fullWidth onClick={() => { const load = pendingPhoto; setPendingPhoto(undefined); if (load) void run(async signal => analyzePhoto(await load(), signal)); }}>Envoyer cette photo et analyser</Button>
      <Button fullWidth variant="ghost" onClick={() => setPendingPhoto(undefined)}>Annuler</Button>
    </BottomSheet>
  </div>;
};
