import React from 'react';
import { Link } from 'react-router-dom';
import { Check, CircleAlert, OctagonX, Package, Star, TriangleAlert, X } from 'lucide-react';
import type { AnalysisStatus, ScanHistoryItem } from '../../types';
import { getAllergenDefinitions } from '../../constants/customAllergens';
import { useStore } from '../../store/useStore';

interface RecentScanRowProps { id: string; barcode: string; productName: string; scannedAt: string; thumbnailUrl?: string; status: AnalysisStatus; scanItem?: ScanHistoryItem; }

export const RecentScanRow: React.FC<RecentScanRowProps> = ({ id, productName, scannedAt, thumbnailUrl, status, scanItem }) => {
  const { history, customAllergens, toggleFavorite } = useStore();
  const scan = scanItem || history.find(item => item.id === id);
  const result = scan?.result;
  const currentStatus = result?.status || status;
  const tone = currentStatus === 'AVOID' ? 'danger' : currentStatus === 'SAFE' ? 'safe' : 'caution';
  const verdict = currentStatus === 'AVOID' ? 'À éviter' : currentStatus === 'SAFE' ? 'Aucune correspondance' : 'À vérifier';
  const allergens = getAllergenDefinitions(customAllergens).filter(allergen => result && [...result.detectedAllergens, ...result.detectedTraces, ...(result.textualMatches || [])].includes(allergen.id));
  const allergenLabel = allergens.length ? `${result?.detectedTraces.length && !result.detectedAllergens.length ? 'Traces : ' : ''}${allergens.map(allergen => allergen.label).join(', ')}` : currentStatus === 'SAFE' ? 'Selon votre profil' : 'Données incertaines';
  const description = [scan?.product.brand, scan?.product.quantity].filter(Boolean).join(' • ') || (scan?.product.source === 'photo' ? 'Photo des ingrédients' : 'Fiche Open Food Facts');
  const time = scan ? new Date(scan.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : scannedAt;
  const StatusIcon = currentStatus === 'AVOID' ? OctagonX : currentStatus === 'SAFE' ? Check : CircleAlert;
  return <article className={`stitch-product-card stitch-product-${tone}`}>
    <Link to={`/scan/${encodeURIComponent(id)}`} className="stitch-product-link" aria-label={`Voir l’analyse de ${productName || 'Produit inconnu'}, ${verdict}`}>
      <div className="stitch-product-top">
        <div className="stitch-product-thumbnail">{thumbnailUrl ? <img src={thumbnailUrl} alt="" /> : <Package aria-hidden="true" className="w-8 h-8" />}<span className="stitch-product-indicator" aria-hidden="true">{currentStatus === 'AVOID' ? <X /> : currentStatus === 'SAFE' ? <Check /> : <CircleAlert />}</span></div>
        <div className="stitch-product-copy"><h3 title={productName}>{productName || 'Produit inconnu'}</h3><p className="stitch-product-description">{description}</p><div className="stitch-product-badges"><span className="stitch-product-allergens" title={allergenLabel}><TriangleAlert aria-hidden="true" />{allergenLabel}</span><span className="stitch-product-verdict">{verdict}</span></div></div>
      </div>
      <div className="stitch-product-footer"><span title={result?.explanation}><StatusIcon aria-hidden="true" /><span>{currentStatus === 'AVOID' ? 'Allergène détecté dans les données' : currentStatus === 'SAFE' ? 'Aucun allergène de votre profil détecté' : 'Vérifiez les traces et l’étiquette'}</span></span><time>{time}</time></div>
    </Link>
    <button type="button" className="stitch-product-favorite" disabled={!scan} aria-pressed={!!scan?.isFavorite} aria-label={`${scan?.isFavorite ? 'Retirer' : 'Ajouter'} ${productName} ${scan?.isFavorite ? 'des' : 'aux'} favoris`} onClick={() => toggleFavorite(id)}><Star aria-hidden="true" fill={scan?.isFavorite ? 'currentColor' : 'none'} /></button>
  </article>;
};

export const RecentScansEmptyState: React.FC = () => <div className="w-full flex flex-col items-center text-center p-6 bg-white rounded-[22px] border border-border-subtle border-dashed"><div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mb-4"><Package className="w-7 h-7 text-primary-600" aria-hidden="true" /></div><h3 className="font-bold text-[16px] text-text-primary mb-1">Aucun scan pour le moment</h3><p className="text-[14px] text-text-secondary mb-4">Votre historique apparaîtra ici.</p></div>;
