import { useId } from 'react';
import { Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Switch } from '../primitives/Switch';
import { SurfaceCard } from '../layout/SurfaceCard';

export const AIPreferencesSection = () => {
  const id = useId();
  const { aiPreferences, setAIPreference } = useStore();
  const rows = [
    { key: 'photoAnalysis', title: 'Analyser les photos avec l’IA', description: 'Lire les ingrédients de vos photos avec Google Gemini.' },
    { key: 'autoSendPhotos', title: 'Toujours envoyer les photos à l’IA', description: 'Envoyer chaque photo que vous choisissez ou prenez à Google Gemini sans demander de confirmation. Aucune photo n’est prise automatiquement.' },
    { key: 'synonymSuggestions', title: 'Suggestions de synonymes par l’IA', description: 'Afficher le badge pour demander d’autres noms à Google Gemini. Seul le nom saisi est envoyé, à votre demande.' },
  ] as const;
  return <section id="ai-preferences" className="mt-7 mb-7 scroll-mt-6" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`} className="font-display font-semibold text-[22px] mb-4 flex items-center gap-2"><Sparkles className="w-6 h-6 text-blue-600" aria-hidden="true" />Intelligence artificielle</h2>
    <SurfaceCard>
      {rows.map(row => <div key={row.key} className="flex items-start gap-4 py-4 border-b border-border-subtle last:border-0">
        <div className="flex-1"><h3 id={`${id}-${row.key}`} className="font-bold text-sm">{row.title}</h3><p id={`${id}-${row.key}-description`} className="text-[13px] text-text-secondary mt-1 leading-relaxed">{row.description}</p></div>
        <Switch checked={aiPreferences[row.key]} disabled={row.key === 'autoSendPhotos' && !aiPreferences.photoAnalysis} onChange={enabled => setAIPreference(row.key, enabled)} labelledBy={`${id}-${row.key}`} describedBy={`${id}-${row.key}-description`} />
      </div>)}
    </SurfaceCard>
    <p className="text-[13px] text-text-secondary mt-3 leading-relaxed">Ces choix sont enregistrés dans ce navigateur. Désactivez « Toujours envoyer » pour retrouver la confirmation à chaque photo. Désactiver l’analyse photo révoque aussi cet accord. SafeEat ne conserve pas les photos sur son serveur. Photographiez uniquement l’étiquette et évitez les informations personnelles.</p>
  </section>;
};
