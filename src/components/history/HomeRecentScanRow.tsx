import { Link } from 'react-router-dom';
import { Check, Package, TriangleAlert } from 'lucide-react';
import { getAllergenDefinitions } from '../../constants/customAllergens';
import { useStore } from '../../store/useStore';
import type { ScanHistoryItem } from '../../types';

export const getLatestTodayScans = (history: ScanHistoryItem[], now = Date.now()) => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return history.filter(scan => scan.date >= start.getTime() && scan.date <= now).sort((a, b) => b.date - a.date).slice(0, 3);
};

export const HomeRecentScanRow = ({ scan, now }: { scan: ScanHistoryItem; now: number }) => {
  const customAllergens = useStore(state => state.customAllergens);
  const { result, product } = scan;
  const avoid = result.status === 'AVOID';
  const uncertain = result.status === 'UNCERTAIN';
  const ids = avoid ? result.detectedAllergens : [...result.detectedTraces, ...(result.textualMatches || [])];
  const labels = getAllergenDefinitions(customAllergens).filter(allergen => ids.includes(allergen.id)).map(allergen => allergen.label.toLocaleLowerCase('fr')).join(', ');
  const caption = avoid ? labels ? `Contient : ${labels}` : 'Allergène détecté' : uncertain ? labels ? `${result.detectedTraces.length ? 'Traces' : 'Mention'} : ${labels}` : 'À vérifier' : 'Aucun allergène détecté';
  const minutes = Math.max(0, Math.floor((now - scan.date) / 60000));
  const elapsed = minutes < 1 ? 'À l’instant' : minutes < 60 ? `Il y a ${minutes} min` : `Il y a ${Math.floor(minutes / 60)} h`;
  return <Link to={`/scan/${encodeURIComponent(scan.id)}`} className={`home-recent-scan home-recent-${avoid ? 'danger' : uncertain ? 'caution' : 'safe'}`} aria-label={`${product.name}, ${caption}, ${elapsed}`}>
    <span className="home-recent-thumbnail">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <Package aria-hidden="true" />}</span>
    <span className="home-recent-copy"><span className="home-recent-name" title={product.name}>{product.name}</span><span className="home-recent-meta"><span>{elapsed}</span><span className="home-recent-dot" aria-hidden="true" /><span className="home-recent-caption" title={caption}>{caption}</span></span></span>
    <span className="home-recent-status" aria-hidden="true">{avoid ? <TriangleAlert /> : uncertain ? <span className="font-extrabold text-[24px] leading-none">!</span> : <span className="home-recent-check"><Check /></span>}</span>
  </Link>;
};
