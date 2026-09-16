import { Icon } from '../components/Icon';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { History, Lightbulb, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAllergenDefinitions } from '../constants/customAllergens';
import { AppHeader } from '../components/navigation/AppHeader';
import { ScanHeroCard } from '../components/scanner/ScanHeroCard';
import { HomeRecentScanRow, getLatestTodayScans } from '../components/history/HomeRecentScanRow';
import { SurfaceCard } from '../components/layout/SurfaceCard';
import { AllergenChip } from '../components/allergies/AllergenChip';
import { Button } from '../components/primitives/Button';
import { CountBadge } from '../components/feedback/CountBadge';

export const Home = () => {
  const { history, allergies, customAllergens } = useStore();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedAllergenDefs = getAllergenDefinitions(customAllergens).filter(a => allergies.includes(a.id));
  const recentHistory = getLatestTodayScans(history, now);

  return (
    <div className="stitch-home-ambient flex-1 min-h-full bg-background flex flex-col pb-6">
      <AppHeader variant="home" />

      <div className="stitch-home-greeting relative px-6 mt-2 mb-7 pt-5">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#16a34a] text-white px-3.5 py-1.5 text-[13px] font-bold mb-3 shadow-sm"><span className="w-2 h-2 rounded-full bg-white" />{allergies.length ? 'Mode protection active' : 'Profil à configurer'}</span>
        <svg aria-hidden="true" className="absolute top-8 right-14 w-6 h-6 text-[#efbeb8]" viewBox="0 0 24 24"><path fill="currentColor" d="M12 0L14 9L23 12L14 15L12 24L10 15L1 12L10 9Z" /></svg>
        <h2 className="text-display-lg text-text-primary font-display font-bold tracking-tight">Bonjour 👋</h2>
        <p className="text-text-secondary mt-1">Prêt à faire vos courses sereinement ?</p>
      </div>

      <div className="px-6 mb-8"><ScanHeroCard onActivate={() => navigate('/scanner')} /></div>

      {/* Allergy Summary */}
      <div className="px-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[18px] font-display font-bold text-text-primary">Mes allergies <CountBadge count={allergies.length} /></h2>
          <button onClick={() => navigate('/profile')} className="text-primary-600 font-bold text-[14px] py-2">Modifier</button>
        </div>
        
        {allergies.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {selectedAllergenDefs.map(allergen => (
              <AllergenChip 
                key={allergen.id}
                id={allergen.id}
                label={allergen.label}
                icon={<Icon name={allergen.icon} />}
                selected={true}
                variant="list"
                onClick={() => navigate('/profile')}
              />
            ))}
            <button 
              onClick={() => navigate('/profile')}
              className="shrink-0 w-12 h-[42px] rounded-[21px] border-2 border-dashed border-primary-500 bg-white flex items-center justify-center text-primary-500 active:scale-95 transition-transform focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-300"
              aria-label="Ajouter une allergie"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <SurfaceCard variant="tinted" className="text-center py-6 border-dashed">
            <p className="text-text-secondary text-[14px] font-medium mb-4">Aucune allergie renseignée.</p>
            <Button onClick={() => navigate('/profile')} size="sm">
              Configurer mon profil
            </Button>
          </SurfaceCard>
        )}
      </div>
      
      {/* Recent Scans */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[18px] font-display font-bold text-text-primary flex items-center gap-2">Scans récents <History className="w-[18px] h-[18px] text-text-muted" aria-hidden="true" /></h2>
          <button onClick={() => navigate('/history')} className="text-primary-600 font-bold text-[14px] py-2">Tout voir</button>
        </div>
        {recentHistory.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentHistory.map((scan) => (
              <HomeRecentScanRow key={scan.id} scan={scan} now={now} />
            ))}
          </div>
        ) : (
          <SurfaceCard className="text-center"><PackageEmptyNotice /><Button variant="ghost" size="sm" onClick={() => navigate('/scanner')}>Scanner un produit</Button></SurfaceCard>
        )}
      </div>
      <aside className="home-safeeat-tip mx-6"><span className="home-tip-icon" aria-hidden="true"><Lightbulb /></span><div className="min-w-0"><h2 className="text-primary-600 text-[13px] font-bold mb-1">ASTUCE SAFEEAT</h2><p>Rescannez vos produits favoris régulièrement : leur composition peut changer. Vérifiez toujours l’étiquette.</p></div></aside>
      
    </div>
  );
};

const PackageEmptyNotice = () => <p className="text-[14px] text-text-secondary mb-2">Aucun scan aujourd’hui. Vos anciens scans restent disponibles dans l’historique.</p>;
