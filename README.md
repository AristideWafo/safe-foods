# SafeEat

Application React/Express de comparaison des ingrédients et traces d’un produit avec un profil d’allergies. Les codes-barres interrogent Open Food Facts ; les photos sont envoyées à Google Gemini après confirmation. Le résultat est une aide à la lecture et ne garantit pas l’absence d’allergènes.

## Installation et lancement

Utiliser Node.js 22 ou supérieur et npm. Depuis la racine du projet :

```sh
npm ci
cp .env.example .env
npm run dev
```

Le serveur charge `.env`. Renseigner `GEMINI_API_KEY` pour activer l’analyse photo ; les codes-barres fonctionnent sans clé. `GEMINI_MODEL` permet de choisir un modèle accessible au compte. Le modèle par défaut apparaît dans les [exemples officiels Google](https://ai.google.dev/gemini-api/docs/generate-content/thinking) ; son accès effectif dépend de la clé et du quota.

Production :

```sh
npm run build
npm start
```

`npm start` sert par défaut `dist/client` en production. `NODE_ENV=development` est une dérogation explicite ; ne pas la définir pour un déploiement de production. Le serveur compilé et sa carte source restent en dehors du dossier servi. `npm run preview` prévisualise uniquement le frontend et ne fournit pas l’API photo.

L’application écoute par défaut sur `127.0.0.1:3000`. `PORT` et `HOST` sont configurables. Pour un conteneur, définir `HOST=0.0.0.0`. Utiliser HTTPS pour l’accès caméra hors localhost. `/api/health` indique la santé du processus et si l’IA est configurée ; il ne teste pas le fournisseur.

## Vérifications

```sh
npm run lint
npm test
npm run build
```

Les tests HTTP ouvrent des ports locaux temporaires. La suite utilise des réponses fournisseur simulées ; un test réel doit utiliser une étiquette fictive et une clé autorisée. Ne jamais enregistrer une vraie clé dans Git ou dans les résultats de test.

## API photo et limites

`POST /api/analyze-image` accepte un objet JSON `{ imageBase64, consent: true }`, avec une image JPEG/PNG/WebP de moins de 4 Mo. Les réponses réussies contiennent les ingrédients, les tags et la provenance. Les erreurs sont JSON avec `error.code`, `error.message` et `error.retryable`.

Les appels sont limités à 30 demandes POST par IP sur 15 minutes, deux analyses simultanées et 100 tentatives fournisseur par jour UTC. Le délai par défaut est de 30 secondes. Les variables `AI_MAX_CONCURRENCY`, `AI_DAILY_LIMIT`, `AI_TIMEOUT_MS` règlent ces limites. Les compteurs sont en mémoire et reviennent à zéro au redémarrage ; pour plusieurs instances, prévoir un stockage partagé et un budget côté fournisseur. Les limites protègent un petit déploiement, elles ne remplacent pas une stratégie de quota globale.

Derrière un reverse proxy, définir `TRUST_PROXY_HOPS` au nombre exact de relais de confiance ; laisser zéro sans proxy. Ne pas exposer directement un serveur configuré pour faire confiance à des relais inexistants.

## Confidentialité

Le profil et l’historique sont conservés dans le localStorage du navigateur, sans compte ni synchronisation. Le serveur SafeEat ne conserve pas les photos et ne journalise pas leur contenu. Google reçoit la photo pour l’extraction ; consulter les règles du fournisseur applicables au compte. Éviter les photos contenant des informations personnelles.

Le [rapport initial](RAPPORT_AUDIT.md) décrit les défauts découverts avant les corrections et sert de référence historique.
