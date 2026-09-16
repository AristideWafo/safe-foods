import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, TriangleAlert, ChevronDown, Eye, RefreshCw, Info, Link as LinkIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Product, AnalysisResult } from '../types';
import { ALLERGENS } from '../constants/allergens';
import { IconButton } from '../components/primitives/IconButton';
import { Button } from '../components/primitives/Button';
import { fetchProductByBarcode } from '../services/OpenFoodFacts';
import { analyzeProduct } from '../services/AnalysisEngine';

export const Result = () => {
  const navigate = useNavigate();
  const { barcode, scanId } = useParams<{ barcode: string; scanId: string }>();
  const { history, allergies, recordScan } = useStore();
  const scan = history.find(item => item.id === scanId);
  const [loadError, setLoadError] = useState<{ barcode: string; message: string } | null>(null);
  const staticError = scanId ? (!scan ? 'Cette analyse n’est plus dans l’historique de ce navigateur.' : null)
    : !barcode || barcode === 'SCAN_OCR' || barcode.startsWith('OCR-') ? 'Cette analyse n’a pas été sauvegardée. Scannez à nouveau le produit ou les ingrédients.' : null;
  const error = staticError || (loadError?.barcode === barcode ? loadError?.message : null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    if (!scanId && barcode && !staticError) {
      void fetchProductByBarcode(barcode, controller.signal).then(product => {
        if (controller.signal.aborted) return;
        if (!product) { setLoadError({ barcode, message: 'Produit introuvable. Vous pouvez photographier les ingrédients.' }); return; }
        navigate(`/scan/${recordScan(product)}`, { replace: true });
      }).catch(error => { if (!controller.signal.aborted) setLoadError({ barcode, message: error instanceof Error ? error.message : 'Erreur lors de la recherche.' }); });
    }
    return () => controller.abort();
  }, [barcode, scanId, scan, recordScan, navigate, retry, staticError]);
  if (error) return <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-6 bg-background" role="alert">
    <TriangleAlert className="w-12 h-12 text-warning" />
    <h1 className="text-title-lg font-bold">Analyse indisponible</h1><p>{error}</p>
    {barcode && !barcode.startsWith('OCR') && barcode !== 'SCAN_OCR' && <Button onClick={() => { setLoadError(null); setRetry(value => value + 1); }}>Réessayer la recherche</Button>}
    <Button onClick={() => navigate('/scanner')}>Scanner ou importer une photo</Button>
    <Button variant="ghost" onClick={() => navigate('/')}>Retour à l’accueil</Button>
  </div>;
  if (!scan) return <div className="flex-1 flex flex-col items-center justify-center gap-4" role="status" aria-live="polite"><RefreshCw className="animate-spin w-10 h-10 text-primary-500" /><p>Recherche du produit…</p></div>;
  const result = analyzeProduct(scan.product, allergies);
  return <ResultView product={scan.product} result={result} onBack={() => navigate('/')} onScan={() => navigate('/scanner')} onProfile={() => navigate('/profile')} profileEmpty={!allergies.length} />;
};

export const ResultView = ({ product, result, onBack, onScan, onProfile, profileEmpty }: {
  product: Product; result: AnalysisResult; onBack: () => void; onScan: () => void; onProfile: () => void; profileEmpty: boolean;
}) => {
  const theme = result.status === 'AVOID' ? { title: 'À ÉVITER', bg: 'var(--gradient-danger)' }
    : result.status === 'UNCERTAIN' ? { title: 'PRUDENCE', bg: 'var(--amber-400)' }
    : { title: 'AUCUN DÉTECTÉ', bg: 'linear-gradient(135deg, #1769ff, #0e55db)' };
  return <div className="flex-1 min-h-0 h-full flex flex-col bg-background">
    <header className={`shrink-0 px-6 pt-[max(16px,env(safe-area-inset-top))] pb-6 ${result.status === 'UNCERTAIN' ? 'text-amber-950' : 'text-white'}`} style={{ background: theme.bg }}>
      <IconButton icon={<ArrowLeft />} tone={result.status === 'UNCERTAIN' ? 'neutral' : 'light'} onClick={onBack} aria-label="Retour à l’accueil" />
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary-600">{result.status === 'SAFE' ? <ShieldCheck className="w-10 h-10" /> : <TriangleAlert className="w-10 h-10 text-amber-700" />}</div>
        <h1 className="text-[28px] font-display font-extrabold">{theme.title}</h1>
        <p className="font-bold text-center break-words">{product.name}</p>
      </div>
    </header>
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-5">
      <p className="text-[15px] leading-relaxed" role="status">{result.explanation}</p>
      {profileEmpty && <Button fullWidth onClick={onProfile}>Configurer mes allergies</Button>}
      <EvidenceAccordion product={product} result={result} />
      <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-[13px] leading-relaxed">
        <h2 className="font-bold text-[15px] flex gap-2 items-center"><Info className="w-5 h-5" />Source et consultation</h2>
        <p>{product.source === 'photo' || product.barcode === 'SCAN_OCR' ? 'Lecture automatique de votre photo par Google Gemini.' : 'Fiche collaborative Open Food Facts.'}</p>
        <p>Consultation : {formatDate(product.fetchedAt)}</p>
        {product.source !== 'photo' && product.barcode !== 'SCAN_OCR' && <>
          <p>Mise à jour de la fiche : {formatDate(product.updatedAt)}</p>
          <a href={`https://world.openfoodfacts.org/product/${encodeURIComponent(product.barcode)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold underline mt-2"><LinkIcon className="w-4 h-4" />Voir la fiche produit</a>
        </>}
      </div>
      <p className="text-[13px] text-text-secondary">Analyse enregistrée dans ce navigateur. Le résultat est recalculé avec vos allergies actuelles ; la date de consultation reste celle du scan.</p>
      <p className="text-[13px] text-text-secondary leading-relaxed">SafeEat est un outil d’aide. Vérifiez toujours l’étiquette et les conseils du fabricant. En cas de doute ou d’allergie sévère, ne consommez pas le produit.</p>
    </div>
    <footer className="shrink-0 bg-white border-t border-border-subtle p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <Button fullWidth size="lg" onClick={onScan} leadingIcon={<RefreshCw className="w-5 h-5" />}>Nouvelle analyse</Button>
    </footer>
  </div>;
};
const formatDate = (date?: number) => date && Number.isFinite(date) ? new Date(date).toLocaleString('fr-FR') : 'non renseignée';

export const EvidenceAccordion = ({ result, product }: { result: AnalysisResult; product: Product }) => {
  const all = ALLERGENS.filter(a => [...result.detectedAllergens, ...result.detectedTraces, ...(result.textualMatches || [])].includes(a.id));
  const photo = product.source === 'photo' || product.barcode === 'SCAN_OCR';
  return <details className="rounded-[20px] border border-border-subtle bg-white p-4" open={result.status !== 'SAFE'}>
    <summary className="flex justify-between items-center cursor-pointer font-bold focus-visible:outline-primary-500"><span className="flex items-center gap-2"><Eye className="w-5 h-5 text-violet-600" />Voir les preuves</span><ChevronDown className="w-5 h-5" /></summary>
    <div className="pt-4 space-y-4">
      {all.map(a => <div key={a.id}>
        <h3 className="font-bold">{a.label}</h3>
        {result.detectedAllergens.includes(a.id) && <p className="text-[13px]">{photo ? 'Ingrédient repéré par lecture automatique de la photo, à vérifier.' : 'Allergène signalé dans les tags Open Food Facts.'}</p>}
        {result.detectedTraces.includes(a.id) && <p className="text-[13px]">{photo ? 'Avertissement de traces repéré sur la photo, à vérifier.' : 'Trace signalée dans la fiche Open Food Facts.'}</p>}
        {result.textualMatches?.includes(a.id) && <p className="text-[13px]">Mention trouvée dans le texte des ingrédients, sans confirmation par les tags.</p>}
      </div>)}
      <div className="bg-background rounded-xl p-4"><h3 className="font-bold text-[14px] mb-2">Ingrédients et avertissements disponibles</h3><p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{product.ingredientsText || 'Liste non disponible : vérifiez l’emballage.'}</p></div>
    </div>
  </details>;
};
