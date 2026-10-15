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

## Site de présentation

`/intro` (français) et `/en` (anglais) présentent ROHAFYA aux établissements de santé : constat, solution, mise en service, tarifs, questions fréquentes et formulaire « Demander un essai » (`src/app/intro/trial-form`), envoyé à `POST saas/public/trial-requests`. Les textes et les tarifs sont dans `src/app/intro/intro.content.ts`. Les deux pages sont pré-rendues, avec leurs balises `hreflang`. Un visiteur qui a choisi l'anglais est renvoyé de `/intro` vers `/en`. Les demandes reçues se suivent dans la console super-administrateur, page « Demandes d'essai ».

## Langues (français / anglais)

L'interface est écrite en français ; l'anglais est une traduction, choisie par chaque compte (sélecteur FR / EN des barres latérales et des pages de connexion). Le choix est gardé sur l'appareil (`localStorage`, clé `rohafyaLang`) et enregistré sur le compte (`PUT saas/me/preferences`), puis réappliqué à chaque connexion.

- **Dans un gabarit** : `{{ 'Texte français' | t }}`, avec paramètres `{{ '{0} résultat(s)' | t: [n] }}` ; dates : `{{ d | ldate: 'datetime' }}` (« à » / « at »).
- **Dans le code** : `tr('Texte français')` ou `tr('{n} disponibles', { n })` (`src/app/shared/i18n/i18n.ts`). Dans un `computed()`, le texte se recalcule au changement de langue.
- **Traductions** : `src/app/shared/i18n/en/*.ts` (une clé = le texte français exact, espaces normalisés). Un texte sans traduction reste en français, jamais vide. En développement, les textes manquants rencontrés sont listés dans `window.__rohafyaMissing`.
- **Règle** : une phrase complète par clé. Ne pas coller des morceaux (« résultat » + « s ») : écrire une clé par variante, par exemple `(n > 1 ? '{0} résultats' : '{0} résultat') | t: [n]`.
- Les messages de l'API (en français) passent aussi par le dictionnaire (`en/api.ts`). Les données saisies (noms, examens, messages) ne sont pas traduites.
- Le dictionnaire anglais n'est chargé que si l'anglais est choisi. `src/app/shared/i18n/i18n.spec.ts` vérifie notamment que chaque traduction garde les paramètres `{…}` du texte français.
- Chaque appel à l'API porte `Accept-Language: fr | en` (`shared/i18n/lang-interceptor.ts`) : l'API envoie ainsi les e-mails dans la langue de l'interface quand le destinataire n'a pas encore de préférence enregistrée.

## Abonnement des établissements

- **Établissement** : page « Abonnement » (`/admin/abonnement`) : formule et conditions, essai restant, volume publié du mois (jauge) et des 12 derniers mois (histogramme), recommandation de formule, factures téléchargeables en PDF. Le tableau de bord affiche le volume du mois.
- **Super-administrateur** : page « Facturation » (`/super-admin/facturation`) : revenu mensuel récurrent, essais, reste à encaisser, volume de chaque établissement, factures à encaisser ou annuler, bouton « Émettre les factures dues » ; section « Abonnement » de la fiche d'un établissement (formule, statut, rythme, conditions particulières, mise en service offerte, mois offerts).
- Code : `saas/billing.models.ts` (types et libellés), `saas/shared/billing/` (jauge, histogramme, PDF de facture), `shared/pdf/` (pdfmake partagé et bouton de téléchargement : sur téléphone, le PDF est préparé puis proposé par un vrai lien).

## Sécurité et données personnelles

- **Double authentification** : étape « code » à la connexion (`connexion/mfa-step`), réglages dans `shared/security/mfa-settings` (QR code, codes de secours). Obligatoire pour les administrateurs : la garde `mfaSetupGuard` ouvre les consoles sur leur page « Sécurité » tant qu'elle n'est pas activée, et l'intercepteur y renvoie si l'API répond `mfa_setup_required`.
- **Confidentialité** (`/patients/confidentialite`, `/doctors/confidentialite`) : historique des accès au dossier (patient), export des données en JSON, double authentification facultative, demande de suppression du compte. Côté super-administrateur : « Données personnelles » (`/super-admin/donnees-personnelles`) pour traiter les demandes, et réinitialisation de la double authentification depuis « Comptes ».
- **Politique de confidentialité** publique : `/confidentialite` (pré-rendue, liens dans le pied du site et le formulaire d'essai). Texte dans `src/app/legal/privacy-policy.ts`, à faire valider par un juriste.

## Application installable

ROHAFYA s'installe sur l'écran d'accueil du téléphone, sans store :

- `public/manifest.webmanifest` (nom, icônes 192 et 512 px dont des icônes « maskable », couleur, raccourcis « Mes résultats » et « Mes factures ») ; entrée de l'application : `/app`, qui ouvre l'espace de l'utilisateur connecté, sinon la connexion ;
- `public/sw.js`, service worker minimal enregistré en production seulement (`shared/pwa/pwa.service.ts`) : il ne met **aucune donnée médicale ni réponse de l'API** en cache, seulement la page `public/offline.html` affichée sans connexion ; le serveur Node le sert avec `Cache-Control: no-cache` ;
- bouton « Installer l'application » (`shared/pwa/install-app.ts`) dans les barres latérales patient et médecin et dans le pied du site : invitation du navigateur (Chrome, Edge, Samsung Internet), ou marche à suivre sur iPhone (Safari, « Sur l'écran d'accueil ») ; masqué quand l'application est déjà installée.

## Mode démonstration

Le bouton « Démo » de la page d'accueil ouvre l'application avec des données fictives. Rien ne part vers l'API : `src/app/demo/demo-interceptor.ts` répond à sa place. Trois profils sont proposés, du moins élevé au plus élevé :

| Profil | Compte fictif | Espace |
| --- | --- | --- |
| Patient | Aïcha NGONO | `/patients` |
| Médecin | Dr Paul EKANÉ | `/doctors` |
| Administrateur d'établissement | Joseph KAMGA (Centre de démonstration, Laboratoire Horizon) | `/admin` |

Les trois profils partagent les mêmes données, et une information circule du profil le moins élevé vers le plus élevé :

- **patient → médecin** : un résultat partagé apparaît dans « Résultats reçus », et le médecin reçoit une notification ;
- **patient ou médecin → établissement** : les prescriptions, pré-enregistrements et requêtes arrivent dans « Demandes ». La réponse de l'établissement revient à l'auteur, avec une notification ;
- **patient → établissement** : le rattachement avec le code d'un QR code généré par l'administrateur (menu « QR codes ») apparaît dans « Rattachements » ;
- **médecin → établissement** : la consultation d'un résultat partagé est inscrite au journal ;
- **établissement → patients et médecins** : depuis « Notifications », l'administrateur écrit à un patient ou un médecin précis, à une sélection ou à tout le groupe ; la notification apparaît dans l'espace du destinataire (en démo, aucun e-mail ne part) ;
- **dans l'établissement** : toutes ces actions sont inscrites au journal, et le tableau de bord suit.

La console super-administrateur (dont l'envoi de notifications aux établissements, les droits des comptes, les demandes d'essai, la facturation et les demandes de suppression) n'a pas de profil de démo. L'administrateur de démonstration voit un abonnement fictif (`demo/demo-billing.ts` : formule Standard, trois factures pour le premier établissement, essai pour les autres) ; le patient voit l'historique des accès à son dossier et peut préparer l'export ; la double authentification et la suppression de compte ne sont pas disponibles en démo.

Le bandeau « Démo » permet de changer de profil sans perdre les données, de les remettre à zéro ou de quitter la démo. Les données sont gardées dans l'onglet (`sessionStorage`) : elles survivent à un rechargement, mais pas à la fermeture de l'onglet. Les fichiers joints restent en mémoire et sont remplacés par une image générée après un rechargement.

Organisation du code (`src/app/demo/`) :

| Fichier | Rôle |
| --- | --- |
| `data/patient.json`, `data/doctor.json`, `data/platform.json` | Données d'origine (dates relatives : `@J-3T09:30`) |
| `demo-store.ts` | Données partagées, persistance, journal, notifications, vues au format de l'API |
| `demo-backend.ts` | Routes des espaces patient et médecin, routage, point d'entrée de l'intercepteur |
| `demo-saas.ts` | Routes `saas/me` et console d'établissement (`saas/admin`) |
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
| `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png` | Croix + « RH » sur fond blanc (marge de sécurité pour les icônes rondes) | Application installée (`manifest.webmanifest`) |

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
