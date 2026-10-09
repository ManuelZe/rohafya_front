import { DemoSpace } from '../demo/demo-token';

/**
 * Contenu de la page d'accueil. Les fonctionnalités citées sont celles des espaces réels
 * (patients, médecins, établissements) ; le discours suit le document de vente :
 * pas de promesse sur ce que ROHAFYA ne fait pas (rendez-vous, téléconsultation, interprétation).
 */

export interface NavLink {
  id: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { id: 'pourquoi', label: 'Pourquoi ROHAFYA' },
  { id: 'espaces', label: 'Fonctionnalités' },
  { id: 'comment', label: 'Comment ça marche' },
  { id: 'confiance', label: 'Sécurité' },
  { id: 'faq', label: 'Questions' },
  { id: 'contact', label: 'Contact' },
];

/** Coordonnées publiques : section « Nous contacter », pied de page et données structurées. */
export const CONTACT = {
  /** Format international E.164, pour les liens tel: et schema.org. */
  phone: '+237695995842',
  phoneDisplay: '+237 6 95 99 58 42',
  email: 'zeafemanuel@rohafya.com',
  country: 'CM',
};

export interface Highlight {
  icon: string;
  title: string;
  text: string;
}

/** Comparatif « Avant / Avec ROHAFYA » : mêmes lignes, deux états. */
export interface CompareRow {
  icon: string;
  before: string;
  after: string;
}

export const COMPARE_ROWS: CompareRow[] = [
  {
    icon: 'car',
    before: 'Deux déplacements par examen : un pour le prélèvement, un second pour retirer le résultat.',
    after: 'Un seul déplacement : le résultat arrive sur le téléphone du patient dès sa validation.',
  },
  {
    icon: 'file',
    before: 'Des résultats non retirés qui restent dans une armoire, et des examens à refaire.',
    after: 'Laboratoire, imagerie, exploration et factures réunis dans un seul compte, consultables à tout moment.',
  },
  {
    icon: 'phone',
    before: 'Un accueil occupé à classer, chercher et répondre au téléphone.',
    after: 'Moins d’appels : le patient suit lui-même l’état de ses demandes et reçoit une notification.',
  },
  {
    icon: 'history',
    before: 'Des résultats envoyés par messagerie, sans aucune trace de qui a reçu quoi.',
    after: 'Une remise tracée : chaque opération sensible est inscrite au journal de l’établissement.',
  },
];

export interface RoleFeature {
  icon: string;
  title: string;
  text: string;
}

/** Aperçu d'écran dessiné en CSS pour chaque espace. */
export interface MockRow {
  title: string;
  meta: string;
  status: string;
  tone: 'ok' | 'wait' | 'info';
}

export interface MockKpi {
  label: string;
  value: string;
}

export interface RoleShowcase {
  space: DemoSpace;
  tab: string;
  icon: string;
  headline: string;
  pitch: string;
  features: RoleFeature[];
  mock: {
    title: string;
    nav: string[];
    kpis: MockKpi[];
    listTitle: string;
    rows: MockRow[];
  };
  cta: { label: string; link: string };
  demoLabel: string;
}

export const ROLES: RoleShowcase[] = [
  {
    space: 'patient',
    tab: 'Patients',
    icon: 'user',
    headline: 'Tous vos résultats, sur votre téléphone, quel que soit l’établissement.',
    pitch: 'Gratuit et sans application à installer : un navigateur suffit. Vous seul décidez qui voit vos résultats.',
    features: [
      { icon: 'file', title: 'Résultats d’examens', text: 'Laboratoire, imagerie et exploration fonctionnelle, avec valeurs et normes affichées telles que validées.' },
      { icon: 'money-bill', title: 'Factures et devis', text: 'Retrouvez vos factures et leur état de règlement, établissement par établissement.' },
      { icon: 'share-alt', title: 'Partage avec un médecin', text: 'Partagez un résultat avec le médecin de votre choix ; modifiez ou retirez ce partage à tout moment.' },
      { icon: 'building', title: 'Mes établissements', text: 'Rattachez votre dossier en scannant le QR code de votre facture : un seul compte pour tous.' },
      { icon: 'list-check', title: 'Prescriptions et pré-enregistrements', text: 'Préparez votre venue et transmettez vos prescriptions avant le jour de l’examen.' },
      { icon: 'send', title: 'Requêtes et notifications', text: 'Posez une question à l’établissement et soyez prévenu dès qu’un résultat est prêt.' },
    ],
    mock: {
      title: 'Espace patient',
      nav: ['Tableau de bord', 'Factures', 'Examens', 'Prescriptions', 'Mes établissements'],
      kpis: [
        { label: 'Résultats', value: '12' },
        { label: 'Établissements', value: '3' },
        { label: 'Partages actifs', value: '2' },
      ],
      listTitle: 'Résultats récents',
      rows: [
        { title: 'Numération formule sanguine', meta: 'Laboratoire · Douala', status: 'Disponible', tone: 'ok' },
        { title: 'Échographie abdominale', meta: 'Centre d’imagerie · Yaoundé', status: 'Compte rendu', tone: 'info' },
        { title: 'Bilan lipidique', meta: 'Laboratoire · Douala', status: 'En cours', tone: 'wait' },
      ],
    },
    cta: { label: 'Créer mon compte patient', link: '/register' },
    demoLabel: 'Essayer l’espace patient',
  },
  {
    space: 'doctor',
    tab: 'Médecins',
    icon: 'id-card',
    headline: 'Les résultats de vos patients, au même endroit, présentés de la même façon.',
    pitch: 'Quel que soit le laboratoire ou le centre d’imagerie, les comptes rendus que vos patients vous partagent arrivent dans un seul écran.',
    features: [
      { icon: 'share-alt', title: 'Résultats reçus', text: 'Consultez les résultats partagés par vos patients, triés et filtrables, sans relance par téléphone.' },
      { icon: 'list-check', title: 'Prescriptions', text: 'Adressez une prescription à l’établissement pour le compte de votre patient.' },
      { icon: 'check-circle', title: 'Pré-enregistrements', text: 'Pré-enregistrez vos patients pour accélérer leur prise en charge à l’accueil.' },
      { icon: 'send', title: 'Requêtes', text: 'Échangez avec les établissements partenaires et suivez chaque demande jusqu’à sa réponse.' },
      { icon: 'megaphone', title: 'Actualités', text: 'Restez informé des nouveautés publiées par les établissements avec lesquels vous travaillez.' },
      { icon: 'bell', title: 'Notifications', text: 'Soyez prévenu dès qu’un patient vous partage un résultat ou qu’un établissement vous répond.' },
    ],
    mock: {
      title: 'Espace docteur',
      nav: ['Tableau de bord', 'Résultats reçus', 'Prescriptions', 'Requêtes', 'Actualités'],
      kpis: [
        { label: 'Résultats reçus', value: '48' },
        { label: 'Nouveaux', value: '5' },
        { label: 'Requêtes ouvertes', value: '2' },
      ],
      listTitle: 'Résultats reçus',
      rows: [
        { title: 'Glycémie à jeun · M. Essomba', meta: 'Partagé aujourd’hui', status: 'Nouveau', tone: 'ok' },
        { title: 'Radiographie thoracique · Mme Ngo', meta: 'Partagé hier', status: 'Compte rendu', tone: 'info' },
        { title: 'Ionogramme · M. Fouda', meta: 'Partagé il y a 3 jours', status: 'Consulté', tone: 'wait' },
      ],
    },
    cta: { label: 'Accéder à mon espace', link: '/connexion' },
    demoLabel: 'Essayer l’espace médecin',
  },
  {
    space: 'admin',
    tab: 'Établissements',
    icon: 'building',
    headline: 'Moins de résultats non retirés, moins d’appels, une remise tracée.',
    pitch: 'Rien à changer dans votre logiciel : ROHAFYA s’y branche et vous gardez la main sur chaque règle de remise.',
    features: [
      { icon: 'inbox', title: 'Demandes reçues', text: 'Requêtes, prescriptions et pré-enregistrements des patients et médecins : répondez ou envoyez un devis.' },
      { icon: 'qrcode', title: 'QR codes sur la facture', text: 'Le patient rattache son dossier en un scan ; vous fixez la validité des codes.' },
      { icon: 'users', title: 'Patients et rattachements', text: 'Retrouvez chaque dossier et validez un rattachement en cas de doute sur l’identité.' },
      { icon: 'id-card', title: 'Médecins', text: 'Gérez les médecins prescripteurs liés à votre établissement.' },
      { icon: 'lock', title: 'Résultats après règlement', text: 'Masquez le détail d’un résultat tant que la facture n’est pas réglée, et réglez la durée d’accès.' },
      { icon: 'history', title: 'Journal des opérations', text: 'Qui a remis quoi, à qui, quand : chaque opération sensible est tracée.' },
    ],
    mock: {
      title: 'Administration',
      nav: ['Tableau de bord', 'Demandes', 'Patients', 'QR codes', 'Journal'],
      kpis: [
        { label: 'Résultats publiés', value: '1 284' },
        { label: 'Demandes en attente', value: '7' },
        { label: 'Rattachements', value: '312' },
      ],
      listTitle: 'Demandes reçues',
      rows: [
        { title: 'Pré-enregistrement · Bilan prénatal', meta: 'Envoyé par un médecin', status: 'À traiter', tone: 'wait' },
        { title: 'Demande de devis · IRM du genou', meta: 'Envoyée par un patient', status: 'Devis envoyé', tone: 'info' },
        { title: 'Rattachement de dossier', meta: 'QR code scanné', status: 'Validé', tone: 'ok' },
      ],
    },
    cta: { label: 'Se connecter à l’administration', link: '/connexion' },
    demoLabel: 'Essayer l’espace établissement',
  },
];

/** Parcours du patient, repris de l'affiche d'accueil du kit d'information. */
export interface Step {
  icon: string;
  title: string;
  text: string;
}

export const STEPS: Step[] = [
  { icon: 'qrcode', title: 'Scannez le code', text: 'Le QR code imprimé en bas de votre facture ouvre ROHAFYA sur votre téléphone.' },
  { icon: 'envelope', title: 'Saisissez votre e-mail', text: 'Pas de mot de passe à retenir : votre adresse e-mail suffit pour vous identifier.' },
  { icon: 'key', title: 'Entrez le code reçu', text: 'Un code à 6 chiffres, à usage unique, vous est envoyé par e-mail.' },
  { icon: 'file', title: 'Consultez vos résultats', text: 'Ils apparaissent dès qu’ils sont validés par l’établissement. Le papier reste disponible.' },
];

/** Ce que le produit apporte déjà en matière de protection des données (sans promesse de conformité). */
export const TRUST_POINTS: Highlight[] = [
  { icon: 'objects-column', title: 'Données cloisonnées', text: 'Chaque établissement a son espace, ses données et sa clé. Seul le patient voit l’ensemble de ses résultats.' },
  { icon: 'key', title: 'Connexion par code unique', text: 'Connexion nominative par code à usage unique, et aucun lien public vers un résultat.' },
  { icon: 'user-edit', title: 'Rattachement volontaire', text: 'C’est le patient qui rattache son dossier ; une validation humaine intervient en cas de doute.' },
  { icon: 'share-alt', title: 'Partage décidé par le patient', text: 'Le partage avec un médecin est choisi par le patient, modifiable et révocable.' },
  { icon: 'history', title: 'Journal des opérations', text: 'Les opérations sensibles sont tracées, établissement par établissement.' },
  { icon: 'sync', title: 'Clé d’API renouvelable', text: 'Affichée une seule fois, elle peut être renouvelée à tout moment par l’établissement.' },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ: FaqItem[] = [
  {
    question: 'Dois-je installer une application ?',
    answer: 'Non. ROHAFYA s’ouvre dans le navigateur de votre téléphone ou de votre ordinateur. Pour l’établissement non plus, aucun nouveau logiciel : ROHAFYA se branche sur celui qu’il utilise déjà.',
  },
  {
    question: 'Je n’ai pas d’adresse e-mail. Comment faire ?',
    answer: 'Sur un téléphone Android, une adresse Gmail existe déjà : ouvrez Paramètres, puis Comptes. Sinon, un proche peut recevoir vos résultats pour vous, et le résultat papier reste disponible à l’accueil.',
  },
  {
    question: 'Qui peut voir mes résultats ?',
    answer: 'Vous seul. Un médecin ne les voit que si vous les lui partagez, et vous pouvez retirer ce partage à tout moment. Un établissement ne voit que les dossiers qui le concernent.',
  },
  {
    question: 'Je n’ai pas reçu le code de connexion.',
    answer: 'Vérifiez le dossier des courriers indésirables, puis touchez « Renvoyer le code ». Le code est valable une seule fois.',
  },
  {
    question: 'Je ne vois pas mon résultat.',
    answer: 'Vérifiez que votre dossier est bien rattaché à l’établissement et que le résultat a été validé. L’établissement peut aussi appliquer une règle, par exemple une facture à régler ou une durée d’accès.',
  },
  {
    question: 'Peut-on prendre rendez-vous ou consulter en ligne ?',
    answer: 'Non. ROHAFYA se consacre à la remise des résultats et des factures, et au lien entre patients, médecins et établissements. Il ne fait ni prise de rendez-vous, ni téléconsultation, ni interprétation médicale.',
  },
  {
    question: 'Comment un établissement se branche-t-il à ROHAFYA ?',
    answer: 'Par une API, au format ROHAFYA ou HL7 FHIR R4, testable avec des données fictives. Les données d’origine restent dans le logiciel de l’établissement, qui ne dépend pas de ROHAFYA pour travailler.',
  },
];
