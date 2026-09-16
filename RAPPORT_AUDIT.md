# Rapport d’inspection et de tests — SafeEat

Date : 16 septembre 2026. Audit du code présent dans ce dossier, installation des dépendances, tests ciblés et vérification dans le navigateur. Aucun correctif applicatif n’a été effectué.

## 1. Ce que fait le projet

SafeEat est une application web orientée mobile qui aide à repérer les allergènes correspondant au profil de l’utilisateur. Le parcours prévu est : sélectionner ses allergies, scanner ou saisir un code-barres, récupérer un produit dans Open Food Facts, puis afficher un résultat. Une seconde voie permet de photographier ou d’importer une étiquette et d’en extraire les ingrédients avec Gemini.

Le moteur local attribue trois statuts : `AVOID` lorsque les tags contiennent un allergène du profil, `UNCERTAIN` pour les traces, les mentions textuelles non confirmées ou les ingrédients absents, et `SAFE` sinon. L’écran traduit ces statuts en « À éviter », « Prudence » et « Aucun détecté ».

Architecture : React 19, React Router, TypeScript, Tailwind CSS 4, composants réutilisables, Zustand avec persistance dans le localStorage. Express fournit `/api/analyze-image` et sert Vite en développement ou les fichiers compilés en production. Il n’y a ni base de données, ni compte utilisateur, ni synchronisation entre appareils. L’historique est conçu pour conserver au maximum 50 entrées localement.

## 2. Vérifications réellement effectuées

| Vérification | Résultat |
|---|---|
| Installation `npm install --no-package-lock` | 221 paquets installés ; audit npm intégré : aucune vulnérabilité signalée dans cette résolution |
| `npm run lint` | Réussi ; il s’agit uniquement de `tsc --noEmit`, pas d’un lint stylistique |
| `npm run build` | Réussi pour le navigateur et le serveur |
| `npm run dev` | Serveur lancé sur http://localhost:3000 après autorisation technique de sortie du sandbox |
| `NODE_ENV=production npm start` | Réussi ; version compilée laissée en fonctionnement sur le port 3000 |
| Routes HTTP en production | `/`, `/profile`, `/result/3017620422003` : HTTP 200, références aux assets compilés, absence du client Vite |
| Profil dans le navigateur | 14 choix visibles ; sélection fictive du lait conservée après rechargement, puis retirée à la fin |
| Résultat produit dans le navigateur | Une fiche Fiji Water, code 9417574000083, a été observée avec le statut « Aucun détecté » |
| Historique après résultat | Toujours vide, 0 produit scanné |
| `npm run test` | Échec : aucun script `test` n’existe |
| Contrôle supplémentaire `tsc --noEmit --strict` | Échec ; types React manquants et nombreuses erreurs de typage implicite |
| Moteur d’analyse : 11 scénarios locaux | 6 correspondent aux attentes de l’audit, 5 divergent |
| Open Food Facts simulé : réseau, 429, absent, données malformées | Les trois premières situations deviennent toutes `null` ; les données malformées sont acceptées |

Les dépendances ont été installées avec npm parce que Bun n’est pas disponible sur cette machine. Le dépôt contient `bun.lock` : cette installation npm ne reproduit donc pas strictement les versions verrouillées. Par exemple, Gemini a été résolu en 2.22.0 et Vite en 6.4.3. Le résultat de l’audit de dépendances concerne cette installation, pas une certification du verrou Bun.

La caméra physique, le flash et une extraction Gemini réussie n’ont pas été validés. La saisie manuelle n’a pas pu être menée jusqu’au bout dans la session navigateur. Les parcours concernés restent à tester sur un vrai téléphone. Le modèle `gemini-3.8-flash` figure dans le code, mais sa disponibilité n’a pas été vérifiée auprès du fournisseur.

## 3. Problèmes prioritaires

### P0 — Résultats faussement rassurants du moteur

Fichiers : `src/services/AnalysisEngine.ts`, `src/constants/allergens.ts`.

Tests reproduits sans tags :

| Ingrédients | Profil fictif | Résultat actuel | Attente conservatrice de l’audit |
|---|---|---|---|
| `sans lait, beurre` | Lait | SAFE | Au moins UNCERTAIN |
| `poudre d’amande` | Fruits à coque | SAFE | Au moins UNCERTAIN |
| `farine d’orge` | Gluten | SAFE | Au moins UNCERTAIN |
| `noix de coco` | Fruits à coque | UNCERTAIN | Pas de correspondance sur la seule sous-chaîne `noix` |
| `lait`, tag `en:milk` | Profil vide | SAFE | Demander un profil ou expliciter l’absence d’analyse personnalisée |

Ces attentes sont des critères logiciels proposés pour l’audit, pas une validation clinique. Le moteur ne recherche que le premier mot-clé correspondant ; une négation sur ce mot empêche d’examiner les autres ingrédients. Les synonymes français et les formes singulier/pluriel sont incomplets. La recherche par sous-chaîne produit aussi des faux positifs.

À améliorer : analyser toutes les occurrences, limiter la portée des négations, distinguer ingrédients et précautions de traces, normaliser accents et variantes, compléter les synonymes et ajouter des tests de non-régression. Ne pas présenter un résultat personnalisé rassurant avec un profil vide. Conserver explicitement l’incertitude lorsque les données sont insuffisantes.

### P1 — Parcours photo mal configuré et fragile

Fichier : `server.ts:7`.

Le fichier `.env` existe et contient une variable `GEMINI_API_KEY`, mais le serveur n’importe pas `dotenv/config` et les commandes npm ne chargent pas ce fichier. Au démarrage, le SDK signale que la clé devrait être renseignée. La fonction photo n’a donc pas été validée avec une configuration effective.

À améliorer : charger et contrôler la configuration avant l’initialisation du SDK, rendre le modèle configurable, vérifier son accès avec une image de test et permettre à l’application de fonctionner en mode code-barres quand l’IA n’est pas configurée. `APP_URL` est documentée dans l’exemple d’environnement mais n’est pas utilisée.

### P1 — Historique inutilisable dans le parcours courant

Fichier : `src/pages/Result.tsx:55`.

`handleSave` appelle bien `addHistoryItem`, mais aucun élément de l’interface ne l’appelle. Le scanner ne sauvegarde pas non plus. L’absence d’historique a été confirmée dans le navigateur après un résultat.

Les liens de l’historique utilisent seulement le code-barres et ne transmettent pas l’entrée sauvegardée. Une photo enregistrée aurait le code `SCAN_OCR`, qui serait recherché dans Open Food Facts au lieu de restaurer l’analyse photo. Les URLs `OCR-<date>` ne permettent pas non plus de retrouver une photo après rechargement.

À améliorer : choisir une sauvegarde automatique ou un bouton explicite, utiliser l’identifiant du scan pour rouvrir les données locales, conserver la provenance et le profil utilisé. Recalculer ou signaler les statuts anciens après modification des allergies. Protéger également les accès `scan.product.name`, puisque `product` est optionnel dans le type.

### P1 — Preuves et provenance parfois trompeuses

Fichier : `src/pages/Result.tsx:170`, `src/pages/Result.tsx:275`.

L’écran affiche systématiquement « Mise à jour : aujourd’hui » sans récupérer une date de mise à jour du produit. Il décrit une recherche dans la base comme des données issues de « l’étiquette scannée ». Une simple mention textuelle est stockée comme trace par le moteur, puis affichée comme « Trace déclarée par le fabricant ». La branche censée expliquer une mention textuelle est inaccessible derrière une condition plus générale sur les traces. Enfin, `result.explanation` n’est pas affichée dans ce composant, ce qui masque la raison de certaines incertitudes.

À améliorer : modéliser séparément la source, l’heure de consultation, la date réelle de mise à jour, les tags, les mentions textuelles et les traces déclarées. Afficher la raison du statut et laisser lire la liste complète des ingrédients même quand un allergène est détecté.

### P1 — Contrat API et résistance aux abus insuffisants

Fichier : `server.ts:17`.

Tests HTTP locaux : corps vide → 400 JSON ; `imageBase64: 123` → 503 « service indisponible », alors que le problème vient de l’entrée ; JSON invalide → 400 HTML avec une trace technique en développement.

L’API vérifie uniquement la présence de la valeur, sans contrôler son type, sa validité base64 ou son format d’image. Il n’y a pas de limitation du débit, de la concurrence ou du coût des appels IA. La réponse Gemini est parsée mais n’est pas validée localement ; une réponse vide devient `{}`. Les messages d’erreur renvoyés sont ignorés par le frontend au profit d’un message générique. Aucun délai explicite n’est défini dans le code de l’application.

À améliorer : schémas d’entrée et de sortie, erreurs JSON uniformes, limite de taille cohérente, contrôle du format, délais et annulation, limitation des appels et stratégie d’accès adaptée au déploiement. Une application publique n’a pas nécessairement besoin de comptes, mais l’endpoint payant doit avoir une protection contre les abus.

## 4. Autres améliorations importantes

**Réseau et données.** `src/services/OpenFoodFacts.ts` confond produit absent, panne réseau et erreur HTTP ; les messages réseau des pages deviennent souvent inaccessibles. Ajouter des erreurs distinctes, un délai, une annulation lors du départ de la page et une validation des réponses. Prioriser les ingrédients français pour l’interface française. Limiter les champs demandés et prévoir un cache seulement avec une politique claire de fraîcheur.

**Scanner.** En état d’erreur, le bouton « Importer une photo » appelle une référence dont l’input est rendu uniquement en état `ready` : il ne peut donc pas ouvrir le sélecteur à ce moment-là. La saisie manuelle disparaît aussi en cas d’erreur caméra. Garder ces deux alternatives disponibles. Ajouter un verrou immédiat pour empêcher plusieurs traitements d’un même code ; le changement d’état React seul ne protège pas les callbacks simultanés. Limiter les formats de codes acceptés, valider les valeurs lues et tester la gestion du flash. Redimensionner les images avant envoi et gérer les fichiers trop volumineux ou illisibles.

**Navigation du résultat.** La barre de navigation reste affichée sur le résultat et peut recouvrir le CTA « Nouvelle analyse » ; cela a été observé sur la capture navigateur. Prévoir un espace réservé cohérent ou masquer la barre sur ce parcours. Vérifier aussi les petits écrans : le cadre photo fixe de 400 px et les commandes peuvent dépasser l’espace disponible.

**Accessibilité.** Les chips ont déjà des états accessibles et les boutons d’icônes des libellés, ce qui est positif. Les feuilles de saisie doivent toutefois avoir une sémantique de dialogue, un focus contenu, fermeture par Échap et restauration du focus. Donner un vrai libellé à la saisie du code ; utiliser `type="text"` et `inputMode="numeric"` pour traiter un identifiant plutôt qu’un nombre. Compléter les interactions clavier des onglets et annoncer chargements/erreurs. Les contrastes et le comportement avec lecteur d’écran restent à mesurer.

**Qualité et tests.** Ajouter `@types/react` et `@types/react-dom`, activer progressivement le mode strict, remplacer les accès dynamiques aux icônes via `any`, puis mettre en place un vrai lint. Créer une suite de tests du moteur, des contrats HTTP et des parcours profil → scan → résultat → historique. Aucun pipeline CI, README ou suite de tests n’a été trouvé dans les fichiers du projet.

**Performance.** Le JavaScript produit fait 1 701,01 kB minifié, 392,64 kB gzip ; Vite signale un chunk trop volumineux. La bibliothèque de scan et l’import de tout le catalogue Lucide sont des pistes à mesurer. Charger le scanner à la demande et importer explicitement les icônes utilisées. Ces chiffres concernent la taille du build ; aucun temps de chargement ni score Lighthouse n’a été mesuré.

**Exploitation.** Le port 3000 et l’écoute sur `0.0.0.0` sont fixes. Ajouter un port configurable, une route de santé et un arrêt propre. Documenter `NODE_ENV=production` : `npm start` seul laisse le serveur choisir sa branche de développement. Définir une installation reproductible avec le gestionnaire et le verrou retenus. Les fichiers compilés et leurs sourcemaps se trouvent dans le dossier servi statiquement : décider explicitement de la publication des cartes sources et éviter de servir les artefacts serveur.

**Données personnelles et transparence.** Le profil et les scans restent dans le stockage du navigateur, sans synchronisation ni migration de schéma. Expliquer ce stockage et prévoir une remise à zéro du profil. Informer l’utilisateur de l’envoi des photos à Gemini avant la première analyse et définir la politique de conservation. Ne pas journaliser le texte intégral des réponses IA. Le `.env` est ignoré par Git et n’est pas suivi, ce qui est un bon point.

## 5. Ordre de travail recommandé

1. Corriger les faux négatifs et le profil vide, avec tests reproductibles du moteur.
2. Corriger la configuration Gemini, la validation des réponses et les messages d’erreur.
3. Rendre l’historique fonctionnel, y compris la restauration des photos.
4. Corriger les preuves affichées, la date et la provenance.
5. Réparer les alternatives en cas de panne caméra et le chevauchement de navigation.
6. Ajouter typage strict, tests automatisés et CI, puis vérifier les parcours sur téléphone.
7. Réduire le bundle et documenter installation, déploiement, stockage et exploitation.

Le projet constitue un prototype structuré et compilable. Les composants et la séparation des services donnent une base réutilisable. Les défauts de détection et de présentation des preuves doivent être corrigés avant de considérer ses résultats comme suffisamment fiables pour un usage réel.

## 6. État laissé après l’audit

La version compilée est lancée à http://localhost:3000 avec `NODE_ENV=production npm start`. L’accueil est ouvert dans le navigateur Codex. Le profil fictif utilisé pour les tests a été retiré. Les dépendances sont dans `node_modules`, les artefacts dans `dist` ; ces dossiers sont ignorés par Git. Ce rapport est le seul fichier source ajouté. Aucun secret n’est inclus dans le rapport.
