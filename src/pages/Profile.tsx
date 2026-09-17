import { useLocation } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useStore } from '../store/useStore';
import { CountBadge } from '../components/feedback/CountBadge';
import type { AllergenId } from '../types';
import { ALLERGENS } from '../constants/allergens';
import { AppHeader } from '../components/navigation/AppHeader';
import { AllergenChip } from '../components/allergies/AllergenChip';
import { ShieldCheck, UserRound, Plus, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BottomSheet } from '../components/layout/BottomSheet';
import { DetectionPreferences } from '../components/profile/DetectionPreferences';
import { AIPreferencesSection } from '../components/profile/AIPreferencesSection';
import { CustomAllergenForm } from '../components/allergies/CustomAllergenForm';

const PRIMARY_ALLERGENS = ['gluten', 'eggs', 'milk', 'peanuts', 'soybeans', 'crustaceans'];

export const Profile = () => {
  const { allergies, history, customAllergens, toggleAllergy, resetProfile, removeCustomAllergen } = useStore();
  const { hash } = useLocation();
  useEffect(() => { if (hash === '#ai-preferences') document.getElementById('ai-preferences')?.scrollIntoView({ block: 'start' }); }, [hash]);
  const [moreAllergens, setMoreAllergens] = useState(false);

  const [editing, setEditing] = useState<AllergenId | null>(null);
  const [deleting, setDeleting] = useState<AllergenId | null>(null);
  const [notice, setNotice] = useState('');
  const ordered = [...customAllergens, ...PRIMARY_ALLERGENS.map(id => ALLERGENS.find(a => a.id === id)!), ...ALLERGENS.filter(a => !PRIMARY_ALLERGENS.includes(a.id))];
  const visible = [...ordered.filter(a => allergies.includes(a.id)), ...ordered.filter(a => !allergies.includes(a.id))].slice(0, 6);
  const edited = customAllergens.find(a => a.id === editing);
  return (
    <div className="flex-1 bg-background min-h-full pb-8 flex flex-col">
      <AppHeader title="Profil" />
      
      <div className="px-6 pt-4 flex-1">
        <section className="guardian-card bg-white rounded-[32px] p-6 mb-7"><div className="flex gap-4 items-center"><div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center shrink-0"><UserRound className="w-8 h-8" /></div><div><h2 className="font-display font-bold text-[22px]">Mon profil</h2><p className="text-text-muted text-[14px]">Personnel • enregistré sur cet appareil</p></div></div><div className="grid grid-cols-2 text-center mt-5 pt-4 border-t border-border-subtle"><div><p className="text-primary-600 font-display font-bold text-[24px]">{history.length}</p><p className="text-text-muted text-[13px]">Analyses conservées</p></div><div><p className="text-danger font-display font-bold text-[24px]">{allergies.length}</p><p className="text-text-muted text-[13px]">Allergies sélectionnées</p></div></div></section>
        <div className="stitch-allergen-heading"><div><h2>Mes Allergènes & Intolérances<CountBadge count={allergies.length} /></h2><p>Filtrage strict actif lors des scans</p></div><span className="stitch-profile-shield" aria-hidden="true"><ShieldCheck /></span></div>
        <div className="stitch-allergen-grid">
          {visible.map((allergen) => {
            const isSelected = allergies.includes(allergen.id);
            const IconComponent = <Icon name={allergen.icon} />;
            
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
        <button className="stitch-custom-allergen" onClick={() => setMoreAllergens(true)}><span aria-hidden="true"><Plus /></span><span>Personnaliser un ingrédient ou additif (E…)</span></button>
        <p className="text-[13px] text-text-secondary mb-4">Votre profil et les 50 dernières analyses sont enregistrés uniquement dans ce navigateur, sans synchronisation entre appareils.</p>
        {allergies.length > 0 && <button className="text-[14px] font-bold underline mb-6" onClick={() => { if (window.confirm("Retirer toutes les allergies du profil ? Les analyses seront conservées et recalculées.")) resetProfile(); }}>Réinitialiser mes allergies</button>}
        <aside className="rounded-[28px] bg-[#dcfce7] p-5 flex items-center gap-3 text-[14px] text-text-secondary"><ShieldCheck className="w-7 h-7 shrink-0 text-verified" /><div><h3 className="font-display font-bold text-text-primary text-[18px] mb-1">Les traces sont aussi vérifiées</h3>Les mentions de traces et les ingrédients incertains déclenchent un résultat à vérifier. Consultez toujours les preuves et l’étiquette.</div></aside>
        <AIPreferencesSection />
        <DetectionPreferences />
      </div>
      <BottomSheet isOpen={moreAllergens} onClose={() => { setMoreAllergens(false); setEditing(null); setDeleting(null); }} title="Personnaliser mes allergènes">
        {notice && <p role="status" className="text-sm text-verified mb-4">{notice}</p>}
        {edited ? <CustomAllergenForm key={edited.id} allergen={edited} onDone={saved => { setEditing(null); setNotice(saved ? 'Modifications enregistrées.' : ''); }} /> : <>
          <p className="text-[14px] text-text-secondary mb-4">Sélectionnez vos allergènes ou modifiez ceux que vous avez ajoutés.</p>
          <div className="stitch-allergen-grid">{ordered.map(allergen => <div key={allergen.id} className="min-w-0">
            <AllergenChip id={allergen.id} label={allergen.label} icon={<Icon name={allergen.icon} />} selected={allergies.includes(allergen.id)} onClick={() => toggleAllergy(allergen.id)} />
            {customAllergens.some(a => a.id === allergen.id) && <div className="flex justify-center gap-2 mt-2">
              <button type="button" aria-label={`Modifier ${allergen.label}`} className="p-2 rounded-full text-primary-600 hover:bg-primary-50" onClick={() => { setEditing(allergen.id); setNotice(''); }}><Pencil className="w-4 h-4" aria-hidden="true" /></button>
              <button type="button" aria-label={`Supprimer ${allergen.label}`} className="p-2 rounded-full text-danger hover:bg-danger/10" onClick={() => { setDeleting(allergen.id); setNotice(''); }}><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
            </div>}
            {deleting === allergen.id && <div className="mt-2 text-sm space-y-2"><p>Supprimer {allergen.label} et ses autres noms ?</p><button type="button" className="font-bold text-danger underline" onClick={() => { removeCustomAllergen(allergen.id); setDeleting(null); setNotice(`${allergen.label} supprimé.`); }}>Confirmer la suppression</button><button type="button" className="block underline" onClick={() => setDeleting(null)}>Annuler</button></div>}
          </div>)}</div>
          <CustomAllergenForm />
        </>}
      </BottomSheet>
    </div>
  );
};
