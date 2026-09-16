# SafeEat

Application React/Express de comparaison des ingrédients et traces d’un produit avec un profil d’allergies. Les codes-barres interrogent Open Food Facts ; les photos sont envoyées à Google Gemini après confirmation. Le résultat est une aide à la lecture et ne garantit pas l’absence d’allergènes.

## Parcours : allergène personnalisé et scan d’un produit

Ce diagramme décrit le fonctionnement actuel du POC. L’allergène personnalisé est activé dès son ajout ; son nom et ses synonymes restent dans le navigateur. Le code-barres identifie le produit, mais ce sont les données d’ingrédients et d’avertissements qui sont analysées.

```mermaid
sequenceDiagram
    autonumber
    actor U as Utilisateur
    participant UI as Interface SafeEat
    participant S as Profil et historique locaux
    participant M as Moteur local
    participant L as localStorage
    participant FoodDb as Open Food Facts
    participant API as Serveur SafeEat
    participant G as Google Gemini

    U->>UI: Ajouter un allergène (ex. Kiwi) et ses synonymes (kiwifruit)
    UI->>S: Valider le nom, les mots-clés, les doublons et les limites
    alt Ajout invalide
        S-->>UI: Erreur de validation
        UI-->>U: Afficher le message de correction
    else Ajout valide
        S->>S: Créer un identifiant custom et activer la restriction
        loop Analyses déjà présentes dans l’historique
            S->>M: Recalculer avec le nouveau profil et les mots-clés
            M-->>S: Résultat, preuves et limites
        end
        S->>L: Enregistrer le profil et l’historique recalculé
        UI-->>U: Confirmer l’ajout et l’activation
    end

    U->>UI: Scanner un code-barres EAN/UPC ou le saisir
    UI->>UI: Vérifier le format et la clé de contrôle
    alt Code-barres invalide
        UI-->>U: Demander de corriger le code, sans appel externe
    else Code-barres valide
        UI->>FoodDb: Rechercher la fiche par code-barres (sans profil personnel)
        alt Produit trouvé et réponse valide
            FoodDb-->>UI: Ingrédients, tags allergènes, présence possible et dates
            UI->>S: Enregistrer une nouvelle observation du produit
            S->>M: Comparer les données au profil et aux mots-clés personnalisés
            Note over S,M: Les allergènes personnalisés n’ont pas de tags OFF dédiés.<br/>Leur détection repose sur le texte et les mots-clés configurés.
            M-->>S: Verdict, phrases justificatives, limites et versions
            S->>L: Conserver le scan, le profil au scan et le résultat
            UI-->>U: Afficher le résumé puis le détail des preuves
            Note over UI,M: Correspondance explicite en ingrédients : À éviter.<br/>Présence possible, ambiguïté ou données incomplètes : À vérifier.<br/>Aucune correspondance personnalisée : reste À vérifier.
        else Produit absent
            FoodDb-->>UI: Produit introuvable
            UI-->>U: Proposer de vérifier le code ou de photographier l’étiquette
        else Erreur réseau, délai dépassé ou données invalides
            FoodDb-->>UI: Échec de la recherche
            UI-->>U: Afficher l’erreur et permettre une nouvelle tentative ou une photo
        end
    end

    opt L’utilisateur choisit une photo après un échec ou pour vérifier la fiche
        U->>UI: Importer ou prendre une photo de l’étiquette
        UI-->>U: Expliquer l’envoi à Gemini et demander confirmation
        U->>UI: Confirmer l’envoi
        UI->>API: Envoyer la photo préparée avec consentement (sans allergies)
        API->>G: Extraire uniquement les informations visibles
        G-->>API: Ingrédients, avertissements, tags, langue et indicateurs de lecture
        API->>API: Valider la réponse et conserver les passages lisibles
        alt Extraction exploitable, même partielle
            API-->>UI: Données structurées et provenance de la photo
            opt Vérification photo lancée depuis un résultat existant
                UI->>UI: Conserver l’observation précédente et signaler les divergences
            end
            UI->>S: Enregistrer une observation photo séparée
            S->>M: Analyser localement avec le profil actuel
            M-->>S: Résultat et preuves, sans masquer les données manquantes
            S->>L: Enregistrer les textes, les dates et les versions
            UI-->>U: Afficher le résultat et les limites de lecture
        else Extraction inexploitable ou service indisponible
            API-->>UI: Erreur explicite
            UI-->>U: Demander une nouvelle photo ou une nouvelle tentative
        end
    end
```

La photo n’est pas envoyée automatiquement : l’utilisateur choisit cette étape et confirme l’envoi. Open Food Facts et Gemini fournissent les données ; le moteur local produit le verdict. Une absence de correspondance pour un allergène personnalisé reste inconclusive, même après relecture de l’étiquette.

## Installation et lancement

Utiliser Node.js 22 ou supérieur et npm. Depuis la racine du projet :

```sh
npm ci
cp .env.example .env
npm run dev
```

Le serveur charge `.env`. Renseigner `GEMINI_API_KEY` pour activer l’analyse photo ; les codes-barres fonctionnent sans clé. `GEMINI_MODEL` permet de choisir un modèle accessible au compte. Le modèle par défaut `gemini-3.5-flash-lite` a été vérifié avec une étiquette fictive ; les réglages de réflexion apparaissent dans les [exemples officiels Google](https://ai.google.dev/gemini-api/docs/generate-content/thinking) ; son accès effectif dépend de la clé et du quota.

Production :

```sh
npm run build
npm start
```

`npm start` sert par défaut `dist/client` en production. `NODE_ENV=development` est une dérogation explicite ; ne pas la définir pour un déploiement de production. Le serveur compilé et sa carte source restent en dehors du dossier servi. `npm run preview` prévisualise uniquement le frontend et ne fournit pas l’API photo.

L’application écoute par défaut sur `127.0.0.1:3000`. `PORT` et `HOST` sont configurables. Pour un conteneur, définir `HOST=0.0.0.0`. Utiliser HTTPS pour l’accès caméra hors localhost. `/api/health` indique la santé du processus et si l’IA est configurée ; il ne teste pas le fournisseur.

## Vérifications

```sh
npm run check
npm run smoke
```

Le mode TypeScript strict, ESLint (hooks React et accessibilité), les tests et la compilation sont exécutés par `check`. La CI reproduit ces contrôles sur Node 22, teste le serveur compilé puis vérifie son fonctionnement sans dépendances de développement. Les routes sont chargées à la demande et le scanner est séparé du JavaScript initial.

Les tests HTTP ouvrent des ports locaux temporaires. La suite utilise des réponses fournisseur simulées ; un test réel doit utiliser une étiquette fictive et une clé autorisée. Ne jamais enregistrer une vraie clé dans Git ou dans les résultats de test.

## API photo et limites

### Contrat de détection du POC

Le périmètre de conclusion est limité aux étiquettes françaises de produits préemballés. Les mots anglais existants peuvent déclencher une alerte, mais une langue non prise en charge empêche une conclusion sans correspondance. Le moteur local, versionné avec son dictionnaire, ne certifie jamais qu’un produit est sûr.

- Une mention explicite dans les ingrédients ou un tag allergène déclenche « À éviter », même si les données sont partielles.
- Une présence possible, un avertissement d’atelier ou un terme d’origine ambiguë déclenche « À vérifier ». « Peut contenir » n’est pas une trace confirmée.
- Des ingrédients absents, une complétude/lisibilité inconnue, des avertissements non vérifiés, une langue inconnue, une restriction non prise en charge ou un conflit empêchent un résultat rassurant.
- « Aucune correspondance » nécessite la relecture explicite du produit, de la liste complète et de toutes les zones d’avertissements sur l’emballage français. Cela ne garantit pas l’absence d’allergènes ni de contamination croisée. La confirmation utilisateur peut elle-même être erronée.
- Une correspondance personnalisée explicite déclenche une alerte ; une recherche personnalisée sans correspondance reste inconclusive.

Depuis le résultat, « Vérifier ce produit avec une photo » crée une observation séparée, conserve les textes précédents et signale leurs divergences. Les différences de format peuvent également déclencher une vérification : aucune résolution automatique par fusion ou vote. Une relecture est enregistrée séparément, sans modifier le scan initial ni rafraîchir artificiellement la date de consultation. Les tags sans phrase source n’obtiennent jamais de citation inventée. Les anciennes analyses sont recalculées conservativement à la restauration.

L’API photo conserve les passages lisibles d’une extraction partielle et transmet `labelReadable`, `ingredientsComplete`, `warningsComplete`, `language` et `warningsText`. Une réponse structurée valide n’atteste pas la fidélité de la lecture. Les anciens fournisseurs simulés sans nouveaux champs sont acceptés, mais restent inconclusifs. Aucune allergie personnelle n’est envoyée au fournisseur.

Le corpus figé de `tests/safety-corpus.test.ts` couvre les catégories standards, les dérivés explicites, les négations, les exceptions limitées, les avertissements, la complétude, les conflits et la restauration. Il est **synthétique, non validé médicalement**. Les tests HTTP simulent le fournisseur : ils ne mesurent pas les omissions réelles de Gemini sur les photos.

Avant un usage réel : constituer un corpus de photos d’étiquettes avec transcription et annotations revues, mesurer séparément les omissions d’extraction et les erreurs du moteur, puis faire relire les règles par une personne qualifiée. Les synonymes IA automatiques, le multilingue étendu, le cache inter-achats et l’optimisation supplémentaire des images restent hors de cette étape. Le dictionnaire lexical reste incomplet ; les exceptions réglementaires et les distinctions allergie/intolérance ne constituent pas une ontologie médicale implémentée.

### Transport et quotas

`POST /api/analyze-image` accepte un objet JSON `{ imageBase64, consent: true }`, avec une image JPEG/PNG/WebP de moins de 4 Mo. Les réponses réussies contiennent les ingrédients, les tags et la provenance. Les erreurs sont JSON avec `error.code`, `error.message` et `error.retryable`.

Les appels sont limités à 30 demandes POST par IP sur 15 minutes, deux analyses simultanées et 100 tentatives fournisseur par jour UTC. Le délai par défaut est de 30 secondes. Les variables `AI_MAX_CONCURRENCY`, `AI_DAILY_LIMIT`, `AI_TIMEOUT_MS` règlent ces limites. Les compteurs sont en mémoire et reviennent à zéro au redémarrage ; pour plusieurs instances, prévoir un stockage partagé et un budget côté fournisseur. Les limites protègent un petit déploiement, elles ne remplacent pas une stratégie de quota globale.

Derrière un reverse proxy, définir `TRUST_PROXY_HOPS` au nombre exact de relais de confiance ; laisser zéro sans proxy. Ne pas exposer directement un serveur configuré pour faire confiance à des relais inexistants.

## Confidentialité

Les analyses réussies sont enregistrées automatiquement (50 au maximum) et rouvertes via leur identifiant local, y compris les photos après rechargement. Les résultats sont recalculés avec le profil actuel ; les dates de consultation des données restent inchangées.

Le profil et l’historique sont conservés dans le localStorage du navigateur, sans compte ni synchronisation. Le serveur SafeEat ne conserve pas les photos et ne journalise pas leur contenu. Google reçoit la photo pour l’extraction ; consulter les règles du fournisseur applicables au compte. Éviter les photos contenant des informations personnelles.

Le [rapport initial](RAPPORT_AUDIT.md) décrit les défauts découverts avant les corrections et sert de référence historique.
