import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, TriangleAlert, Eye, RefreshCw, Info, Link as LinkIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Product, AnalysisResult } from '../types';
import { getAllergenDefinitions } from '../constants/customAllergens';
import { IconButton } from '../components/primitives/IconButton';
import { Button } from '../components/primitives/Button';
import { fetchProductByBarcode } from '../services/OpenFoodFacts';
import { INGREDIENT_KEYWORDS } from '../constants/allergens';
import { AMBIGUOUS_KEYWORDS, EXCLUDED_PHRASES } from '../constants/detectionRules';
import { analyzeProduct, normalizeIngredientText } from '../services/AnalysisEngine';

export const Result = () => {
  const navigate = useNavigate();
  const { barcode, scanId } = useParams<{ barcode: string; scanId: string }>();
  const { history, allergies, customAllergens, recordScan } = useStore();
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
  const result = analyzeProduct(scan.product, allergies, customAllergens);
  return <ResultView key={scan.id} product={scan.product} result={result} onBack={() => navigate('/')} onScan={() => navigate('/scanner')} onCheckLabel={() => navigate('/scanner', { state: { referenceScanId: scan.id } })} onProfile={() => navigate('/profile')} profileEmpty={!allergies.length} onVerify={() => {
    const product = { ...scan.product, labelVerified: true, verifiedAt: Date.now(), labelReadable: true, ingredientsComplete: true, warningsComplete: true, language: 'fr' };
    navigate(`/scan/${recordScan(product)}`);
  }} />;
};

export const ResultView = ({ product, result, onBack, onScan, onProfile, profileEmpty, onVerify, onCheckLabel }: {
  product: Product; result: AnalysisResult; onBack: () => void; onScan: () => void; onProfile: () => void; profileEmpty: boolean; onVerify?: () => void; onCheckLabel?: () => void;
}) => {
  const [checks, setChecks] = useState([false, false, false]);
  const definitions = getAllergenDefinitions(useStore(state => state.customAllergens));
  const detectedNames = definitions.filter(a => result.evidence?.some(e => e.allergen === a.id && ['declared', 'ingredient'].includes(e.kind)) || result.detectedAllergens.includes(a.id)).map(a => a.label).join(', ');
  const theme = result.status === 'AVOID' ? { title: 'À ÉVITER', bg: 'var(--gradient-danger)' }
    : result.status === 'UNCERTAIN' ? { title: 'À VÉRIFIER', bg: 'var(--amber-400)' }
    : { title: 'AUCUNE CORRESPONDANCE', bg: 'var(--information)' };
  return <div className="flex-1 min-h-0 h-full flex flex-col bg-background overflow-y-auto">
    <div className="shrink-0 flex gap-3 items-center px-5 pt-[max(16px,env(safe-area-inset-top))] pb-5"><IconButton icon={<ArrowLeft />} onClick={onBack} aria-label="Retour à l’accueil" /><h1 className="font-display font-bold text-[22px]">Résultat du scan</h1></div>
    <header className={`shrink-0 mx-5 rounded-[28px] px-6 py-7 ${result.status === 'UNCERTAIN' ? 'text-amber-950' : 'text-white'}`} style={{ background: theme.bg }}>
      <button onClick={onProfile} className="block mx-auto rounded-full bg-[#101827] text-white text-[13px] font-bold px-4 py-2 mb-6">{profileEmpty ? 'PROFIL À CONFIGURER' : 'PROFIL : ALLERGIES ACTIVES'}</button>
      <div className="flex flex-col items-center gap-3">
        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-information">{result.status === 'SAFE' ? <Eye className="w-12 h-12" /> : <TriangleAlert className="w-12 h-12 text-danger" />}</div>
        <h2 className="text-[28px] text-center font-display font-extrabold">{theme.title}</h2>
        <p className="font-bold text-center break-words">{product.name}</p>
        {result.status === 'AVOID' && <p className="font-bold text-center">Allergène détecté : {detectedNames}</p>}
        {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="h-28 w-28 object-contain rounded-2xl bg-white p-2 mt-2" />}
      </div>
    </header>
    <div className="guardian-card relative shrink-0 mx-5 -mt-2 rounded-t-[28px] bg-white px-5 py-6 space-y-5">
      <div className="w-12 h-1.5 rounded-full bg-border-subtle mx-auto" aria-hidden="true" />
      <p className="text-[15px] leading-relaxed" role="status">{result.status === 'AVOID' ? 'Ce produit contient un allergène de votre profil. Évitez de le consommer.' : result.explanation}</p>
      {profileEmpty && <Button fullWidth onClick={onProfile}>Configurer mes allergies</Button>}
      <EvidenceAccordion product={product} result={result} />
      {onCheckLabel && <Button fullWidth variant="secondary" onClick={onCheckLabel}>{result.status === 'AVOID' ? 'Un doute ? Vérifier avec une photo' : 'Vérifier ce produit avec une photo'}</Button>}
      {product.comparison && <section className="rounded-xl bg-background p-4 space-y-2 text-sm"><h2 className="font-bold">Observation précédente conservée</h2><p>{product.comparison.name} · {product.comparison.source} · {formatDate(product.comparison.fetchedAt)}</p><p className="whitespace-pre-wrap break-words">{product.comparison.ingredientsText}</p><p className="whitespace-pre-wrap break-words">{product.comparison.warningsText}</p><p>{product.sourceConflict ? 'Les données divergent. Aucune fusion ni validation automatique ; vérifiez les deux observations et l’emballage.' : 'Les textes concordent, mais leur accord ne prouve pas la sécurité du produit.'}</p></section>}
      {result.status !== 'AVOID' && !!result.qualityIssues?.length && <section className="rounded-xl bg-background p-4 text-sm" aria-label="Limites de l’analyse"><h2 className="font-bold mb-2">Ce qui empêche de conclure</h2><ul className="list-disc pl-5 space-y-1">{result.qualityIssues.map(issue => <li key={issue}>{issue}</li>)}</ul></section>}
      {result.status !== 'AVOID' && onVerify && !product.labelVerified && !product.sourceConflict && !!product.ingredientsText.trim() && <section className="rounded-xl bg-background p-4 space-y-3 text-sm">
        <h2 className="font-bold">Relire l’étiquette réelle</h2>
        <p>Ne confirmez que si les textes affichés correspondent exactement à votre emballage. Une relecture n’est pas une garantie de sécurité. S’il manque une ligne ou un avertissement, reprenez une photo ; ne confirmez pas.</p>
        {[
          'J’ai vérifié l’identité du produit et l’étiquette est en français.',
          'Le texte affiché contient toute la liste lisible des ingrédients, du début à la fin.',
          'J’ai vérifié toutes les zones d’avertissements : leurs mentions figurent dans les textes affichés, ou il n’y en a aucune sur l’emballage.',
        ].map((label, index) => <label key={label} className="flex gap-3 items-start"><input type="checkbox" checked={checks[index]} onChange={event => setChecks(old => old.map((v, i) => i === index ? event.target.checked : v))} /><span>{label}</span></label>)}
        <Button fullWidth disabled={!checks.every(Boolean)} onClick={onVerify}>Enregistrer une relecture séparée</Button>
      </section>}
      <div className="rounded-[24px] bg-[#f4ede3] p-4 text-[13px] leading-relaxed">
        <h2 className="font-bold text-[15px] flex gap-2 items-center"><Info className="w-5 h-5" />Source et consultation</h2>
        <p>{product.source === 'photo' || product.barcode === 'SCAN_OCR' ? 'Lecture automatique de votre photo par Google Gemini.' : 'Fiche collaborative Open Food Facts.'}</p>
        <p>Consultation : {formatDate(product.fetchedAt)}</p>
        {product.verifiedAt && <p>Relecture utilisateur : {formatDate(product.verifiedAt)}</p>}
        <details className="mt-2"><summary className="cursor-pointer font-bold">Détails techniques</summary><p>Moteur : {result.engineVersion || 'non renseigné'} · Dictionnaire : {result.dictionaryVersion || 'non renseigné'}</p>{result.evidence?.map((proof, index) => <p key={index}>Règle : {proof.rule}</p>)}</details>
        {product.source !== 'photo' && product.barcode !== 'SCAN_OCR' && <>
          <p>Mise à jour de la fiche : {formatDate(product.updatedAt)}</p>
          <a href={`https://world.openfoodfacts.org/product/${encodeURIComponent(product.barcode)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold underline mt-2"><LinkIcon className="w-4 h-4" />Voir la fiche produit</a>
        </>}
      </div>
      <p className="text-[13px] text-text-secondary">Analyse enregistrée dans ce navigateur. Le résultat est recalculé avec vos allergies actuelles ; la date de consultation reste celle du scan.</p>
      <p className="text-[13px] text-text-secondary leading-relaxed">SafeEat est un outil d’aide. Vérifiez toujours l’étiquette et les conseils du fabricant. En cas de doute ou d’allergie sévère, ne consommez pas le produit.</p>
    </div>
    <footer className="shrink-0 mx-5 bg-white rounded-b-[28px] px-5 pb-6">
      <Button fullWidth size="lg" onClick={onScan} leadingIcon={<RefreshCw className="w-5 h-5" />}>Nouvelle analyse</Button>
      <Button fullWidth variant="ghost" onClick={onBack}>Retour à l’accueil</Button>
    </footer>
  </div>;
};
const formatDate = (date?: number) => date && Number.isFinite(date) ? new Date(date).toLocaleString('fr-FR') : 'non renseignée';

// Keep the original text intact; only emphasize matches supported by the analysis.
const HighlightedIngredients = ({ text, result }: { text: string; result: AnalysisResult }) => {
  const definitions = getAllergenDefinitions(useStore(state => state.customAllergens));
  const ranges: [number, number][] = [];
  const normalized = normalizeIngredientText(text);
  // Map normalized characters back to the original text, including accents and œ.
  const offsets: number[] = [];
  let previousSpace = false;
  for (let i = 0; i < text.length; i++) {
    for (const char of normalizeIngredientText(text[i])) {
      if (char === ' ' && previousSpace) continue;
      offsets.push(i);
      previousSpace = char === ' ';
    }
  }
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = (value: string) => new RegExp(`(?<![a-z0-9])${escape(normalizeIngredientText(value))}(?:s|es)?(?![a-z0-9])`, 'g');
  for (const allergen of definitions) {
    const proofs = result.evidence?.filter(e => e.allergen === allergen.id && e.source === 'ingredients' && e.kind !== 'claim') || [];
    if (!proofs.length) continue;
    const exclusions = (EXCLUDED_PHRASES[allergen.id] || []).flatMap(phrase => [...normalized.matchAll(pattern(phrase))].map(m => [m.index!, m.index! + m[0].length]));
    for (const keyword of [...(allergen.keywords || INGREDIENT_KEYWORDS[allergen.id] || [allergen.label]), ...(AMBIGUOUS_KEYWORDS[allergen.id] || [])]) {
      for (const match of normalized.matchAll(pattern(keyword))) {
        const start = match.index!;
        if (exclusions.some(([a, b]) => start >= a && start < b)) continue;
        const localBefore = normalized.slice(0, start).split(/[.,;\n]/).at(-1)!;
        const after = normalized.slice(start + match[0].length);
        if (/(?:\bsans|\bexempt(?:e)? de|\bne contient pas(?: de)?|\bfree (?:of|from))(?:\s+d[eu])?\s*$/.test(localBefore) || /^\s*free\b/.test(after)) continue;
        const from = offsets[start], to = offsets[start + match[0].length - 1] + 1;
        // Claims such as “sans lait” must not appear as a positive ingredient.
        const sentenceStart = Math.max(text.lastIndexOf('.', from), text.lastIndexOf(';', from), text.lastIndexOf('\n', from)) + 1;
        const sentenceEnd = text.slice(from).search(/[.;\n]/);
        const sentence = text.slice(sentenceStart, sentenceEnd < 0 ? text.length : from + sentenceEnd).trim();
        if (proofs.some(e => e.quote === sentence)) ranges.push([from, to]);
      }
    }
  }
  const merged: [number, number][] = [];
  for (const range of ranges.sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  let cursor = 0;
  return <>{merged.map(([start, end]) => {
    const prefix = text.slice(cursor, start);
    cursor = end;
    return <span key={start}>{prefix}<strong className="font-extrabold underline decoration-danger decoration-2 underline-offset-2">{text.slice(start, end)}</strong></span>;
  })}{text.slice(cursor)}</>;
};

export const EvidenceAccordion = ({ result, product }: { result: AnalysisResult; product: Product }) => {
  const customAllergens = useStore(state => state.customAllergens);
  const all = getAllergenDefinitions(customAllergens).filter(a => [...result.detectedAllergens, ...result.detectedTraces, ...(result.textualMatches || []), ...(result.evidence || []).map(e => e.allergen)].includes(a.id));
  const source = product.source === 'photo' || product.barcode === 'SCAN_OCR' ? 'la lecture automatique de votre photo' : product.source === 'label' ? 'votre étiquette relue' : 'la fiche Open Food Facts';
  const labels = {
    ingredient: 'Dans les ingrédients', declared: 'Allergène signalé dans la fiche produit',
    possible_presence: 'Présence possible signalée', facility: 'Avertissement d’atelier',
    ambiguous: 'Mention à clarifier', claim: 'Mention « sans » : elle ne garantit pas l’absence',
  };
  return <section className="space-y-4" aria-label="Pourquoi ce résultat ?">
    <h2 className="flex items-center gap-2 font-bold"><Eye className="w-5 h-5 text-violet-600" />Pourquoi ?</h2>
    {all.length > 0 && <p className="text-sm text-text-secondary">Voici ce que nous avons repéré dans {source} :</p>}
    {all.map(a => {
      const proofs = result.evidence?.filter(e => e.allergen === a.id) || [];
      const kinds = [...new Set(proofs.map(e => e.kind))];
      return <div key={a.id} className="rounded-xl bg-[#f5f0ff] p-4 space-y-2 text-sm">
        <h3 className="font-bold text-base">{a.label}</h3>
        <ul className="list-disc pl-5 space-y-2">{kinds.map(kind => {
          const words = [...new Set(proofs.filter(e => e.kind === kind && e.rule.startsWith('keyword:')).map(e => e.rule.slice(8)))];
          return <li key={kind}>{kind === 'ingredient' && !proofs.some(e => e.kind === kind && e.source === 'ingredients') ? 'Dans les avertissements' : labels[kind]}{words.length ? <> : <strong>{words.join(', ')}</strong>.</> : '.'}</li>;
        })}
        {!proofs.length && <>
          {result.detectedAllergens.includes(a.id) && <li>Allergène signalé dans la fiche produit.</li>}
          {result.detectedTraces.includes(a.id) && <li>Présence possible signalée.</li>}
          {result.textualMatches?.includes(a.id) && <li>Mention repérée dans les ingrédients.</li>}
        </>}</ul>
      </div>;
    })}
    <div className="bg-background rounded-xl p-4"><h2 className="font-bold text-sm mb-2">Liste complète des ingrédients</h2><p className="text-sm leading-relaxed whitespace-pre-wrap break-words"><HighlightedIngredients text={product.ingredientsText || 'Liste indisponible. Retrouvez-la sur l’emballage.'} result={result} /></p></div>
    <div className="text-sm text-text-secondary"><h2 className="font-bold mb-1">Avertissements</h2><p className="whitespace-pre-wrap break-words">{product.warningsText || 'La source ne fournit pas d’avertissements. Pensez à consulter ceux de l’emballage.'}</p></div>
  </section>;
};
