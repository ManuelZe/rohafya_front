# Rohafya

Front-end de **ROHAFYA** (« Votre santé, connectée ») : portail des résultats médicaux pour les patients, les médecins et les établissements de santé. Application Angular 22 avec rendu serveur (SSR), PrimeNG et Tailwind.

L'application s'appelait auparavant EDEN (`eden_app`). Pour mettre à jour une installation existante, voir `Documentation/02_DEPLOIEMENT_HETZNER_PORTAINER.txt`, section 14.

## Dépôts

| Dépôt | Rôle |
| --- | --- |
| `rohafya_front` (ce dépôt) | Application Angular, image Docker `rohafya` |
| `Rohafya` | API Flask (`flask --app Rohafya …`) : comptes, résultats, mode SaaS (`Rohafya/saas/README.md`) |

## Développement local

```bash
npm ci
ng serve                      # http://localhost:4200, rechargement automatique
```

Rendu serveur, comme en production :

```bash
ng build
npm run serve:ssr:rohafya     # http://localhost:4000
```

L'URL de l'API vient de `src/environments/environment.development.ts` avec `ng serve`. En production, elle vient de la variable `API_URL` du conteneur, transmise au navigateur par `/env.js` (`window.__ROHAFYA_ENV__`).

### Redirections et liens

- Le front ne code aucune URL de lui-même en dur. Toutes ses redirections restent sur le domaine courant : `localhost:4000` en local, `rohafya.com` en ligne.
- Les liens absolus produits par l'API (QR codes `/l/<jeton>`, e-mails) pointent vers le front d'où vient la requête, s'il figure dans les origines autorisées de l'API. Ces origines sont définies dans `Rohafya/saas/constants.py` ou par la variable `ROHAFYA_FRONT_ORIGINS`. Par défaut : `https://rohafya.com`, `https://preprod.rohafya.com`, `http://localhost:4000` et `http://localhost:4200`.
- Sans origine reconnue, l'API utilise `ROHAFYA_FRONT_URL`, qui vaut `https://rohafya.com` par défaut.

## Mode démonstration

Le bouton « Démo » de la page d'accueil ouvre l'application avec des données fictives. Rien ne part vers l'API : `src/app/demo/demo-interceptor.ts` répond à sa place. Quatre profils sont proposés, du moins élevé au plus élevé :

| Profil | Compte fictif | Espace |
| --- | --- | --- |
| Patient | Aïcha NGONO | `/patients` |
| Médecin | Dr Paul EKANÉ | `/doctors` |
| Administrateur d'établissement | Joseph KAMGA (Centre de démonstration, Laboratoire Horizon) | `/admin` |
| Super-administrateur | Mireille ABENA | `/super-admin` |

Les quatre profils partagent les mêmes données, et une information circule du profil le moins élevé vers le plus élevé :

- **patient → médecin** : un résultat partagé apparaît dans « Résultats reçus », et le médecin reçoit une notification ;
- **patient ou médecin → établissement** : les prescriptions, pré-enregistrements et requêtes arrivent dans « Demandes ». La réponse de l'établissement revient à l'auteur, avec une notification ;
- **patient → établissement** : le rattachement avec le code d'un QR code généré par l'administrateur (menu « QR codes ») apparaît dans « Rattachements » ;
- **médecin → établissement** : la consultation d'un résultat partagé est inscrite au journal ;
- **établissement → super-administrateur** : toutes ces actions sont inscrites au journal, et les statistiques et la liste des établissements suivent.

Le bandeau « Démo » permet de changer de profil sans perdre les données, de les remettre à zéro ou de quitter la démo. Les données sont gardées dans l'onglet (`sessionStorage`) : elles survivent à un rechargement, mais pas à la fermeture de l'onglet. Les fichiers joints restent en mémoire et sont remplacés par une image générée après un rechargement.

Organisation du code (`src/app/demo/`) :

| Fichier | Rôle |
| --- | --- |
| `data/patient.json`, `data/doctor.json`, `data/platform.json` | Données d'origine (dates relatives : `@J-3T09:30`) |
| `demo-store.ts` | Données partagées, persistance, journal, notifications, vues au format de l'API |
| `demo-backend.ts` | Routes des espaces patient et médecin, routage, point d'entrée de l'intercepteur |
| `demo-saas.ts` | Routes `saas/me`, console d'établissement (`saas/admin`) et console super-admin (`saas/super`) |
| `demo-session.ts`, `demo-banner/`, `demo-launcher/` | Ouverture, changement de profil et sortie |

Si un écran appelle un nouvel endpoint, ajoutez la route correspondante dans `demo-backend.ts` ou `demo-saas.ts`, avec la même réponse que l'API Flask. Sinon, la démo répond « Cette fonctionnalité n'est pas disponible en mode démo ». Les tests sont dans `demo-backend.spec.ts`.

## Tests et build

```bash
ng test --watch=false         # tests unitaires (Vitest)
ng build                      # sortie : dist/rohafya
```

Le message `getBoundingClientRect is not a function` pendant le pré-rendu est connu et ne bloque pas le build (voir `Documentation/03_EXPLOITATION_ET_DEPANNAGE.txt`, section 6).

## Charte graphique

### Logo et icônes (`public/`)

| Fichier | Contenu | Utilisé dans |
| --- | --- | --- |
| `rohafya-logo.png` | Logo complet ROHAFYA avec la signature « Votre santé, connectée » (fond transparent) | Écran de démarrage (`src/index.html`) |
| `rohafya-emblem.png` | Croix + « RH » (fond transparent) | En-tête de la page d'accueil (`src/app/intro`) |
| `favicon.ico` | Croix + « RH », 16 à 64 px | Onglet du navigateur |
| `icon-192.png`, `apple-touch-icon.png` | Croix + « RH » | Android, iOS (écran d'accueil) |

L'emblème animé des chargements (`src/app/shared/rohafya-mark`) reprend la croix du logo en SVG : une croix verte traversée d'un tracé de pouls blanc.

### Couleurs

Les couleurs sont définies une seule fois, dans `src/styles.css`, sous forme de variables CSS. Le preset PrimeNG (`src/app/app.config.ts`) utilise la palette émeraude, qui contient le vert du logo.

| Variable | Valeur | Usage |
| --- | --- | --- |
| `--rohafya-green` | `#10b981` | Vert du logo : décor, icônes, halos, barres de progression |
| `--rohafya-green-700` (`--color-primary`) | `#047857` | Boutons, liens, élément actif (contraste 5,5:1 avec le blanc) |
| `--rohafya-green-800` | `#065f46` | Survol des actions |
| `--rohafya-green-600` | `#059669` | Contours de focus (3,8:1) |
| `--rohafya-green-400` | `#34d399` | Accents sur fond marine (barres latérales) |
| `--rohafya-navy` (`--color-accent`) | `#0c4562` | Marine du logo : barres latérales, titres, indicateurs principaux |
| `--rohafya-navy-dark` | `#08304a` | Dégradés marine |

Règles :

- Ne jamais mettre un texte blanc sur `#10b981`, qui ne donne que 2,5:1 de contraste (refusé en WCAG AA). Utiliser `#047857`.
- Les couleurs d'état ne suivent pas la marque : rouge pour les erreurs, ambre pour les avertissements, vert pour les succès.
- Une troisième couleur de catégorie, si besoin : bleu pétrole `#1f6a8f`.

## Documentation

- `Documentation/` : versionnage Git, déploiement (Hetzner, Portainer), exploitation et dépannage. Commencer par `00_LISEZMOI.txt`.
- `Documentation_SaaS/` : connexion par rôle, données de test, extraction des PDF.
- `CHANGELOG.md` : généré par `Documentation/scripts/release.sh` à partir des messages de commit.
