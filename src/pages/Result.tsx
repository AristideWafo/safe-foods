import * as LucideIcons from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Product, AnalysisResult, AllergenId } from '../types';
import { ALLERGENS } from '../constants/allergens';
import { ArrowLeft, ShieldCheck, TriangleAlert, CircleHelp, FileQuestion, ChevronDown, ChevronUp, Link as LinkIcon, Eye, RefreshCw, CheckCircle2, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { IconButton } from '../components/primitives/IconButton';
import { Button } from '../components/primitives/Button';
import { fetchProductByBarcode } from '../services/OpenFoodFacts';
import { analyzeProduct } from '../services/AnalysisEngine';
import { InlineNotice } from '../components/feedback/InlineNotice';

export const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { barcode: urlBarcode } = useParams<{ barcode: string }>();
  const { addHistoryItem, allergies } = useStore();
  
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(!location.state?.product);
  const [error, setError] = useState<string | null>(null);
  
  const [data, setData] = useState<{ product: Product | null; result: AnalysisResult | null; barcode: string }>(() => {
    if (location.state?.product) {
      return { product: location.state.product, result: location.state.result, barcode: location.state.barcode };
    }
    return { product: null, result: null, barcode: urlBarcode || '' };
  });

  useEffect(() => {
    const loadData = async () => {
      if (!data.product && urlBarcode) {
        try {
          const product = await fetchProductByBarcode(urlBarcode);
          if (product) {
            const result = analyzeProduct(product, allergies);
            setData({ product, result, barcode: urlBarcode });
          } else {
            setError('Produit introuvable');
          }
        } catch (err) {
          setError('Erreur réseau');
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [data.product, urlBarcode, allergies]);

  const { product, result, barcode } = data;

  const handleSave = () => {
    if (!product || !result) return;
    addHistoryItem({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
      date: Date.now(),
      barcode: barcode || product.barcode || 'unknown',
      product,
      result,
    });
    setSaved(true);
  };

  const getHeroTheme = () => {
    if (!result) return { bg: 'bg-black', icon: <FileQuestion />, title: 'ERREUR' };
    switch (result.status) {
      case 'AVOID': return {
        bg: 'var(--gradient-danger)',
        icon: <TriangleAlert className="w-[60px] h-[60px] text-danger fill-white" strokeWidth={2.5} />,
        title: 'À ÉVITER'
      };
      case 'UNCERTAIN': return {
        bg: 'var(--amber-400)',
        icon: <TriangleAlert className="w-[60px] h-[60px] text-warning fill-white" strokeWidth={2.5} />,
        title: 'PRUDENCE'
      };
      case 'SAFE': return {
        bg: 'linear-gradient(135deg, #1769ff 0%, #0e55db 100%)',
        icon: <ShieldCheck className="w-[60px] h-[60px] text-primary-500 fill-white" strokeWidth={2.5} />,
        title: 'AUCUN DÉTECTÉ'
      };
      default: return {
        bg: 'linear-gradient(135deg, #677189 0%, #35425c 100%)',
        icon: <FileQuestion className="w-[60px] h-[60px] text-text-secondary" />,
        title: 'INCONNU'
      };
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-full flex flex-col justify-center items-center bg-background">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-text-primary font-bold">Analyse en cours...</p>
      </div>
    );
  }

  if (error || !product || !result) {
    return (
      <div className="flex-1 min-h-full flex flex-col bg-background relative">
        <div className="pt-[max(16px,env(safe-area-inset-top))] px-6">
          <IconButton icon={<ArrowLeft />} onClick={() => navigate('/')} aria-label="Retour" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-surface rounded-3xl shadow-sm flex items-center justify-center mb-6">
            <TriangleAlert className="w-10 h-10 text-warning" />
          </div>
          <h1 className="text-text-primary text-title-lg font-display font-bold mb-2">{error || 'Produit introuvable'}</h1>
          <p className="text-text-secondary mb-8">{barcode}</p>
          <Button onClick={() => navigate('/scanner')}>Nouvelle analyse</Button>
        </div>
      </div>
    );
  }

  const theme = getHeroTheme();
  
  // Format detected allergens for summary
  const getSummary = () => {
    if (result.status === 'SAFE') return product.name || "Produit scanné";
    const all = [...result.detectedAllergens, ...result.detectedTraces];
    if (all.length === 0) return product.name || "Produit";
    const names = all.map(id => ALLERGENS.find(a => a.id === id)?.label).filter(Boolean);
    return `${names.join(', ')} détecté${names.length > 1 ? 's' : ''}`;
  };

  return (
    <div className="flex-1 min-h-full flex flex-col bg-background relative overflow-hidden">
      
      {/* Hero Section */}
      <div 
        className={clsx(
          "w-full h-[340px] relative flex flex-col items-center pt-[max(16px,env(safe-area-inset-top))] transition-colors",
          result?.status === 'UNCERTAIN' ? "text-amber-950" : "text-white"
        )}
        style={{ background: theme.bg }}
      >
        {/* Header inside Hero */}
        <div className="w-full px-6 flex justify-between items-center z-20">
          <IconButton icon={<ArrowLeft />} tone={result?.status === 'UNCERTAIN' ? 'neutral' : 'light'} onClick={() => navigate('/')} aria-label="Retour à l'accueil" />
        </div>

        {/* Hero Content */}
        <div className="flex-1 w-full flex flex-col items-center justify-center z-10 -mt-4">
          <div className="w-[104px] h-[104px] bg-white rounded-full flex items-center justify-center shadow-[0_14px_34px_rgba(13,27,54,0.18)] mb-4">
            {theme.icon}
          </div>
          <h1 className="text-display-xl font-display font-extrabold text-center leading-none mb-1 px-4 drop-shadow-md">
            {theme.title}
          </h1>
          <p className="font-bold text-[18px] text-center px-6 truncate w-full drop-shadow-sm opacity-90">
            {getSummary()}
          </p>
        </div>
      </div>

      {/* Result Sheet (Overlaps Hero) */}
      <div className="flex-1 bg-background rounded-t-[30px] -mt-[30px] z-20 flex flex-col relative shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
        <div className="flex-1 overflow-y-auto pb-safe">
          
          <div className="px-6 pt-8 pb-4">
            <EvidenceAccordion result={result} product={product} />

            <div className="mt-4 mb-6">
              <div className="bg-[#FFF8E7] rounded-2xl p-4 border border-[#FFE8A1] flex gap-3 relative">
                <ShieldCheck className="w-6 h-6 text-warning shrink-0" />
                <div className="pr-6">
                  <h3 className="text-[15px] text-text-primary font-bold mb-1">Source</h3>
                  <p className="text-[13px] text-text-secondary leading-snug mb-1">
                    {barcode === 'SCAN_OCR' ? 'Analyse de la photo.' : 'Données issues de l\'étiquette scannée.'}<br/>
                    Mise à jour : aujourd'hui
                  </p>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-warning flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              </div>
            </div>
            
            {barcode !== 'SCAN_OCR' && (
              <div className="mt-6 mb-6">
                <h3 className="text-[14px] font-bold text-text-primary uppercase tracking-wider mb-3">Base de données</h3>
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] text-amber-900 font-semibold mb-1">Open Food Facts</p>
                    <p className="text-[12px] text-amber-800/80 mb-2">Les informations sont basées sur une base de données collaborative. Vérifiez toujours l'étiquette physique.</p>
                    <a href={`https://world.openfoodfacts.org/product/${barcode}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-[13px] font-bold text-amber-700 hover:underline">
                      <LinkIcon className="w-3 h-3 mr-1" />
                      Voir la fiche produit
                    </a>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[12px] text-text-muted leading-relaxed italic text-center px-4">
              SafeEat est un outil d'aide. Vérifiez toujours l'étiquette et les conseils du fabricant. En cas de doute ou d'allergie sévère, ne consommez pas le produit.
            </p>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="p-6 bg-white border-t border-border-subtle shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] pb-[max(24px,env(safe-area-inset-bottom))]">
          <Button 
            fullWidth 
            size="lg" 
            variant="primary"
            onClick={() => navigate('/scanner')}
            leadingIcon={<RefreshCw className="w-5 h-5" />}
          >
            Nouvelle analyse
          </Button>
        </div>
      </div>
    </div>
  );
};

const EvidenceAccordion = ({ result, product }: { result: AnalysisResult, product: Product }) => {
  const [expanded, setExpanded] = useState(result.status !== 'SAFE');
  const allAllergens = [...result.detectedAllergens, ...result.detectedTraces];

  if (allAllergens.length === 0 && !product.ingredientsText) {
    return (
      <InlineNotice 
        tone="warning" 
        title="Liste d'ingrédients absente" 
        description="L'analyse repose uniquement sur les tags du produit."
      />
    );
  }

  return (
    <div className="border border-border-subtle rounded-[20px] bg-white overflow-hidden mb-6 shadow-sm">
      <button 
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between p-4 focus:outline-none focus-visible:bg-black/5"
      >
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-violet-500" />
          <span className="font-bold text-[16px] text-text-primary">Voir les preuves</span>
        </div>
        {expanded ? <ChevronUp className="w-6 h-6 text-text-primary" /> : <ChevronDown className="w-6 h-6 text-text-primary" />}
      </button>

      <div 
        className={clsx(
          "overflow-hidden transition-all duration-[220ms] ease-[cubic-bezier(.22,1,.36,1)] px-4",
          expanded ? "max-h-[1000px] opacity-100 pb-4" : "max-h-0 opacity-0 invisible"
        )}
        aria-hidden={!expanded}
        {...(!expanded ? { inert: "" } : {})}
      >
        <div className="h-[1px] bg-border-subtle w-full mb-4" />
        
        {allAllergens.length > 0 ? (
          <div className="flex flex-col gap-4">
            {allAllergens.map(id => {
              const def = ALLERGENS.find(a => a.id === id);
              if (!def) return null;
              
              const isConfirmed = result.detectedAllergens.includes(id);
              const isTrace = result.detectedTraces.includes(id);
              
              let badgeText = "Ingrédient";
              if (isTrace) badgeText = "Trace";
              if (product.barcode === 'SCAN_OCR') badgeText = "OCR";
              
              let explanation = "Présent dans la liste des ingrédients.";
              if (isConfirmed && product.barcode !== 'SCAN_OCR') {
                explanation = "Confirmé par Open Food Facts.";
              } else if (isTrace && product.barcode !== 'SCAN_OCR') {
                explanation = "Trace déclarée par le fabricant.";
              } else if (!isConfirmed && isTrace && product.barcode !== 'SCAN_OCR') {
                explanation = "Mention trouvée dans le texte.";
              } else if (product.barcode === 'SCAN_OCR') {
                explanation = "Détecté par analyse de l'image.";
              }

              return (
                <div key={id} className="flex flex-col gap-2">
                  <div>
                    <span className={clsx(
                      "inline-block text-[11px] font-bold px-2.5 py-1 rounded-full mb-2 uppercase tracking-wider",
                      badgeText === "Ingrédient" ? "bg-danger text-white" :
                      badgeText === "Trace" ? "bg-warning/20 text-amber-900" :
                      "bg-violet-100 text-violet-600"
                    )}>
                      {badgeText}
                    </span>
                    <p className="text-[15px] text-text-primary mb-1">
                      <strong className="font-extrabold uppercase">{def.label}</strong>
                    </p>
                    <p className="text-[13px] text-text-secondary leading-snug pr-20">
                      {explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-black/5 rounded-xl p-4">
            <h4 className="text-[13px] font-bold text-text-primary mb-2">Ingrédients déclarés :</h4>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              {product.ingredientsText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
