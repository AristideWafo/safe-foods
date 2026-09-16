import { PackageOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/primitives/Button';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-background min-h-full">
      <div className="w-24 h-24 bg-surface rounded-3xl shadow-sm flex items-center justify-center mb-6">
        <PackageOpen className="w-12 h-12 text-text-muted" />
      </div>
      <h1 className="text-title-xl font-display font-bold text-text-primary mb-2">Page introuvable</h1>
      <p className="text-text-secondary text-[16px] mb-8">
        L'élément que vous cherchez n'existe pas ou a été déplacé.
      </p>
      <Button 
        variant="primary" 
        size="lg" 
        onClick={() => navigate('/')}
      >
        Retour à l'accueil
      </Button>
    </div>
  );
};
