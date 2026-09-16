import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, ArrowLeft, MoreVertical, Scan, Image as ImageIcon, Keyboard, Zap, ZapOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import { fetchProductByBarcode } from '../services/OpenFoodFacts';
import { isValidBarcode } from '../services/Barcode';
import { preparePhoto, analyzePhoto } from '../services/Photo';
import type { Product } from '../types';
import { Button } from '../components/primitives/Button';
import { IconButton } from '../components/primitives/IconButton';
import { ManualBarcodeSheet } from '../components/scanner/ManualBarcodeSheet';
import { BottomSheet } from '../components/layout/BottomSheet';
import { analyzeProduct } from '../services/AnalysisEngine';

const cameraFrame = (): string | null => {
  const video = document.querySelector<HTMLVideoElement>('#reader-container video');
  if (!video?.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, 2000 / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.round(video.videoWidth * ratio); canvas.height = Math.round(video.videoHeight * ratio);
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
};
type CameraState = 'idle' | 'starting' | 'running' | 'error';
export const Scanner = () => {
  const navigate = useNavigate();
  const { allergies, recordScan } = useStore();
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const [options, setOptions] = useState(false);
  const [completed, setCompleted] = useState<{ id: string; product: Product } | null>(null);
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
  const blockedRef = useRef(false);
  useEffect(() => { blockedRef.current = options || manual || !!pendingPhoto || !!completed; }, [options, manual, pendingPhoto, completed]);
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
      setFrozenFrame(previous => cameraFrame() || previous);
      await stop();
      const product = await load(controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      if (!product) throw new Error('Produit introuvable. Photographiez les ingrédients ou vérifiez le code.');
      setCompleted({ id: recordScan(product), product });
    } catch (err) {
      if (mounted.current) setError(controller.signal.aborted ? 'La demande a été interrompue ou a pris trop de temps. Réessayez.' : err instanceof Error ? err.message : 'L’analyse a échoué. Réessayez.');
    } finally {
      clearTimeout(timer); processing.current = false;
      if (mounted.current) { setAnalyzing(false); setCamera('idle'); }
    }
  }, [recordScan, stop]);
  const scanBarcode = useCallback((code: string) => {
    if (!blockedRef.current && isValidBarcode(code)) void run(signal => fetchProductByBarcode(code, signal));
  }, [run]);
  useEffect(() => {
    if (!enabled || analyzing || manual || pendingPhoto || completed) return;
    let live = true;
    void lock(async () => {
      if (!live) return;
      setCamera('starting'); setCameraError(null); setFlashOn(false); setFlashSupported(false);
      try {
        if (scannerRef.current?.isScanning) await scannerRef.current.stop();
        if (!live) return;
        scannerRef.current ??= new Html5Qrcode('reader-container', { formatsToSupport: [Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.UPC_A], verbose: false });
        await scannerRef.current.start({ facingMode: 'environment' }, { fps: 10, aspectRatio: 1.25 }, scanBarcode, () => {});
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
  }, [enabled, cameraAttempt, analyzing, manual, pendingPhoto, completed, scanBarcode, lock, stop]);
  const flash = async () => {
    if (!scannerRef.current?.isScanning || !flashSupported) return;
    try { await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: !flashOn } as MediaTrackConstraintSet] }); setFlashOn(value => !value); }
    catch { setFlashSupported(false); setFlashOn(false); }
  };
  const importPhoto = (file: File) => { if (!processing.current) setPendingPhoto(() => () => preparePhoto(file)); };
  const capture = () => {
    const data = cameraFrame();
    if (!data) { fileRef.current?.click(); return; }
    setFrozenFrame(data); setPendingPhoto(() => async () => data);
  };
  const result = completed ? analyzeProduct(completed.product, allergies) : null;
  const statusLabel = result?.status === 'AVOID' ? 'À éviter' : result?.status === 'SAFE' ? 'Aucun allergène détecté' : 'À vérifier';
  return <div className="scanner-screen flex-1 min-h-0 flex flex-col bg-[#fafafa] text-[#202020] overflow-y-auto">
    <header className="flex items-center justify-between px-5 pt-6 pb-3 shrink-0">
      <IconButton icon={<ArrowLeft />} className="rounded-full border border-black/5" onClick={() => navigate('/')} aria-label="Fermer le scanner" />
      <h1 className="text-[22px] font-normal text-center">Scan produit</h1>
      <IconButton icon={<MoreVertical />} className="rounded-full border border-black/5" disabled={analyzing} onClick={() => setOptions(true)} aria-label="Options du scanner" />
    </header>
    <div className="flex-1 flex flex-col justify-center px-5 py-6 min-h-0">
      <div className="scanner-camera relative w-full aspect-[5/4] rounded-[28px] overflow-hidden bg-[#eeeeec] shrink-0">
        <div id="reader-container" />
        {camera !== 'running' && (frozenFrame || completed?.product.imageUrl) && <img src={frozenFrame || completed?.product.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        {camera !== 'running' && (!frozenFrame && !completed?.product.imageUrl || analyzing || camera === 'starting') && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#757575] pointer-events-none">
          {analyzing || camera === 'starting' ? <Loader2 className="w-10 h-10 animate-spin" /> : <Camera className="w-12 h-12" strokeWidth={1.2} />}
          <span className="text-sm">{analyzing ? 'Analyse en cours…' : camera === 'starting' ? 'Ouverture de la caméra…' : 'Aperçu caméra'}</span>
        </div>}
      </div>
      <div className="text-center mt-7 min-h-[72px]" aria-live="polite">
        {error ? <p role="alert" className="text-danger text-sm">{error}</p> : cameraError ? <p role="status" className="text-sm text-text-secondary">{cameraError}</p> : <p className="text-[20px] leading-snug">{analyzing ? 'Nous vérifions votre produit' : camera === 'running' ? 'Présentez votre produit devant la caméra' : 'Appuyez sur le bouton pour'}{!analyzing && camera !== 'running' && <><br />scanner votre produit</>}</p>}
        {!allergies.length && <button className="text-sm underline text-text-secondary mt-2" onClick={() => navigate('/profile')}>Configurer mes allergies</button>}
      </div>
    </div>
    <div className="flex justify-evenly items-center shrink-0 px-5 pt-3 pb-[max(32px,env(safe-area-inset-bottom))]">
      <IconButton icon={<ImageIcon strokeWidth={1.5} />} className="rounded-full border border-black/5" disabled={analyzing} onClick={() => fileRef.current?.click()} aria-label="Importer une photo des ingrédients" />
      <button type="button" disabled={analyzing || camera === 'starting'} onClick={() => { setCameraError(null); setError(null); setFrozenFrame(null); if (enabled && camera === 'running') { setEnabled(false); setCamera('idle'); } else { setEnabled(true); setCameraAttempt(value => value + 1); } }} aria-label={camera === 'running' ? 'Arrêter le scan' : 'Démarrer le scan'} className="w-[88px] h-[88px] rounded-full border-2 border-[#202020] p-[5px] shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500 disabled:opacity-50">
        <span className="w-full h-full bg-[#202020] rounded-full flex items-center justify-center text-white"><Scan className="w-8 h-8" strokeWidth={2} /></span>
      </button>
      <IconButton icon={flashOn ? <Zap strokeWidth={1.5} /> : <ZapOff strokeWidth={1.5} />} className="rounded-full border border-black/5" disabled={!flashSupported || camera !== 'running' || analyzing} onClick={() => void flash()} aria-label={flashOn ? 'Désactiver le flash' : flashSupported ? 'Activer le flash' : 'Flash indisponible'} />
    </div>
    <BottomSheet isOpen={options} onClose={() => setOptions(false)} title="Options du scanner">
      <Button variant="ghost" fullWidth leadingIcon={<Keyboard className="w-5 h-5" />} onClick={() => { setOptions(false); setManual(true); }}>Saisir le code</Button>
      <Button variant="ghost" fullWidth leadingIcon={<ImageIcon className="w-5 h-5" />} onClick={() => { setOptions(false); fileRef.current?.click(); }}>Importer une photo des ingrédients</Button>
      {camera === 'running' && <Button variant="ghost" fullWidth leadingIcon={<Camera className="w-5 h-5" />} onClick={() => { setOptions(false); capture(); }}>Photographier les ingrédients</Button>}
    </BottomSheet>
    <BottomSheet isOpen={!!completed} onClose={() => setCompleted(null)} title="Résultat du scan" centered>
      {completed && <>
        <div className="rounded-[26px] border border-black/5 p-4 mb-6 bg-[#fafafa]">
          <div className="flex items-center gap-3 mb-4">
            {completed.product.imageUrl ? <img src={completed.product.imageUrl} alt="" className="w-14 h-14 object-contain rounded-full bg-white" /> : <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center"><Scan className="w-6 h-6" /></div>}
            <div className="min-w-0"><h3 className="text-lg font-medium break-words">{completed.product.name}</h3><p className="text-sm text-text-secondary">{completed.product.source === 'photo' ? 'Photo des ingrédients' : `Code : ${completed.product.barcode}`}</p></div>
          </div>
          <p className={`font-medium ${result?.status === 'AVOID' ? 'text-danger' : result?.status === 'SAFE' ? 'text-verified' : 'text-amber-800'}`}>{statusLabel}</p>
          <p className="text-sm text-text-secondary mt-1">{result?.explanation}</p>
        </div>
        <button type="button" className="w-full rounded-full bg-[#202020] text-white py-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500" onClick={() => navigate(`/scan/${completed.id}`)}>Voir les détails</button>
      </>}
    </BottomSheet>
    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choisir une photo des ingrédients" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) importPhoto(file); }} />
    {manual && <ManualBarcodeSheet onClose={() => setManual(false)} onSubmit={code => { setManual(false); void run(signal => fetchProductByBarcode(code, signal)); }} />}
    <BottomSheet isOpen={!!pendingPhoto} onClose={() => setPendingPhoto(undefined)} title="Analyser cette photo ?">
      <p className="text-text-secondary leading-relaxed mb-4">La photo sera envoyée à Google Gemini pour lire les ingrédients. SafeEat ne conserve pas la photo sur son serveur. Évitez les informations personnelles et photographiez toute l’étiquette.</p>
      <Button fullWidth onClick={() => { const load = pendingPhoto; setPendingPhoto(undefined); if (load) void run(async signal => analyzePhoto(await load(), signal)); }}>Envoyer cette photo et analyser</Button>
      <Button fullWidth variant="ghost" onClick={() => setPendingPhoto(undefined)}>Annuler</Button>
    </BottomSheet>
  </div>;
};
