import { useId, useState } from 'react';
import { ArrowRight, Asterisk, Headset, LogOut } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Switch } from '../primitives/Switch';
import { Button } from '../primitives/Button';
import { SurfaceCard } from '../layout/SurfaceCard';
import { BottomSheet } from '../layout/BottomSheet';

export const DetectionPreferences = () => {
  const { preferences, setPreference } = useStore();
  const id = useId();
  const [panel, setPanel] = useState<'medical' | 'help' | null>(null);
  const rows = [
    { key: 'traceAlerts', title: 'Alerter sur les traces éventuelles', description: 'Mention « Peut contenir… » ou ateliers partagés' },
    { key: 'sensoryAlerts', title: 'Vibrations & Alertes sonores', description: "Retour tactile immédiat lors d’un scan à risque" },
  ] as const;
  return <section className="detection-preferences" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`} className="font-display font-semibold text-[22px] mb-4">Préférences de détection</h2>
    <SurfaceCard className="detection-preferences-card">
      {rows.map(row => <div className="detection-preference-row" key={row.key}>
        <span className="detection-preference-icon" aria-hidden="true"><Asterisk /></span>
        <div className="detection-preference-copy"><h3 id={`${id}-${row.key}`}>{row.title}</h3><p id={`${id}-${row.key}-description`}>{row.description}</p></div>
        <Switch checked={preferences[row.key]} onChange={enabled => setPreference(row.key, enabled)} labelledBy={`${id}-${row.key}`} describedBy={`${id}-${row.key}-description`} />
      </div>)}
    </SurfaceCard>
    <SurfaceCard variant="tinted" className="detection-medical-card" onClick={() => setPanel('medical')}>
      <span className="detection-medical-icon" aria-hidden="true"><Asterisk /></span><span className="detection-preference-copy"><span className="detection-medical-title">Fiche Médicale d’Urgence</span><span className="detection-medical-description">Protocole PAI & contacts en cas de crise</span></span><span className="detection-medical-arrow" aria-hidden="true"><ArrowRight /></span>
    </SurfaceCard>
    <div className="detection-profile-actions"><Button variant="secondary" leadingIcon={<Headset className="w-5 h-5 text-primary-600" />} onClick={() => setPanel('help')}>Aide & Conseils</Button><Button variant="secondary" leadingIcon={<LogOut className="w-5 h-5" />} disabled title="Aucun compte connecté : votre profil est local">Déconnexion</Button></div>
    <p className="text-[13px] leading-relaxed text-text-muted mt-4">Ces réglages concernent les signaux du scanner. Les traces restent visibles dans l’analyse. Sons et vibrations dépendent des possibilités et autorisations du navigateur.</p>
    <BottomSheet isOpen={panel !== null} onClose={() => setPanel(null)} title={panel === 'medical' ? 'Fiche Médicale d’Urgence' : 'Aide & Conseils'}>
      {panel === 'medical' ? <p className="text-[14px] text-text-secondary leading-relaxed">Aucun protocole PAI ni contact d’urgence n’est enregistré. La gestion d’une fiche médicale n’est pas encore disponible dans cette version de SafeEat.</p> : <div className="space-y-4 text-[14px] text-text-secondary leading-relaxed"><p>Dans Profil, sélectionnez vos allergènes. Vos analyses sont recalculées lorsque vous modifiez cette sélection.</p><p>Dans Scanner, utilisez la caméra, importez une photo ou saisissez un code via le menu d’options.</p><p>Dans Historique, ouvrez une carte pour consulter les preuves. L’étoile ajoute ou retire un favori.</p><p>Vos réglages et les 50 dernières analyses sont conservés dans ce navigateur, sans compte ni synchronisation entre appareils.</p></div>}
    </BottomSheet>
  </section>;
};
