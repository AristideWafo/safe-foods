import { useEffect, useId, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Sparkles, LoaderCircle, Plus, X } from 'lucide-react';
import { suggestSynonyms, MAX_SYNONYMS } from '../../services/Synonyms';
import type { AllergenDef } from '../../types';
import { Button } from '../primitives/Button';
export const CustomAllergenForm = ({ allergen, onDone }: { allergen?: AllergenDef; onDone?: (saved?: boolean) => void }) => {
  const id = useId();
  const aiEnabled = useStore(state => state.aiPreferences.synonymSuggestions);
  const update = useStore(state => state.updateCustomAllergen);
  const add = useStore(state => state.addCustomAllergen);
  const [name, setName] = useState(allergen?.label || '');
  const [aliases, setAliases] = useState(allergen?.keywords?.filter(word => word !== allergen.label).join(', ') || '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestionStatus, setSuggestionStatus] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => { if (allergen) document.getElementById(`${id}-name`)?.focus(); }, [allergen, id]);
  useEffect(() => useStore.subscribe((state, previous) => {
    if (!state.aiPreferences.synonymSuggestions && previous.aiPreferences.synonymSuggestions) {
      pending.current?.abort(); pending.current = null;
      setLoading(false); setSuggestions([]); setSuggestionStatus('');
    }
  }), []);
  const cancelSuggestions = () => {
    pending.current?.abort(); pending.current = null;
    setLoading(false); setSuggestions([]); setSuggestionStatus('');
  };
  const suggest = async () => {
    if (!useStore.getState().aiPreferences.synonymSuggestions) return;
    if (name.trim().length < 2) { setError('Saisissez d’abord le nom de l’ingrédient.'); return; }
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setLoading(true); setError(''); setSaved(''); setSuggestionStatus(''); setSuggestions([]);
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      const items = await suggestSynonyms(name.trim(), controller.signal);
      if (pending.current !== controller) return;
      setSuggestions(items);
      setSuggestionStatus(items.length ? 'Relisez les propositions et ajoutez celles que vous souhaitez rechercher.' : 'Aucun autre nom proposé. Vous pouvez en saisir vous-même.');
    } catch (err) {
      if (pending.current === controller) setError(controller.signal.aborted ? 'La demande a pris trop de temps. Réessayez ou saisissez les autres noms.' : err instanceof Error ? err.message : 'Suggestions indisponibles.');
    } finally {
      clearTimeout(timeout);
      if (pending.current === controller) { pending.current = null; setLoading(false); }
    }
  };
  const acceptSuggestion = (index: number) => {
    const value = suggestions[index].trim().toLowerCase();
    if (!value || value.length > 60 || /[,;\n\r]/.test(value) || !/[\p{L}\p{N}]/u.test(value)) { setError('Un autre nom doit contenir entre 1 et 60 caractères, sans virgule.'); return; }
    const items = [...new Set(aliases.split(',').map(item => item.trim()).filter(Boolean))];
    if (!items.some(item => item.toLowerCase() === value) && value !== name.trim().toLowerCase()) {
      if (items.length >= MAX_SYNONYMS) { setError('Vous pouvez retenir au maximum 19 autres noms.'); return; }
      items.push(value);
    }
    setAliases(items.join(', ')); setSuggestions(old => old.filter((_, i) => i !== index)); setError('');
  };
  return <form className="mt-6 space-y-3" onSubmit={event => {
    event.preventDefault(); setError(''); setSaved('');
    try { if (allergen) update(allergen.id, name, aliases.split(',')); else add(name, aliases.split(',')); cancelSuggestions(); setSaved(`${name.trim()} ${allergen ? 'modifié' : 'ajouté et activé'}.`); if (!allergen) { setName(''); setAliases(''); } onDone?.(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Ajout impossible.'); }
  }}>
    <h3 className="font-display font-bold text-[18px]">{allergen ? 'Modifier mon allergène' : 'Ajouter mon allergène'}</h3>
    <label htmlFor={`${id}-name`} className="block text-[14px] font-bold">Nom de l’ingrédient ou additif</label>
    <input id={`${id}-name`} required minLength={2} maxLength={60} value={name} onChange={event => { cancelSuggestions(); setName(event.target.value); setError(''); setSaved(''); }} placeholder="Ex. : kiwi" className="w-full rounded-2xl bg-background border border-border-subtle px-4 py-3" aria-describedby={`${id}-help`} />
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => void suggest()} disabled={!aiEnabled || loading || name.trim().length < 2} aria-label="Compléter avec l’IA" title="Compléter avec l’IA" aria-describedby={`${id}-ai-help`} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50">
        {loading ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}
      </button>
      <span className="text-sm font-bold">{loading ? 'Recherche d’autres noms…' : 'Compléter avec l’IA'}</span>
    </div>
    <p id={`${id}-ai-help`} className="text-[13px] text-text-secondary">{aiEnabled ? 'Ce bouton envoie uniquement le nom saisi à Google Gemini pour proposer d’autres noms à relire.' : 'Les suggestions IA sont désactivées. Vous pouvez les activer dans la section Intelligence artificielle du profil ou saisir les autres noms vous-même.'}</p>
    {suggestionStatus && <p role="status" className="text-sm text-text-secondary">{suggestionStatus}</p>}
    {suggestions.length > 0 && <div className="space-y-2">
      <p className="text-sm font-bold">Suggestions à valider</p>
      <ul className="flex flex-wrap gap-2">{suggestions.map((value, index) => <li key={index} className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1">
        <span className="relative inline-block min-w-0 max-w-full text-sm">
          <span aria-hidden="true" className="invisible block overflow-hidden whitespace-pre px-2 py-1">{value || ' '}</span>
        <input aria-label={`Modifier la suggestion ${index + 1}`} value={value} maxLength={60} onChange={event => setSuggestions(old => old.map((item, i) => i === index ? event.target.value : item))} className="absolute inset-0 w-full min-w-0 bg-transparent px-2 py-1 text-sm text-blue-950 rounded-full focus-visible:outline-blue-600" />
        </span>
        <button type="button" onClick={() => acceptSuggestion(index)} aria-label={`Retenir ${value || 'cette suggestion'}`} className="shrink-0 p-2 rounded-full text-blue-700 hover:bg-blue-100"><Plus className="h-4 w-4" aria-hidden="true" /></button>
        <button type="button" onClick={() => setSuggestions(old => old.filter((_, i) => i !== index))} aria-label={`Supprimer ${value || 'cette suggestion'}`} className="shrink-0 p-2 rounded-full text-blue-700 hover:bg-blue-100"><X className="h-4 w-4" aria-hidden="true" /></button>
      </li>)}</ul>
      <p className="text-[13px] text-text-secondary">L’IA peut se tromper. Seuls les noms retenus avec + seront enregistrés avec l’allergène. Cette liste n’est pas exhaustive.</p>
    </div>}
    <label htmlFor={`${id}-aliases`} className="block text-[14px] font-bold">Autres noms à rechercher (facultatif)</label>
    <input id={`${id}-aliases`} value={aliases} maxLength={1200} onChange={event => setAliases(event.target.value)} placeholder="Noms séparés par des virgules" className="w-full rounded-2xl bg-background border border-border-subtle px-4 py-3" />
    <p id={`${id}-help`} className="text-[13px] text-text-secondary">Le nom et les mots-clés sont recherchés dans les ingrédients. La détection reste à vérifier sur l’étiquette ; elle ne couvre pas tous les dérivés ou synonymes.</p>
    {error && <p role="alert" className="text-danger text-[14px]">{error}</p>}
    {saved && <p role="status" className="text-verified text-[14px]">{saved}</p>}
    <Button type="submit" fullWidth>{allergen ? 'Enregistrer les modifications' : 'Ajouter et activer'}</Button>
    {allergen && <Button type="button" fullWidth variant="ghost" onClick={() => onDone?.(false)}>Annuler</Button>}
  </form>;
};
