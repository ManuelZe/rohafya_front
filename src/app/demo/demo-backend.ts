import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, switchMap, throwError, timer } from 'rxjs';
import { environment } from '../../environments/environment';
import { CurrentUser } from '../connexion/current-user.model';
import { COMMISSION_WITHHOLDING_RATE } from '../doctors/commissions/commissions.models';
import { DoctorProfile } from '../doctors/doctor.models';
import { API_MONTH_KEYS, cycleForMonth, currentCycle } from '../doctors/shared/commission-cycle';
import { AppNotification } from '../notifications/notifications.models';
import { DevisLine, PriceList, ProductSearchResult } from '../patients/devis/devis.models';
import { SavePatient } from '../patients/enregistrement/enregistrement.models';
import { DetailsFactures } from '../patients/factures/factures.models';
import { PatientProfile } from '../patients/patient-profile.models';
import { ExamenImagerie, ExamensLab, ExplorationLab, FacturesResponseApi } from '../patients/patients.models';
import { Prescription, PrescriptionDevis } from '../patients/prescriptions/prescriptions.models';
import { UserRequest } from '../patients/requests/requests.models';
import { ExamResultDetail, ExamType, SendResult } from '../patients/resultats/resultats.models';
import { Suggestion } from '../patients/suggestion-box/suggestion-box.models';
import { PatientLinkView } from '../saas/saas.models';
import { DEMO_TOKEN_PREFIX, DemoSpace } from './demo-token';
import patientJson from './data/patient.json';
import doctorJson from './data/doctor.json';

/**
 * « API » de démonstration : répond aux mêmes URL que l'API Flask à partir des fichiers
 * data/patient.json et data/doctor.json. Chargé à la demande (import dynamique) uniquement
 * lorsqu'une session démo est ouverte : il n'alourdit pas l'application pour les vrais comptes.
 *
 * Les dates des JSON sont relatives au jour courant (« @J-3 », « @J+87T09:00 ») afin que la
 * démo reste crédible quel que soit le jour de la présentation (résultats récents, cycle de
 * commissions en cours, activité du jour…).
 *
 * Les ajouts / modifications / suppressions sont conservés en mémoire jusqu'au rechargement
 * de la page : aucune donnée n'est jamais envoyée au serveur.
 */

const LATENCY_MS = 350;
const EXPIRED_MESSAGE = "La période d'accès aux détails de ce résultat est expirée.";
const UNAVAILABLE_MESSAGE = "Cette fonctionnalité n'est pas disponible en mode démo.";

// =====================================================================
// Dates relatives
// =====================================================================

const RELATIVE_DATE = /^@J([+-]\d+)(?:T(\d{2}):(\d{2}))?$/;

/** « @J-3T09:30 » → ISO du jour J-3 à 9 h 30 (heure locale). Sans heure : midi, pour éviter tout décalage de jour. */
function resolveDates(value: unknown): unknown {
  if (typeof value === 'string') {
    const match = RELATIVE_DATE.exec(value);
    if (!match) return value;
    const date = new Date();
    date.setDate(date.getDate() + Number(match[1]));
    date.setHours(match[2] ? Number(match[2]) : 12, match[3] ? Number(match[3]) : 0, 0, 0);
    return date.toISOString();
  }
  if (Array.isArray(value)) return value.map(resolveDates);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, resolveDates(v)]));
  }
  return value;
}

// =====================================================================
// Données en mémoire
// =====================================================================

interface ApiUser {
  id: number;
  patient_id: number | null;
  doctor_id: number | null;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  roles: { id: number; name: string }[];
}

interface CommissionEntry {
  date: string;
  kind: 'prescription' | 'realisation';
  produit: string;
  patient: string;
  examen: string;
  montant: number;
}

interface ForeignResult {
  send_result: SendResult;
  summary: ExamResultDetail;
  details: ExamResultDetail[];
}

type Details = Record<string, ExamResultDetail[]>;

interface PatientData {
  user: ApiUser;
  profile: PatientProfile;
  factures: FacturesResponseApi[];
  facture_products: Record<string, DetailsFactures>;
  laboratoire: ExamensLab[];
  laboratoire_details: Details;
  imagerie: ExamenImagerie[];
  imagerie_details: Details;
  exploration: ExplorationLab[];
  exploration_details: Details;
  prescriptions: Prescription[];
  prescription_devis: Record<string, PrescriptionDevis>;
  saves: SavePatient[];
  send_results: SendResult[];
  suggestions: Suggestion[];
  price_lists: PriceList[];
  my_price_list_id: number;
  products: ProductSearchResult[];
  insured_discount: number;
  requests: UserRequest[];
  notifications: AppNotification[];
}

interface DoctorData {
  user: ApiUser;
  directory: DoctorProfile[];
  registered_patients: number;
  commissions: CommissionEntry[];
  other_patient_results: ForeignResult[];
  articles: { id: number; titre: string; date: string; description: string; url: string | null; is_visible: boolean }[];
  requests: UserRequest[];
  notifications: AppNotification[];
}

interface DemoStore {
  patient: PatientData;
  doctor: DoctorData;
  sendResults: SendResult[];
  requests: UserRequest[];
  notifications: AppNotification[];
  /** Fichiers joints ajoutés pendant la démo (ordonnances, pré-enregistrements). */
  uploads: Map<string, Blob>;
  /** Établissements rattachés au patient démo (écran « Mes établissements »). */
  links: PatientLinkView[];
  nextId: number;
}

let store: DemoStore | null = null;

function db(): DemoStore {
  if (!store) {
    const patient = resolveDates(structuredClone(patientJson)) as PatientData;
    const doctor = resolveDates(structuredClone(doctorJson)) as DoctorData;
    store = {
      patient,
      doctor,
      sendResults: [...patient.send_results, ...doctor.other_patient_results.map((r) => r.send_result)],
      requests: [...patient.requests, ...doctor.requests],
      notifications: [...patient.notifications, ...doctor.notifications],
      uploads: new Map(),
      links: [demoLink(1, 'Centre de démonstration EDEN', 'PAT-DEMO-0001')],
      nextId: 1,
    };
  }
  return store;
}

function demoLink(id: number, establishment: string, localRef: string): PatientLinkView {
  const at = new Date();
  at.setDate(at.getDate() - 240);
  return {
    id,
    patient_id: 99001,
    tenant_id: id,
    establishment,
    local_ref: localRef,
    status: 'active',
    method: 'qr',
    verified_at: at.toISOString(),
    created_at: at.toISOString(),
    updated_at: null,
  };
}

function newId(): number {
  return 990_000_000 + db().nextId++;
}

function now(): string {
  return new Date().toISOString();
}

/** Utilisateur connecté par le bouton « Démo ». */
export function demoUser(space: DemoSpace): CurrentUser {
  const user = space === 'patient' ? db().patient.user : db().doctor.user;
  return {
    id: user.id,
    nom: user.last_name,
    prenom: user.first_name,
    doctor_id: user.doctor_id,
    patient_id: user.patient_id,
    email: user.email,
    token: `${DEMO_TOKEN_PREFIX}${space}`,
    matricule: user.username,
    roles: user.roles.map((r) => r.name),
  };
}

// =====================================================================
// Routage
// =====================================================================

class DemoHttpError {
  constructor(
    readonly status: number,
    readonly message: string
  ) {}
}

interface Ctx {
  req: HttpRequest<unknown>;
  user: CurrentUser;
  params: string[];
}

type Handler = (ctx: Ctx) => unknown;

/** Gabarit « GET laboratoire/more_infos/:name/result » : un « : » capture un segment. */
const ROUTES: [string, Handler][] = [
  // --- Session -------------------------------------------------------
  ['POST user/logout', () => ({ 'Message ': 'Déconnexion de la session démo.' })],

  // --- Profil SaaS et établissements du patient ------------------------
  ['GET saas/me', ({ user }) => ({
    is_super_admin: false,
    admin_tenants: [],
    links: user.patient_id !== null ? db().links : [],
    features: { commissions: user.doctor_id !== null },
    patient_federation_id: user.patient_id !== null ? db().patient.profile.PatientFederationID : null,
  })],
  ['GET saas/me/links', ({ user }) => (user.patient_id !== null ? db().links : [])],
  ['POST saas/me/links/redeem', () => {
    const id = db().links.length + 1;
    const link = demoLink(id, `Laboratoire Horizon (démo ${id})`, `HZ-DEMO-${String(id).padStart(4, '0')}`);
    link.verified_at = now();
    link.created_at = now();
    db().links.push(link);
    return { message: `${link.establishment} a été ajouté à votre compte.`, link };
  }],
  ['DELETE saas/me/links/:id', ({ params }) => {
    const link = db().links.find((l) => l.id === Number(params[0])) ?? fail(404, 'Rattachement introuvable.');
    db().links = db().links.filter((l) => l !== link);
    return { message: `${link.establishment} a été retiré de votre compte.` };
  }],

  // --- Profil patient -----------------------------------------------
  ['GET patient/factures/products/:ref', ({ params }) => db().patient.facture_products[params[0]] ?? fail(404, 'Aucune facture trouvée pour cette référence.')],
  ['GET patient/factures/:id', () => db().patient.factures],
  ['GET patient/:id', () => db().patient.profile],
  ['PUT patient/update/:id', ({ req }) => {
    Object.assign(db().patient.profile, req.body, { patient_is_confirmed: true, ModifiedAt: now() });
    return { message: 'Informations mises à jour.' };
  }],

  // --- Examens --------------------------------------------------------
  ['GET laboratoire/all_results', () => db().patient.laboratoire],
  ['GET laboratoire/more_infos/:name/result', ({ params }) =>
    examDetails(db().patient.laboratoire.find((r) => r.name === params[0]), db().patient.laboratoire_details[params[0]])],
  ['GET imagerie/all_results', () => db().patient.imagerie],
  ['GET imagerie/more_infos/:number/result', ({ params }) =>
    examDetails(db().patient.imagerie.find((r) => r.number === params[0]), db().patient.imagerie_details[params[0]])],
  ['GET exploration/all_results', () => db().patient.exploration],
  ['GET exploration/more_infos/:name/result', ({ params }) =>
    examDetails(db().patient.exploration.find((r) => r.name === params[0]), db().patient.exploration_details[params[0]])],

  // --- Prescriptions --------------------------------------------------
  ['GET prescription/all_prescriptions', () => db().patient.prescriptions],
  ['POST prescription/add', ({ req, user }) => {
    const form = formData(req);
    const id = newId();
    const prescription: Prescription = {
      id,
      NameDoctor: form.get('NameDoctor')?.toString() ?? '',
      OrdreDoctor: form.get('OrdreDoctor')?.toString() ?? '',
      Description: form.get('Description')?.toString() ?? '',
      demande_devis: form.get('demande_devis') === 'true',
      Sequence: `PRES-DEMO-${String(id).slice(-4)}`,
      Create_date: now(),
      patient_id: user.patient_id ?? 0,
    };
    keepUpload(`prescription-${id}`, form.get('file'));
    db().patient.prescriptions.unshift(prescription);
    return prescription;
  }],
  ['GET prescription/image/:id', ({ params }) =>
    db().uploads.get(`prescription-${params[0]}`) ?? documentImage('Ordonnance', prescriptionLabel(Number(params[0])))],
  ['DELETE prescription/del/:id', ({ params }) => {
    remove(db().patient.prescriptions, Number(params[0]));
    return { message: 'Prescription supprimée.' };
  }],
  ['GET prescription/devis/:id', ({ params }) =>
    db().patient.prescription_devis[params[0]] ?? {
      prescription_id: Number(params[0]),
      details: "Votre demande de devis a bien été reçue. L'administration vous répondra sous 24 h.",
    }],

  // --- Pré-enregistrements -------------------------------------------
  ['GET save_patient/all_save_patients', () => db().patient.saves],
  ['GET save_patient/get_patient_saves/:id', () => db().patient.saves],
  ['GET save_patient/get/:id', ({ params }) => find(db().patient.saves, Number(params[0]))],
  ['POST save_patient/add', ({ req, user }) => {
    const form = formData(req);
    const save: SavePatient = {
      id: newId(),
      nom: form.get('nom')?.toString() ?? '',
      prenom: form.get('prenom')?.toString() ?? '',
      description: form.get('description')?.toString() ?? '',
      patient_id: user.patient_id ?? 0,
      Create_date: now(),
      validated: false,
      validated_by: null,
      validated_at: null,
    };
    keepUpload(`save-${save.id}`, form.get('file'));
    db().patient.saves.unshift(save);
    return save;
  }],
  ['GET save_patient/get_image/:id', ({ params }) =>
    db().uploads.get(`save-${params[0]}`) ?? documentImage('Pièce jointe', 'Document de pré-enregistrement')],
  ['DELETE save_patient/delete/:id', ({ params }) => {
    remove(db().patient.saves, Number(params[0]));
    return { message: 'Pré-enregistrement supprimé.' };
  }],

  // --- Résultats partagés --------------------------------------------
  ['POST send_result', ({ req, user }) => {
    const body = req.body as Pick<SendResult, 'doctor_id' | 'exam_type' | 'exam_code' | 'envoi_email'>;
    const result: SendResult = {
      id: newId(),
      doctor_id: body.doctor_id,
      patient_id: user.patient_id ?? 0,
      exam_type: body.exam_type,
      exam_code: body.exam_code,
      patient_federation_id: user.matricule,
      envoi_email: !!body.envoi_email,
      sended_at: now(),
    };
    db().sendResults.unshift(result);
    return { message: 'Résultat partagé avec succès.', data: result };
  }],
  ['GET send_result/patient/:id', ({ params }) => db().sendResults.filter((r) => r.patient_id === Number(params[0]))],
  ['GET send_result/doctor/:id', ({ params }) => db().sendResults.filter((r) => r.doctor_id === Number(params[0]))],
  ['PUT send_result/modify/:id', ({ req, params }) => Object.assign(find(db().sendResults, Number(params[0])), req.body)],
  ['DELETE send_result/del/:id', ({ params }) => {
    remove(db().sendResults, Number(params[0]));
    return { message: 'Partage supprimé.' };
  }],
  ['GET result/:type/:code/:fed', ({ params }) => sharedExam(params[0] as ExamType, params[1], params[2]).summary],
  ['GET result/more_infos/:type/:code/:fed', ({ params }) => sharedExam(params[0] as ExamType, params[1], params[2]).details],

  // --- Annuaire des médecins -----------------------------------------
  ['GET doctors/informations/matricule/:matricule', ({ params }) =>
    db().doctor.directory.find((d) => d.DoctorFederationID?.toUpperCase() === params[0].trim().toUpperCase()) ??
    fail(404, 'Aucun médecin trouvé pour ce matricule.')],
  ['GET doctors/informations/:id', ({ params }) => doctorProfile(Number(params[0]))],
  ['PUT doctors/update/:id', ({ req, params }) => ({
    Doctor: Object.assign(doctorProfile(Number(params[0])), req.body, { ModifiedAt: now() }),
  })],
  ['PUT doctors/confirm/:id', ({ params }) => ({
    Doctor: Object.assign(doctorProfile(Number(params[0])), { doctor_is_confirmed: true }),
  })],
  ['GET doctors/signature/matricule/:matricule', () => signatureImage()],

  // --- Requêtes -------------------------------------------------------
  ['GET requete', () => db().requests],
  ['GET requete/get_requests/:userId', ({ params }) => db().requests.filter((r) => Number(r.CreatedBy) === Number(params[0]))],
  ['POST requete/add', ({ req, user }) => {
    const request: UserRequest = {
      ...(req.body as UserRequest),
      id: newId(),
      CreatedAt: now(),
      CreatedBy: String(user.id),
      UpdatedAt: null,
      UpdatedBy: null,
      valide: false,
    };
    db().requests.unshift(request);
    return request;
  }],
  ['DELETE requete/del/:id', ({ params }) => {
    remove(db().requests, Number(params[0]));
    return { message: 'Requête supprimée.' };
  }],

  // --- Boîte à suggestions -------------------------------------------
  ['GET suggestions/for_user', () => db().patient.suggestions],
  ['POST suggestions/add', ({ req, user }) => {
    const body = req.body as { content: string; note?: number | null };
    const suggestion: Suggestion = {
      id: newId(),
      content: body.content,
      Note: body.note ?? null,
      CreatedAt: now(),
      UpdatedAt: null,
      CreatedBy: user.id,
      UpdatedBy: null,
    };
    db().patient.suggestions.unshift(suggestion);
    return { message: 'Merci pour votre suggestion !', suggestion };
  }],
  ['PUT suggestions/update/:id', ({ req, params, user }) => {
    const body = req.body as { content?: string; note?: number | null };
    const suggestion = find(db().patient.suggestions, Number(params[0]));
    if (body.content !== undefined) suggestion.content = body.content;
    if (body.note !== undefined) suggestion.Note = body.note;
    suggestion.UpdatedAt = now();
    suggestion.UpdatedBy = user.id;
    return suggestion;
  }],
  ['DELETE suggestions/delete/:id', ({ params }) => {
    remove(db().patient.suggestions, Number(params[0]));
    return { message: 'Suggestion supprimée.' };
  }],

  // --- Devis ----------------------------------------------------------
  ['GET devis/liste_prix', () => db().patient.price_lists],
  ['GET devis/liste_prix/moi', () => db().patient.price_lists.find((l) => l.id === db().patient.my_price_list_id) ?? { Message: 'Aucune liste de prix.' }],
  ['GET devis/produits/recherche', ({ req }) => searchProducts(req.params.get('q') ?? '', Number(req.params.get('limit') ?? 20))],
  ['POST devis/calculer/:id', ({ req, params }) => computeDevis(Number(params[0]), (req.body as { produits: { product_id: number; quantity: number }[] }).produits)],

  // --- Notifications --------------------------------------------------
  ['GET notifications/user/:userId', ({ params }) => notificationsOf(Number(params[0]))],
  ['GET notifications/type/:typeId', ({ params, user }) => notificationsOf(user.id).filter((n) => n.types === Number(params[0]))],
  ['GET notifications/etiquette/:id', () => []],
  ['PUT notifications/mark_read/:id', ({ params }) => {
    Object.assign(find(db().notifications, Number(params[0])), { is_read: true, read_at: now() });
    return { message: 'Notification lue.' };
  }],
  ['DELETE notifications/user/del/:id', ({ params }) => {
    remove(db().notifications, Number(params[0]));
    return { message: 'Notification supprimée.' };
  }],
  ['DELETE notifications/user/:userId/del_all', ({ params }) => {
    const userId = Number(params[0]);
    db().notifications = db().notifications.filter((n) => n.user_id !== userId && !n.all_users);
    return { message: 'Notifications supprimées.' };
  }],
  ['DELETE notifications/user/:userId/del/:id', ({ params }) => {
    remove(db().notifications, Number(params[1]));
    return { message: 'Notification supprimée.' };
  }],

  // --- Actualités -----------------------------------------------------
  ['GET blog', () => db().doctor.articles],
  ['GET blog/image/:id', ({ params }) => articleImage(Number(params[0]))],

  // --- Commissions ----------------------------------------------------
  ['GET doctor_com/actual_solde/:id', () => actualSolde()],
  ['GET doctor_com/solde/:id', () => soldeDetail(currentCycleEntries())],
  ['GET doctor_com/general/:id', () => soldeDetail(commissionEntries().filter((e) => e.invoiced))],
  ['GET doctor_com/invoiced_by_mounth/:id/:month/:type', ({ params }) => monthCommissions(Number(params[1]), params[2])],
  ['GET doctor_com/invoiced_by_year/:id/:year/:type', ({ params }) => yearCommissions(Number(params[1]), params[2])],
  ['GET gnu_doctor/:id/research', () => todayTransactions()],
  ['GET gnu_doctor/:id/research/:from/:to', ({ params }) => periodCommissions(params[1], params[2])],
  ['GET gnu_doctor/:id/commissions', () => statement()],
];

function segments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

const COMPILED_ROUTES = ROUTES.map(([pattern, handler]) => {
  const [method, path] = pattern.split(' ');
  return { method, parts: segments(path), handler };
});

function match(method: string, path: string): { handler: Handler; params: string[] } | null {
  const parts = segments(path);
  for (const route of COMPILED_ROUTES) {
    if (route.method !== method || route.parts.length !== parts.length) continue;
    const params: string[] = [];
    const ok = route.parts.every((part, i) => {
      if (part.startsWith(':')) {
        params.push(decodeURIComponent(parts[i]));
        return true;
      }
      return part === parts[i];
    });
    if (ok) return { handler: route.handler, params };
  }
  return null;
}

/** Point d'entrée appelé par demoInterceptor. */
export function handleDemoRequest(req: HttpRequest<unknown>, user: CurrentUser): Observable<HttpResponse<unknown>> {
  const path = req.url.slice(environment.apiUrl.length);
  const route = match(req.method, path);

  try {
    if (!route) throw new DemoHttpError(404, UNAVAILABLE_MESSAGE);
    const body = route.handler({ req, user, params: route.params });
    // Copie : un composant qui modifierait sa réponse ne doit pas altérer les données de démo.
    const payload = body instanceof Blob ? body : structuredClone(body);
    return of(new HttpResponse({ status: 200, url: req.url, body: payload })).pipe(delay(LATENCY_MS));
  } catch (err) {
    const status = err instanceof DemoHttpError ? err.status : 500;
    const message = err instanceof DemoHttpError ? err.message : 'Erreur inattendue du mode démo.';
    if (!(err instanceof DemoHttpError)) console.error(err);
    const error = new HttpErrorResponse({ status, statusText: message, url: req.url, error: { message } });
    return timer(LATENCY_MS).pipe(switchMap(() => throwError(() => error)));
  }
}

// =====================================================================
// Aides
// =====================================================================

function fail(status: number, message: string): never {
  throw new DemoHttpError(status, message);
}

function find<T extends { id?: number }>(list: T[], id: number): T {
  return list.find((item) => item.id === id) ?? fail(404, 'Élément introuvable.');
}

function remove<T extends { id?: number }>(list: T[], id: number): void {
  const index = list.findIndex((item) => item.id === id);
  if (index >= 0) list.splice(index, 1);
}

function formData(req: HttpRequest<unknown>): FormData {
  return req.body instanceof FormData ? req.body : new FormData();
}

function keepUpload(key: string, value: FormDataEntryValue | null): void {
  if (value instanceof Blob) db().uploads.set(key, value);
}

function examDetails(exam: { statut_expiration: boolean } | undefined, details: ExamResultDetail[] | undefined): unknown {
  if (!exam) return [];
  return exam.statut_expiration ? { Message: EXPIRED_MESSAGE } : (details ?? []);
}

/** Résultat d'examen consulté par un médecin (partagé par le patient démo ou par un autre patient fictif). */
function sharedExam(type: ExamType, code: string, federationId: string): { summary: unknown; details: unknown } {
  const foreign = db().doctor.other_patient_results.find(
    (r) => r.send_result.exam_code === code && r.send_result.patient_federation_id === federationId
  );
  if (foreign) return { summary: [foreign.summary], details: foreign.details };

  const patient = db().patient;
  if (federationId !== patient.profile.PatientFederationID) {
    return { summary: { message: 'Résultat introuvable.' }, details: { message: 'Résultat introuvable.' } };
  }
  const sources = {
    Laboratoire: [patient.laboratoire.find((r) => r.name === code), patient.laboratoire_details[code]],
    Imagerie: [patient.imagerie.find((r) => r.number === code), patient.imagerie_details[code]],
    Exploration: [patient.exploration.find((r) => r.name === code), patient.exploration_details[code]],
  } as const;
  const [exam, details] = sources[type] ?? [undefined, undefined];
  if (!exam) return { summary: { message: 'Résultat introuvable.' }, details: { message: 'Résultat introuvable.' } };
  return { summary: [exam], details: examDetails(exam, details as ExamResultDetail[] | undefined) };
}

function doctorProfile(id: number): DoctorProfile {
  return db().doctor.directory.find((d) => d.id === id) ?? fail(404, 'Aucun Docteur trouvé avec cet ID.');
}

function notificationsOf(userId: number): AppNotification[] {
  return db().notifications.filter((n) => n.user_id === userId || n.all_users);
}

function prescriptionLabel(id: number): string {
  const prescription = db().patient.prescriptions.find((p) => p.id === id);
  return prescription ? `${prescription.Sequence} — ${prescription.NameDoctor}` : 'Ordonnance';
}

// --- Devis ------------------------------------------------------------

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function searchProducts(query: string, limit: number): ProductSearchResult[] {
  const q = normalize(query.trim());
  return db()
    .patient.products.filter((p) => !q || normalize(p.name).includes(q) || normalize(p.code).includes(q))
    .slice(0, limit);
}

function computeDevis(priceListId: number, produits: { product_id: number; quantity: number }[]): unknown {
  const patient = db().patient;
  const priceList = patient.price_lists.find((l) => l.id === priceListId) ?? fail(404, 'Liste de prix introuvable.');
  const discount = priceList.id === patient.my_price_list_id ? 0 : patient.insured_discount;
  const lignes: DevisLine[] = produits.map(({ product_id, quantity }) => {
    const product = patient.products.find((p) => p.id === product_id);
    if (!product) return { product_id, Message: 'Produit introuvable.' };
    const unit_price = Math.round(product.list_price * (1 - discount));
    return { product_id, code: product.code, name: product.name, list_price: product.list_price, unit_price, quantity, amount: unit_price * quantity };
  });
  return {
    price_list: { id: priceList.id, name: priceList.name },
    lignes,
    montant_total: lignes.reduce((sum, l) => sum + (l.amount ?? 0), 0),
  };
}

// --- Commissions ------------------------------------------------------

interface Entry extends CommissionEntry {
  at: Date;
  net: number;
  invoiced: boolean;
}

/** Tout ce qui précède le cycle en cours (21 → 20) est considéré comme facturé. */
function commissionEntries(): Entry[] {
  const cycleStart = currentCycle().start;
  return db().doctor.commissions.map((c) => {
    const at = new Date(c.date);
    return { ...c, at, net: Math.round(c.montant * (1 - COMMISSION_WITHHOLDING_RATE) * 100) / 100, invoiced: at < cycleStart };
  });
}

function currentCycleEntries(): Entry[] {
  return commissionEntries().filter((e) => !e.invoiced);
}

function sum(entries: Entry[]): number {
  return Math.round(entries.reduce((total, e) => total + e.net, 0) * 100) / 100;
}

function calc(entries: Entry[]): { data_patients: Record<string, [string, number, string]>[]; commission: number } {
  return {
    data_patients: entries.map((e) => ({ [e.patient]: [e.examen, e.net, e.date] })),
    commission: sum(entries),
  };
}

function uniquePatients(entries: Entry[]): string[] {
  return [...new Set(entries.map((e) => e.patient))];
}

function countBy(entries: Entry[], key: (e: Entry) => string): Record<string, number> {
  return entries.reduce<Record<string, number>>((acc, e) => {
    acc[key(e)] = (acc[key(e)] ?? 0) + 1;
    return acc;
  }, {});
}

function actualSolde(): unknown {
  const entries = currentCycleEntries();
  const prescription = entries.filter((e) => e.kind === 'prescription');
  const realisation = entries.filter((e) => e.kind === 'realisation');
  return {
    montant_prescription: sum(prescription),
    montant_realisation: sum(realisation),
    montant_total: sum(entries),
    commission_non_facturee: entries.length,
    nombre_patient: uniquePatients(entries).length,
    list_patient_name: uniquePatients(entries),
  };
}

function soldeDetail(entries: Entry[]): unknown {
  const all = commissionEntries();
  const exams = countBy(entries, (e) => e.examen);
  return {
    Solde: calc(entries),
    Nombre_Commissions: entries.length,
    Factured: all.filter((e) => e.invoiced).length,
    Not_Factured: all.filter((e) => !e.invoiced).length,
    number_of_registered_patients: db().doctor.registered_patients,
    Patient_nbr_examen: countBy(entries, (e) => e.patient),
    All_Exam: exams,
    Top_3: Object.fromEntries(Object.entries(exams).sort((a, b) => b[1] - a[1]).slice(0, 3)),
    Commission_product: countBy(entries, (e) => e.produit),
  };
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function todayTransactions(): unknown {
  const today = new Date();
  const entries = commissionEntries().filter((e) => isSameDay(e.at, today));
  return entries.length ? { Data: calc(entries), number: entries.length } : { message: "Aucune transaction aujourd'hui." };
}

function byInvoiceType(entries: Entry[], type: string): Entry[] {
  return entries.filter((e) => e.invoiced === (type === 'invoiced'));
}

function inCycle(entries: Entry[], year: number, month: number): Entry[] {
  const { start, end } = cycleForMonth(year, month);
  return entries.filter((e) => e.at >= start && e.at <= end);
}

function monthCommissions(month: number, type: string): unknown {
  const entries = byInvoiceType(inCycle(commissionEntries(), currentCycle().year, month), type);
  const prescription = entries.filter((e) => e.kind === 'prescription');
  const realisation = entries.filter((e) => e.kind === 'realisation');
  return {
    montant_prescription: sum(prescription),
    montant_realisation: sum(realisation),
    montant_total: sum(entries),
    nb_total_commission: entries.length,
    nb_total_patient: uniquePatients(entries).length,
    list_patient_name: uniquePatients(entries),
    element_prescription: prescription.length ? calc(prescription) : [],
    element_realisation: realisation.length ? calc(realisation) : [],
  };
}

function yearCommissions(year: number, type: string): unknown {
  const all = byInvoiceType(commissionEntries(), type);
  const result: Record<string, unknown> = {};
  let total = 0;
  API_MONTH_KEYS.forEach((key, index) => {
    const entries = inCycle(all, year, index + 1);
    if (!entries.length) return;
    const monthTotal = sum(entries);
    total += monthTotal;
    result[key] = {
      elements_prescription: calc(entries.filter((e) => e.kind === 'prescription')),
      elements_realisation: calc(entries.filter((e) => e.kind === 'realisation')),
      [key]: monthTotal,
    };
  });
  result['Total'] = Math.round(total * 100) / 100;
  return result;
}

/** Bornes au format « 2026-09-01 00:00:00.000000 » (cf. toApiDateTime). */
function periodCommissions(from: string, to: string): unknown {
  const parse = (value: string) => new Date(value.replace(' ', 'T').replace(/\.\d+$/, ''));
  const start = parse(from);
  const end = parse(to);
  return calc(commissionEntries().filter((e) => e.at >= start && e.at <= end));
}

function statement(): unknown {
  const rows = (kind: Entry['kind']) =>
    commissionEntries()
      .filter((e) => e.kind === kind)
      .map((e) => ({
        Date: e.date,
        Produit: e.produit,
        Montant: e.montant,
        Patient: e.patient,
        Examen: e.examen,
        Validé: true,
        Facturé: e.invoiced ? 'invoiced' : '',
      }));
  const all = commissionEntries();
  return {
    prescription: { data_prescription: rows('prescription'), montant_prescription: sum(all.filter((e) => e.kind === 'prescription')) },
    realisation: { data_realisation: rows('realisation'), montant_realisation: sum(all.filter((e) => e.kind === 'realisation')) },
    montant_total: sum(all),
  };
}

// --- Images générées (aucun fichier binaire à maintenir) ---------------

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function svg(content: string, width = 600, height = 400): Blob {
  return new Blob(
    [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`],
    { type: 'image/svg+xml' }
  );
}

function documentImage(title: string, subtitle: string): Blob {
  const lines = [0, 1, 2, 3, 4, 5].map((i) => `<rect x="60" y="${170 + i * 30}" width="${i % 2 ? 380 : 480}" height="10" rx="5" fill="#cbd5e1"/>`).join('');
  return svg(
    `<rect width="600" height="400" fill="#f8fafc"/>
     <rect x="30" y="20" width="540" height="360" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
     <text x="60" y="80" font-family="sans-serif" font-size="28" font-weight="700" fill="#1a54c9">${escapeXml(title)}</text>
     <text x="60" y="115" font-family="sans-serif" font-size="16" fill="#475569">${escapeXml(subtitle)}</text>
     <text x="60" y="140" font-family="sans-serif" font-size="13" fill="#94a3b8">Document fictif — mode démonstration EDEN</text>
     ${lines}`
  );
}

function signatureImage(): Blob {
  return svg(
    `<rect width="400" height="160" fill="#ffffff"/>
     <path d="M30 110 C 70 40, 110 140, 150 80 S 230 50, 260 100 S 330 120, 370 60" fill="none" stroke="#1e3a8a" stroke-width="4" stroke-linecap="round"/>
     <text x="30" y="148" font-family="sans-serif" font-size="12" fill="#94a3b8">Signature fictive (démo)</text>`,
    400,
    160
  );
}

const ARTICLE_COLORS = ['#1a54c9', '#0f766e', '#b45309'];

function articleImage(id: number): Blob {
  const index = Math.max(0, db().doctor.articles.findIndex((a) => a.id === id));
  const title = db().doctor.articles[index]?.titre ?? 'Actualité';
  const color = ARTICLE_COLORS[index % ARTICLE_COLORS.length];
  return svg(
    `<rect width="600" height="400" fill="${color}"/>
     <circle cx="500" cy="80" r="140" fill="#ffffff" opacity="0.12"/>
     <circle cx="80" cy="360" r="110" fill="#ffffff" opacity="0.10"/>
     <text x="40" y="200" font-family="sans-serif" font-size="26" font-weight="700" fill="#ffffff">${escapeXml(title)}</text>
     <text x="40" y="240" font-family="sans-serif" font-size="16" fill="#ffffff" opacity="0.85">EDEN · Actualité de démonstration</text>`
  );
}
