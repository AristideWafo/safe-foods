import { useId, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../primitives/Button';
export const CustomAllergenForm = () => {
  const id = useId();
  const add = useStore(state => state.addCustomAllergen);
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  return <form className="mt-6 space-y-3" onSubmit={event => {
    event.preventDefault(); setError(''); setSaved('');
    try { add(name, aliases.split(',')); setSaved(`${name.trim()} ajouté et activé.`); setName(''); setAliases(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Ajout impossible.'); }
  }}>
    <h3 className="font-display font-bold text-[18px]">Ajouter mon allergène</h3>
    <label htmlFor={`${id}-name`} className="block text-[14px] font-bold">Nom de l’ingrédient ou additif</label>
    <input id={`${id}-name`} required minLength={2} maxLength={60} value={name} onChange={event => setName(event.target.value)} placeholder="Ex. : kiwi" className="w-full rounded-2xl bg-background border border-border-subtle px-4 py-3" aria-describedby={`${id}-help`} />
    <label htmlFor={`${id}-aliases`} className="block text-[14px] font-bold">Autres noms à rechercher (facultatif)</label>
    <input id={`${id}-aliases`} value={aliases} maxLength={1200} onChange={event => setAliases(event.target.value)} placeholder="Noms séparés par des virgules" className="w-full rounded-2xl bg-background border border-border-subtle px-4 py-3" />
    <p id={`${id}-help`} className="text-[13px] text-text-secondary">Le nom et les mots-clés sont recherchés dans les ingrédients. La détection reste à vérifier sur l’étiquette ; elle ne couvre pas tous les dérivés ou synonymes.</p>
    {error && <p role="alert" className="text-danger text-[14px]">{error}</p>}
    {saved && <p role="status" className="text-verified text-[14px]">{saved}</p>}
    <Button type="submit" fullWidth>Ajouter et activer</Button>
  </form>;
};
