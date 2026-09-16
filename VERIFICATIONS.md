# Bilan des corrections

16 septembre 2026. Le rapport initial reste dans `RAPPORT_AUDIT.md` ; ce document décrit les corrections et les contrôles effectués ensuite.

## Corrections par priorité

1. **Détection** : occurrences et négations locales, accents et synonymes français/anglais, distinction entre texte et traces, statut prudent avec profil vide et photo sans détection. Les faux négatifs et le faux positif coco du rapport sont couverts par des tests.
2. **Photo/API** : chargement de `.env`, modèle configurable, validation image et sortie IA, refus des étiquettes incomplètes, confirmation d’envoi, erreurs JSON, délais, annulation et quotas.
3. **Historique et résultats** : sauvegarde automatique avec identifiant local, rechargement des photos depuis le stockage, migration des anciennes données, recalcul avec le profil actuel, provenance et dates réelles, ingrédients complets visibles.
4. **Scanner et interface** : caméra activée par action explicite, saisie/import disponibles indépendamment de la caméra, verrou de traitement, contrôle GTIN, préparation des photos, dialogues natifs avec focus/Échap, CTA de résultat dégagé.
5. **Qualité et exploitation** : TypeScript strict, ESLint avec hooks/accessibilité, dépendances nettoyées et verrou npm, routes chargées à la demande, contrastes améliorés et tokens de texte définis, réduction des animations selon les préférences système, configuration de port/hôte, route de santé, arrêt propre et serveur compilé hors des fichiers publics.
6. **CI** : installation propre, typage, lint, tests, build et tests du démarrage production, y compris sans dépendances de développement. Actions officielles référencées par leurs commits immuables, permissions en lecture seule.

## Résultats mesurés

- `npm ci` : installation réussie depuis le verrou, aucune vulnérabilité signalée par l’audit intégré dans cette résolution.
- `npm run check` : typage strict, lint sans avertissement, **69 tests réussis**, compilation réussie.
- `npm run smoke` : serveur production, routes SPA, fichiers client, erreurs API et absence d’accès aux artefacts serveur contrôlés.
- Extraction réelle d’une **étiquette entièrement fictive** via `POST /api/analyze-image` : HTTP 200 avec `gemini-3.5-flash-lite`, lait/gluten comme ingrédients et arachide comme trace. Les modèles précédents avaient renvoyé des erreurs fournisseur ; le modèle fonctionnel est maintenant le défaut configurable.
- Navigateur : profil fictif conservé après rechargement, code invalide bloqué, recherche Nutella à éviter pour le lait, sauvegarde unique et résultat retrouvé après rechargement.
- Vue **375 × 667** : absence de débordement horizontal et bouton « Nouvelle analyse » visible sur le résultat. Dialogue de saisie reconnu avec champ libellé et bouton désactivé tant que le code est invalide.
- JavaScript initial : **308,52 Ko minifié / 97,36 Ko gzip**, contre **1 701,01 Ko / 392,64 Ko** au premier audit. Scanner séparé : **349,04 Ko / 104,64 Ko gzip**. Aucun avertissement Vite de chunk supérieur à 500 Ko.

## Limites de validation

L’outil de contrôle du navigateur n’a pas permis de mener l’import de fichiers jusqu’au bout. L’API photo réelle, le client photo, son rendu et sa persistance ont été contrôlés séparément. Caméra physique, lecture d’un code imprimé et flash restent dépendants du matériel et n’ont pas été validés sur un téléphone.

Les limites d’appels IA sont adaptées à un processus et restent en mémoire. Un déploiement sur plusieurs instances nécessitera un compteur partagé et des quotas côté fournisseur. Aucun déploiement public, réglage de protection de branche, compte utilisateur ou synchronisation entre appareils n’a été ajouté : ces points relèvent du choix de déploiement ou d’une évolution du produit.

Les tests navigateur ont utilisé l’origine `127.0.0.1`, distincte du profil existant sur `localhost`. Le profil existant n’a pas été réinitialisé.
