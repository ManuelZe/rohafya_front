import { DemoSpace } from '../demo/demo-token';

/**
 * Contenu du site de présentation, écrit pour les décideurs des établissements de santé
 * (laboratoires, centres d'imagerie, centres médicaux, cliniques, hôpitaux) : ce sont eux qui achètent.
 * Les patients et les médecins y figurent comme des bénéfices pour l'établissement.
 *
 * Source : le document de vente (Documentation/ROHAFYA_Document_de_Vente.docx) : message central,
 * arguments, bénéfices par type d'établissement, mise en service à distance, tarifs, objections.
 * Règle : aucune promesse sur ce que ROHAFYA ne fait pas (rendez-vous, téléconsultation, interprétation,
 * images d'imagerie, conformité légale « clé en main »).
 *
 * Les textes sont en français (langue source) ; leur traduction anglaise est dans shared/i18n/en/.
 */

export interface NavLink {
  id: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { id: 'constat', label: 'Le constat' },
  { id: 'solution', label: 'La solution' },
  { id: 'mise-en-service', label: 'Mise en service' },
  { id: 'tarifs', label: 'Tarifs' },
  { id: 'faq', label: 'Questions' },
];

/** Section du formulaire de demande d'essai (ancre). */
export const TRIAL_ANCHOR = 'essai';

export interface SocialLink {
  label: string;
  icon: string;
  url: string;
}

/** Comptes officiels de ROHAFYA : pied de page et données structurées (sameAs). */
export const SOCIAL_LINKS: SocialLink[] = [
  { label: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/company/rohafya/' },
  { label: 'X', icon: 'twitter', url: 'https://x.com/Rohafya_237' },
];

/** WhatsApp de l'équipe commerciale (même numéro que l'assistance). */
export const WHATSAPP_NUMBER = '237695995842';
export const WHATSAPP_DISPLAY = '+237 695 995 842';

export interface Highlight {
  icon: string;
  title: string;
  text: string;
}

/** Types d'établissements visés (bandeau sous le héros). */
export const AUDIENCES: { icon: string; label: string }[] = [
  { icon: 'filter', label: 'Laboratoires d’analyses' },
  { icon: 'image', label: 'Centres d’imagerie' },
  { icon: 'heart', label: 'Centres médicaux' },
  { icon: 'building', label: 'Cliniques et hôpitaux' },
  { icon: 'sitemap', label: 'Réseaux multi-sites' },
];

/** Comparatif « Sans / Avec ROHAFYA », vu par l'établissement. */
export interface CompareRow {
  icon: string;
  before: string;
  after: string;
}

export const COMPARE_ROWS: CompareRow[] = [
  {
    icon: 'inbox',
    before: 'Des résultats validés qui ne sont jamais retirés : l’examen est fait, mais le patient n’a pas sa réponse.',
    after: 'Le résultat part dans le compte du patient dès sa validation : moins de résultats non retirés, moins de sachets à classer.',
  },
  {
    icon: 'phone',
    before: 'Un accueil qui passe ses journées au téléphone à répondre « Est-ce que c’est prêt ? ».',
    after: 'Le patient suit son résultat en ligne : l’accueil se consacre aux patients présents.',
  },
  {
    icon: 'comments',
    before: 'Des résultats envoyés par WhatsApp, sans trace, parfois au mauvais destinataire.',
    after: 'Une remise tracée : qui a remis quoi, à qui et quand, et quel médecin a consulté le résultat.',
  },
  {
    icon: 'id-card',
    before: 'Des médecins prescripteurs qui relancent pour obtenir un compte rendu.',
    after: 'Vos prescripteurs reçoivent dans un seul écran les résultats que leurs patients leur partagent.',
  },
  {
    icon: 'send',
    before: 'Des demandes de prix et des ordonnances qui arrivent au guichet, ou chez un concurrent.',
    after: 'Prescriptions, pré-enregistrements et demandes de devis reçus en ligne, avant la venue du patient.',
  },
  {
    icon: 'wallet',
    before: 'Un résultat remis avant le règlement de la facture, et un conflit au guichet.',
    after: 'Avec l’option « résultats après règlement », le détail reste masqué tant que la facture n’est pas réglée.',
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
  /** Vrai : le bouton principal mène au formulaire de demande d'essai. */
  trialCta: boolean;
  demoLabel: string;
}

/** Trois bénéficiaires, un seul acheteur : l'établissement. */
export const ROLES: RoleShowcase[] = [
  {
    space: 'admin',
    tab: 'Votre établissement',
    icon: 'building',
    headline: 'Une console pour remettre, suivre et tracer chaque résultat.',
    pitch: 'Rien à changer dans votre logiciel : ROHAFYA s’y branche, et vous gardez la main sur chaque règle de remise.',
    features: [
      { icon: 'qrcode', title: 'QR code sur la facture', text: 'Le patient rattache son dossier en un scan, ou avec un code court dicté au téléphone.' },
      { icon: 'server', title: 'Publication par votre logiciel', text: 'Résultats et factures validés envoyés sans saisie, par API ROHAFYA ou HL7 FHIR R4.' },
      { icon: 'inbox', title: 'Demandes reçues en ligne', text: 'Prescriptions, pré-enregistrements, requêtes et devis : une file de travail claire, traitée en ligne.' },
      { icon: 'send', title: 'Médecins et notifications', text: 'Rattachez vos prescripteurs et écrivez à vos patients et médecins, à tous ou à une sélection.' },
      { icon: 'sliders-h', title: 'Vos règles de remise', text: 'Durée d’accès, validité des QR codes, résultats après règlement, nom et couleur de l’établissement.' },
      { icon: 'history', title: 'Journal et tableau de bord', text: 'Qui a fait quoi, quand : une preuve en cas de litige, et les chiffres de votre remise.' },
    ],
    mock: {
      title: 'Administration',
      nav: ['Tableau de bord', 'Demandes', 'Patients', 'QR codes', 'Journal'],
      kpis: [
        { label: 'Résultats publiés', value: '1 284' },
        { label: 'Demandes en attente', value: '7' },
        { label: 'Dossiers rattachés', value: '312' },
      ],
      listTitle: 'Demandes reçues',
      rows: [
        { title: 'Pré-enregistrement · Bilan prénatal', meta: 'Envoyé par un médecin', status: 'À traiter', tone: 'wait' },
        { title: 'Demande de devis · IRM du genou', meta: 'Envoyée par un patient', status: 'Devis envoyé', tone: 'info' },
        { title: 'Rattachement de dossier', meta: 'QR code scanné', status: 'Validé', tone: 'ok' },
      ],
    },
    trialCta: true,
    demoLabel: 'Visiter l’espace établissement',
  },
  {
    space: 'patient',
    tab: 'Vos patients',
    icon: 'user',
    headline: 'Vos patients reçoivent leurs résultats sans revenir, et reviennent chez vous.',
    pitch: 'Gratuit pour eux, sans application à installer : le QR code de la facture suffit. Chaque gain du patient soulage votre accueil.',
    features: [
      { icon: 'car', title: 'Un seul déplacement par examen', text: 'Le résultat arrive sur son téléphone dès sa validation. Pour vous : moins de résultats non retirés et d’appels.' },
      { icon: 'key', title: 'Rien à installer', text: 'Connexion par un code reçu par e-mail. Pour vous : une adoption sans formation, une seule phrase à dire à l’accueil.' },
      { icon: 'file', title: 'Le compte rendu tel que validé', text: 'Valeurs et normes affichées telles que votre biologiste les a validées, imprimables en PDF.' },
      { icon: 'history', title: 'Son historique chez vous', text: 'Ses analyses précédentes restent consultables : le patient suivi au long cours revient là où se trouve son historique.' },
      { icon: 'share-alt', title: 'Partage avec son médecin', text: 'Le patient choisit qui voit son résultat ; le prescripteur le reçoit sans relance.' },
      { icon: 'list-check', title: 'Demandes avant la venue', text: 'Prescription en photo, demande de devis, pré-enregistrement : la venue est préparée, la demande ne part pas ailleurs.' },
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
    trialCta: false,
    demoLabel: 'Voir ce que voit votre patient',
  },
  {
    space: 'doctor',
    tab: 'Vos médecins prescripteurs',
    icon: 'id-card',
    headline: 'L’établissement équipé devient le plus simple à prescrire.',
    pitch: 'Vos prescripteurs reçoivent dans un seul écran les résultats que leurs patients leur partagent, sans relance. Ils ne paient rien.',
    features: [
      { icon: 'share-alt', title: 'Résultats reçus, au même endroit', text: 'Triés et filtrables, tous établissements confondus : vos comptes rendus sont lus sans délai.' },
      { icon: 'list-check', title: 'Prescriptions adressées chez vous', text: 'Le médecin adresse la prescription de son patient à votre établissement, avec son nom.' },
      { icon: 'check-circle', title: 'Pré-enregistrements', text: 'Le médecin pré-enregistre son patient : votre accueil est préparé, le patient attend moins.' },
      { icon: 'send', title: 'Requêtes suivies', text: 'Une question posée par écrit, une réponse tracée : moins d’appels de médecins à l’accueil.' },
      { icon: 'bell', title: 'Un canal direct', text: 'Annoncez nouveaux examens, appareils ou horaires à vos prescripteurs, sans tournée.' },
      { icon: 'file', title: 'Des comptes rendus homogènes', text: 'Vos résultats se lisent aussi clairement que ceux des autres établissements : la régularité fait votre réputation.' },
    ],
    mock: {
      title: 'Espace médecin',
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
    trialCta: false,
    demoLabel: 'Voir ce que voit votre prescripteur',
  },
];

/** Ce que l'on met en avant selon le type d'établissement (document de vente, 4.4). */
export interface Segment {
  icon: string;
  title: string;
  points: string[];
  first: string;
}

export const SEGMENTS: Segment[] = [
  {
    icon: 'filter',
    title: 'Laboratoires d’analyses',
    points: [
      'Moins de résultats non retirés',
      'Moins d’appels « c’est prêt ? » à l’accueil',
      'Des patients suivis au long cours fidélisés par leur historique',
    ],
    first: 'Le QR code sur la facture, puis le tableau de bord.',
  },
  {
    icon: 'image',
    title: 'Centres d’imagerie et centres médicaux',
    points: [
      'Le compte rendu chez le prescripteur le jour même',
      'Des demandes de prix converties en venues',
      'Laboratoire, imagerie et factures dans un seul espace',
    ],
    first: 'Le circuit prescription, devis, résultat.',
  },
  {
    icon: 'building',
    title: 'Cliniques et hôpitaux',
    points: [
      'Un portail unique pour tous les services',
      'Le recouvrement, avec les résultats après règlement',
      'La traçabilité et l’identification des patients',
    ],
    first: 'Les résultats après règlement, les rattachements, le journal.',
  },
  {
    icon: 'sitemap',
    title: 'Réseaux multi-sites',
    points: [
      'Plusieurs établissements pilotés depuis une même console',
      'Plusieurs administrateurs, des responsabilités claires',
      'Des règles communes, en commençant par un site pilote',
    ],
    first: 'Le changement d’établissement dans la console, puis les réglages.',
  },
];

/** Mise en service, entièrement à distance (document de vente, 10.2). */
export interface Step {
  icon: string;
  title: string;
  text: string;
}

export const ONBOARDING: Step[] = [
  { icon: 'video', title: 'Une démonstration de 20 minutes', text: 'En visioconférence : vous manipulez la démonstration sur votre propre téléphone, avec vos questions.' },
  { icon: 'building', title: 'Votre espace créé', text: 'Vos administrateurs sont invités par e-mail et se connectent avec un code reçu par e-mail.' },
  { icon: 'server', title: 'Votre logiciel branché', text: 'Votre informaticien reçoit la clé d’API et la documentation, et teste les envois avec des données fictives.' },
  { icon: 'users', title: 'Votre accueil formé', text: '30 minutes en visioconférence : générer un QR code, valider un rattachement, traiter une demande.' },
  { icon: 'check-circle', title: 'Vos premiers résultats publiés', text: 'Sur un périmètre limité d’abord, avec un point de contrôle en visioconférence une semaine après.' },
];

/** Parcours du patient : ce que l'accueil explique en une phrase. */
export const STEPS: Step[] = [
  { icon: 'qrcode', title: 'Il scanne le code', text: 'Le QR code imprimé sur la facture ouvre ROHAFYA sur son téléphone.' },
  { icon: 'envelope', title: 'Il saisit son e-mail', text: 'Pas de mot de passe à retenir : son adresse e-mail suffit pour l’identifier.' },
  { icon: 'key', title: 'Il entre le code reçu', text: 'Un code à 6 chiffres, à usage unique, lui est envoyé par e-mail.' },
  { icon: 'file', title: 'Il consulte ses résultats', text: 'Ils apparaissent dès que vous les validez. Le papier reste disponible.' },
];

/** Ce que le produit apporte déjà en matière de protection des données (sans promesse de conformité). */
export const TRUST_POINTS: Highlight[] = [
  { icon: 'objects-column', title: 'Données cloisonnées', text: 'Chaque établissement a son espace, ses données et sa clé. Aucun concurrent ne voit vos patients.' },
  { icon: 'key', title: 'Connexion par code unique', text: 'Accès nominatifs par code à usage unique ; aucun lien public vers un résultat.' },
  { icon: 'user-edit', title: 'Rattachement maîtrisé', text: 'Le patient rattache son dossier ; votre équipe valide en cas de doute sur l’identité.' },
  { icon: 'share-alt', title: 'Partage décidé par le patient', text: 'Le partage avec un médecin est choisi par le patient, et chaque consultation est inscrite au journal.' },
  { icon: 'history', title: 'Journal des opérations', text: 'Les opérations sensibles sont tracées : une preuve en cas de litige, un appui à votre démarche qualité.' },
  { icon: 'sync', title: 'Clé d’API renouvelable', text: 'Affichée une seule fois, elle se remplace en un clic si elle est compromise.' },
];

/** Grille tarifaire (document de vente, 6.2) : prix publics, identiques dans tout le pays. */
export interface Plan {
  name: string;
  volume: string;
  setup: string;
  monthly: string;
  yearly: string;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  { name: 'Essentiel', volume: 'Jusqu’à 500 résultats par mois', setup: '75 000 FCFA', monthly: '25 000 FCFA', yearly: '250 000 FCFA' },
  { name: 'Standard', volume: 'De 501 à 2 000 résultats par mois', setup: '150 000 FCFA', monthly: '50 000 FCFA', yearly: '500 000 FCFA', highlight: true },
  { name: 'Avancé', volume: 'De 2 001 à 6 000 résultats par mois', setup: '300 000 FCFA', monthly: '100 000 FCFA', yearly: '1 000 000 FCFA' },
  { name: 'Réseau ou hôpital', volume: 'Au-delà, ou plusieurs sites', setup: 'À partir de 500 000 FCFA', monthly: 'À partir de 200 000 FCFA', yearly: 'Sur devis' },
];

export const PRICING_NOTES: string[] = [
  'Le prix suit le nombre de résultats publiés par mois, compté dans votre tableau de bord.',
  'Mêmes prix partout au Cameroun : la mise en service se fait à distance.',
  'Aucune licence par poste, aucun matériel ; formation des nouvelles recrues comprise.',
  'Paiement en FCFA par Mobile Money, virement ou chèque.',
];

/** Programme « établissements fondateurs » (document de vente, 6.4). */
export const FOUNDERS: string[] = [
  'Mise en service offerte, entièrement à distance',
  '60 jours d’essai accompagné, sans engagement',
  '50 % de réduction sur l’abonnement la première année si vous poursuivez',
  'Une influence directe sur les évolutions du produit',
];

export interface FaqItem {
  question: string;
  answer: string;
}

/** Questions des directeurs d'établissement (document de vente, 9 : objections). */
export const FAQ: FaqItem[] = [
  {
    question: 'Faut-il changer de logiciel ou installer quelque chose ?',
    answer: 'Non. ROHAFYA se branche sur le logiciel que vous utilisez déjà, par API (format ROHAFYA ou HL7 FHIR R4). Vos patients n’installent rien non plus : un navigateur suffit. Les données d’origine restent dans votre logiciel : vous ne dépendez pas de ROHAFYA pour travailler.',
  },
  {
    question: 'Notre logiciel n’exporte rien. Que faire ?',
    answer: 'Donnez-nous le nom de votre éditeur ou de votre informaticien : beaucoup de logiciels exportent plus qu’on ne le croit, et nous l’accompagnons avec la documentation et un établissement de test. L’import de comptes rendus PDF, qui permettra de démarrer sans informaticien, n’est pas encore ouvert.',
  },
  {
    question: 'Nos patients n’ont pas d’adresse e-mail.',
    answer: 'Tout téléphone Android est relié à un compte Google, donc à une adresse Gmail : votre accueil la retrouve en trente secondes dans les paramètres. Pour les autres, un proche peut recevoir les résultats, et le papier reste disponible.',
  },
  {
    question: 'Nous envoyons déjà les résultats par WhatsApp.',
    answer: 'Continuez à prévenir par WhatsApp si vous le souhaitez. Mais le résultat lui-même gagne à rester dans un compte protégé : pas de mauvais destinataire, une trace de chaque accès, une preuve en cas de litige.',
  },
  {
    question: 'Nous remettons les résultats contre paiement.',
    answer: 'L’option « résultats après règlement » reprend cette règle : le détail d’un résultat reste masqué tant que la facture n’est pas réglée.',
  },
  {
    question: 'Nos concurrents verront-ils nos patients ?',
    answer: 'Non. Chaque établissement a son espace, ses données et sa clé d’API. Seul le patient voit l’ensemble de ses propres résultats.',
  },
  {
    question: 'Où sont hébergées nos données ?',
    answer: 'Nous vous répondons par écrit, avant tout engagement : lieu d’hébergement, personnes habilitées, accord sur les données. ROHAFYA a été conçu avec la protection des données en tête ; votre mise en conformité relève de vous, et nous vous y aidons.',
  },
  {
    question: 'Et si la connexion ou le courant sautent ?',
    answer: 'Les résultats déjà publiés restent consultables par les patients. Les envois reprennent au retour du réseau, sans doublon. La console d’administration fonctionne aussi sur téléphone.',
  },
  {
    question: 'Vous êtes loin. Qui intervient en cas de problème ?',
    answer: 'Rien n’est installé chez vous : l’assistance se fait par téléphone, WhatsApp et partage d’écran, sous 24 heures ouvrées, où que vous soyez au Cameroun.',
  },
  {
    question: 'Que ne fait pas ROHAFYA ?',
    answer: 'Ni téléconsultation, ni prise de rendez-vous, ni gestion du laboratoire, ni interprétation médicale. Pour l’imagerie, seuls les comptes rendus sont publiés, pas les images. ROHAFYA s’ajoute à vos outils sans les remplacer.',
  },
];

/** Formulaire de demande d'essai : listes de choix (document de vente, D.7). */
export const TRIAL_KINDS: { value: string; label: string }[] = [
  { value: 'laboratoire', label: 'Laboratoire d’analyses' },
  { value: 'imagerie', label: 'Centre d’imagerie' },
  { value: 'centre_medical', label: 'Centre médical' },
  { value: 'clinique', label: 'Clinique' },
  { value: 'hopital', label: 'Hôpital' },
  { value: 'reseau', label: 'Réseau multi-sites' },
  { value: 'autre', label: 'Autre' },
];

export const TRIAL_VOLUMES: { value: string; label: string }[] = [
  { value: 'moins_200', label: 'Moins de 200' },
  { value: '200_500', label: '200 à 500' },
  { value: '500_2000', label: '500 à 2 000' },
  { value: 'plus_2000', label: 'Plus de 2 000' },
];

export const TRIAL_SLOTS: string[] = ['Mardi matin', 'Mardi après-midi', 'Jeudi matin', 'Jeudi après-midi', 'Autre moment'];
