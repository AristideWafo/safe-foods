import * as LucideIcons from 'lucide-react';
import React from 'react';
import { useStore } from '../store/useStore';
import { ALLERGENS } from '../constants/allergens';
import { AppHeader } from '../components/navigation/AppHeader';
import { AllergenChip } from '../components/allergies/AllergenChip';

export const Profile = () => {
  const { allergies, toggleAllergy, resetProfile } = useStore();

  return (
    <div className="flex-1 bg-background min-h-full pb-8 flex flex-col">
      <AppHeader title="Profil" />
      
      <div className="px-6 pt-4 flex-1">
        <h2 className="text-title-xl font-display font-extrabold text-text-primary tracking-tight mb-2">Mes Allergies</h2>
        <p className="text-text-secondary text-body-md mb-6 leading-relaxed">
          Sélectionnez les ingrédients que vous souhaitez éviter.
        </p>
        
        <p className="text-[13px] text-text-secondary mb-4">Votre profil et les 50 dernières analyses sont enregistrés uniquement dans ce navigateur, sans synchronisation entre appareils.</p>
        {allergies.length > 0 && <button className="text-[14px] font-bold underline mb-6" onClick={() => { if (window.confirm("Retirer toutes les allergies du profil ? Les analyses seront conservées et recalculées.")) resetProfile(); }}>Réinitialiser mes allergies</button>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-24">
          {ALLERGENS.map((allergen) => {
            const isSelected = allergies.includes(allergen.id);
            const IconComponent = React.createElement((LucideIcons as any)[allergen.icon] || React.Fragment);
            
            return (
              <AllergenChip
                key={allergen.id}
                id={allergen.id}
                label={allergen.label}
                icon={IconComponent}
                selected={isSelected}
                onClick={() => toggleAllergy(allergen.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
