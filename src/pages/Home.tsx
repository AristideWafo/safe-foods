import { Icon } from '../components/Icon';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { ALLERGENS } from '../constants/allergens';
import { AppHeader } from '../components/navigation/AppHeader';
import { ScanHeroCard } from '../components/scanner/ScanHeroCard';
import { RecentScanRow, RecentScansEmptyState } from '../components/history/RecentScanRow';
import { SurfaceCard } from '../components/layout/SurfaceCard';
import { AllergenChip } from '../components/allergies/AllergenChip';
import { Button } from '../components/primitives/Button';

export const Home = () => {
  const { history, allergies } = useStore();
  const navigate = useNavigate();

  const selectedAllergenDefs = ALLERGENS.filter(a => allergies.includes(a.id));
  const recentHistory = [...history].sort((a, b) => b.date - a.date).slice(0, 3);

  return (
    <div className="flex-1 min-h-full bg-background flex flex-col pb-6">
      <AppHeader variant="home" />

      <div className="px-6 mt-2 mb-6">
        <h2 className="text-display-lg text-text-primary font-display font-extrabold tracking-tight">Bonjour 👋</h2>
      </div>

      {/* Allergy Summary */}
      <div className="px-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[16px] font-bold text-text-primary">Mes allergies</h2>
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
      
      {/* Hero Scan Card */}
      <div className="px-6 mb-8">
        <ScanHeroCard 
          onActivate={() => navigate('/scanner')}
        />
      </div>

      {/* Recent Scans */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[16px] font-bold text-text-primary">Scans récents</h2>
        </div>
        {recentHistory.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentHistory.map((scan) => (
              <RecentScanRow 
                key={scan.id}
                id={scan.id}
                barcode={scan.barcode}
                productName={scan.product.name}
                status={scan.result.status}
                thumbnailUrl={scan.product.imageUrl}
                scannedAt={new Date(scan.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              />
            ))}
          </div>
        ) : (
          <RecentScansEmptyState />
        )}
      </div>
      
    </div>
  );
};
