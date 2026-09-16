import { useState } from 'react';
import { useStore } from '../store/useStore';
import { AppHeader } from '../components/navigation/AppHeader';
import { RecentScanRow, RecentScansEmptyState } from '../components/history/RecentScanRow';
import { IconButton } from '../components/primitives/IconButton';
import { Search, ShieldCheck, Trash2 } from 'lucide-react';
import type { AnalysisStatus } from '../types';
import { analyzeProduct } from '../services/AnalysisEngine';
import { CountBadge } from '../components/feedback/CountBadge';

export const History = () => {
  const { history, allergies, customAllergens, clearHistory } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AnalysisStatus | 'ALL' | 'FAVORITES'>('ALL');

  const handleClear = () => {
    if (window.confirm("Voulez-vous vraiment effacer tout l'historique ?")) {
      clearHistory();
    }
  };

  const sortedHistory = [...history].sort((a, b) => b.date - a.date).map(scan => ({ ...scan, result: analyzeProduct(scan.product, allergies, customAllergens) }));
  const matchesFilter = (scan: typeof sortedHistory[number], selected: typeof filter) => selected === 'ALL' || (selected === 'FAVORITES' ? scan.isFavorite : scan.result.status === selected);
  const filtered = sortedHistory.filter(scan => matchesFilter(scan, filter) && scan.product.name.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr')));
  const groups = new Map<string, typeof filtered>();
  for (const scan of filtered) {
    const date = new Date(scan.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    groups.set(date, [...(groups.get(date) || []), scan]);
  }
  const filters = [{ id: 'ALL', label: 'Tous' }, { id: 'AVOID', label: 'À éviter' }, { id: 'SAFE', label: 'Aucune correspondance' }, { id: 'UNCERTAIN', label: 'À vérifier' }, { id: 'FAVORITES', label: '★ Favoris' }] as const;

  return (
    <div className="guardian-ambient flex-1 min-h-full pb-8 bg-background flex flex-col">
      <AppHeader 
        title="Historique" 
        rightAction={
          history.length > 0 && (
            <IconButton 
              icon={<Trash2 />} 
              onClick={handleClear}
              tone="danger"
              aria-label="Effacer tout l'historique"
            />
          )
        }
      />

      <div className="px-6 pt-4 flex-1">
        <p className="uppercase text-[13px] font-bold text-text-muted tracking-wide">Vos scans récents</p>
        <h2 className="font-display text-display-lg font-bold mb-5">Historique <CountBadge count={history.length} /></h2>
        <label className="guardian-card flex items-center gap-3 bg-white rounded-full px-5 py-4 mb-5"><Search className="w-5 h-5 text-text-muted shrink-0" /><span className="sr-only">Rechercher un produit scanné</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un produit scanné…" className="w-full min-w-0 bg-transparent text-[15px]" /></label>
        <div role="group" aria-label="Filtrer par résultat ou favoris" className="flex flex-wrap gap-2 mb-7">{filters.map(item => <button key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`rounded-full px-4 py-3 text-[13px] font-bold ${filter === item.id ? 'bg-primary-500 text-white' : 'bg-white text-text-secondary'}`}>{item.label} <span className="ml-1 opacity-80">{sortedHistory.filter(scan => matchesFilter(scan, item.id)).length}</span></button>)}</div>

        {sortedHistory.length > 0 ? (
          <div className="flex flex-col gap-6 pb-8" aria-live="polite">
            {filtered.length === 0 && <p className="text-center text-text-secondary py-6">Aucun produit ne correspond à cette recherche.</p>}
            {[...groups].map(([date, scans]) => <section key={date}><h3 className="font-display font-bold text-[18px] mb-3">{date}<CountBadge count={scans.length} /><span className="text-[13px] text-text-muted ml-1">produit{scans.length > 1 ? 's' : ''}</span></h3><div className="flex flex-col gap-3">{scans.map((scan) => (
              <RecentScanRow 
                key={scan.id}
                scanItem={scan}
                id={scan.id}
                barcode={scan.barcode}
                productName={scan.product.name}
                status={scan.result.status}
                thumbnailUrl={scan.product.imageUrl}
                scannedAt={new Date(scan.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              />
            ))}</div></section>)}
          </div>
        ) : (
          <div className="pt-10">
            <RecentScansEmptyState />
          </div>
        )}
        <aside className="stitch-history-saved"><span className="stitch-history-shield" aria-hidden="true"><ShieldCheck /></span><h2>Tous vos scans sont sauvegardés</h2><p>Scannez un nouveau code-barres pour vérifier<br className="hidden min-[440px]:block" /> instantanément vos allergènes enregistrés.</p></aside>
      </div>
    </div>
  );
};
