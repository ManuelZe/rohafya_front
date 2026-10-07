import { HttpRequest } from '@angular/common/http';
import { CurrentUser } from '../connexion/current-user.model';
import { DoctorProfile } from '../doctors/doctor.models';
import { AppNotification } from '../notifications/notifications.models';
import { PriceList, ProductSearchResult } from '../patients/devis/devis.models';
import { SavePatient } from '../patients/enregistrement/enregistrement.models';
import { DetailsFactures } from '../patients/factures/factures.models';
import { PatientProfile } from '../patients/patient-profile.models';
import { ExamenImagerie, ExamensLab, ExplorationLab, FacturesResponseApi } from '../patients/patients.models';
import { Prescription, PrescriptionDevis } from '../patients/prescriptions/prescriptions.models';
import { UserRequest } from '../patients/requests/requests.models';
import { ExamResultDetail, SendResult } from '../patients/resultats/resultats.models';
import { Suggestion } from '../patients/suggestion-box/suggestion-box.models';
import { AuditEntry, LinkStatus, LinkTokenView, PatientLinkView, RecordKind, SourceType, Tenant, TenantSettings } from '../saas/saas.models';
import {
  Establishment,
  SUBMISSION_STATUS_LABELS,
  SubmissionAuthorRole,
  SubmissionInfo,
  SubmissionKind,
  SubmissionStatus,
} from '../shared/submission/submission.models';
import { DEMO_TOKEN_PREFIX, DemoSpace } from './demo-token';
import doctorJson from './data/doctor.json';
import patientJson from './data/patient.json';
import platformJson from './data/platform.json';

/**
 * Données de la démonstration, PARTAGÉES par les trois profils (patient, médecin, administrateur
 * d'établissement) : ce qu'un profil envoie est vu par le profil supérieur (demande d'un patient ou
 * d'un médecin -> établissement, qui répond ; tout est inscrit au journal de l'établissement).
 *
 * Les données sont conservées dans l'onglet (sessionStorage) pour survivre aux rechargements et aux
 * changements de profil ; rien n'est jamais envoyé au serveur. Les fichiers joints ne sont gardés
 * qu'en mémoire (une image générée les remplace après un rechargement).
 */

const STORAGE_KEY = 'rohafya-demo-data';
/** À incrémenter quand la forme des données change : les anciennes données de l'onglet sont ignorées. */
const STORAGE_VERSION = 3;

// =====================================================================
// Dates relatives
// =====================================================================

const RELATIVE_DATE = /^@J([+-]\d+)(?:T(\d{2}):(\d{2}))?$/;

/** « @J-3T09:30 » → ISO du jour J-3 à 9 h 30 (heure locale). Sans heure : midi, pour éviter tout décalage de jour. */
export function resolveDates(value: unknown): unknown {
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

export function now(): string {
  return new Date().toISOString();
}

export function inDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

// =====================================================================
// Modèle des données
// =====================================================================

export interface ApiUser {
  id: number;
  patient_id: number | null;
  doctor_id: number | null;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  roles: { id: number; name: string }[];
}

export interface ForeignResult {
  send_result: SendResult;
  summary: ExamResultDetail;
  details: ExamResultDetail[];
}

type Details = Record<string, ExamResultDetail[]>;

export interface PatientData {
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

export interface DoctorData {
  user: ApiUser;
  directory: DoctorProfile[];
  other_patient_results: ForeignResult[];
  articles: { id: number; titre: string; date: string; description: string; url: string | null; is_visible: boolean }[];
  requests: UserRequest[];
  notifications: AppNotification[];
}

/** Compte utilisateur de la plateforme. */
export interface Account {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  roles: string[];
  patient_id: number | null;
  doctor_id: number | null;
  created_at: string;
}

export interface TenantRow {
  id: number;
  slug: string;
  name: string;
  source_type: SourceType;
  is_active: boolean;
  api_key_hint: string | null;
  created_at: string;
  updated_at: string | null;
  settings: TenantSettings;
}

export interface MemberRow {
  tenant_id: number;
  user_id: number;
  created_at: string;
}

/** Dossier d'un patient chez un établissement (numéro de dossier local). */
export interface DossierRow {
  tenant_id: number;
  local_ref: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  source: string | null;
  created_at: string;
}

export interface LinkRow {
  id: number;
  patient_id: number | null;
  tenant_id: number;
  local_ref: string;
  status: LinkStatus;
  method: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface TokenRow {
  id: number;
  tenant_id: number;
  local_ref: string;
  email_hint: string | null;
  token: string;
  /** Code court sans tiret (« CHR7K2P ») ; affiché « CHR-7K2P ». */
  short_code: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface PractitionerRow {
  id: number;
  doctor_id: number;
  tenant_id: number;
  local_ref: string | null;
  created_at: string;
}

export interface RecordRow {
  id: number;
  tenant_id: number;
  local_ref: string;
  kind: RecordKind;
  code: string;
  title: string;
  validated_at: string | null;
  source: string | null;
  created_at: string;
  updated_at: string | null;
  details_count: number;
}

export interface AuditRow {
  id: number;
  tenant_id: number | null;
  user_id: number | null;
  action: string;
  target: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

/** Élément adressé à un établissement : prescription, pré-enregistrement ou requête (champ `submission`). */
export type SubmittedItem = { id?: number; submission?: SubmissionInfo | null } & object;

/** Demande envoyée par un autre utilisateur fictif (visiteur, autre patient, autre médecin). */
export interface OtherSubmission {
  kind: SubmissionKind;
  author_id: number | null;
  item: SubmittedItem;
}

export interface DemoStore {
  version: number;
  patient: PatientData;
  doctor: DoctorData;
  sendResults: SendResult[];
  requests: UserRequest[];
  notifications: AppNotification[];
  /** Fichiers joints ajoutés pendant la démo (ordonnances, pré-enregistrements) : mémoire seulement. */
  uploads: Map<string, Blob>;
  /** Prescriptions et pré-enregistrements envoyés depuis l'espace médecin démo. */
  doctorPrescriptions: Prescription[];
  doctorSaves: SavePatient[];
  tenants: TenantRow[];
  accounts: Account[];
  members: MemberRow[];
  dossiers: DossierRow[];
  links: LinkRow[];
  tokens: TokenRow[];
  practitioners: PractitionerRow[];
  records: RecordRow[];
  audit: AuditRow[];
  otherSubmissions: OtherSubmission[];
  nextId: number;
}

// =====================================================================
// Comptes des quatre profils
// =====================================================================

export const SPACE_ACCOUNTS: Record<DemoSpace, number> = {
  patient: patientJson.user.id,
  doctor: doctorJson.user.id,
  admin: 990003,
};

export const PATIENT_USER_ID = SPACE_ACCOUNTS.patient;
export const DOCTOR_USER_ID = SPACE_ACCOUNTS.doctor;

const SUPER_ADMIN_ROLE_NAMES = ['superadmin', 'admin'];

// =====================================================================
// Création, persistance, remise à zéro
// =====================================================================

let store: DemoStore | null = null;

export function db(): DemoStore {
  if (!store) store = restore() ?? build();
  return store;
}

/** Enregistre l'état dans l'onglet (appelé après chaque modification). */
export function persist(): void {
  if (!store) return;
  try {
    const { uploads: _uploads, ...data } = store;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* stockage indisponible ou plein : la démo continue en mémoire */
  }
}

/** Revient aux données d'origine de la démonstration. */
export function resetDemoData(): void {
  store = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* rien à effacer */
  }
}

function restore(): DemoStore | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Omit<DemoStore, 'uploads'>;
    return data.version === STORAGE_VERSION ? { ...data, uploads: new Map() } : null;
  } catch {
    return null;
  }
}

function build(): DemoStore {
  const patient = resolveDates(structuredClone(patientJson)) as PatientData;
  const doctor = resolveDates(structuredClone(doctorJson)) as DoctorData;
  const platform = resolveDates(structuredClone(platformJson)) as typeof platformJson;
  const created: DemoStore = {
    version: STORAGE_VERSION,
    patient,
    doctor,
    sendResults: [...patient.send_results, ...doctor.other_patient_results.map((r) => r.send_result)],
    requests: [...patient.requests, ...doctor.requests],
    notifications: [...patient.notifications, ...doctor.notifications],
    uploads: new Map(),
    doctorPrescriptions: [],
    doctorSaves: [],
    tenants: platform.tenants as TenantRow[],
    accounts: [toAccount(patient.user, patient.profile.CreatedAt), toAccount(doctor.user, null), ...(platform.accounts as Account[])],
    members: platform.members,
    dossiers: platform.tenant_patients as DossierRow[],
    links: platform.links as LinkRow[],
    tokens: platform.link_tokens,
    practitioners: platform.practitioners,
    records: [],
    audit: [],
    otherSubmissions: [],
    nextId: 1,
  };
  store = created;
  created.records = [...patientRecords(patient), ...platform.records.map((r) => ({ ...r, kind: r.kind as RecordKind }))].map((r) => ({
    ...r,
    id: newId(),
    created_at: r.validated_at ?? now(),
    updated_at: r.validated_at,
  }));
  created.audit = platform.audit.map((a) => ({ ...a, id: newId(), details: a.details as Record<string, unknown> | null }));
  attachSubmissions(created);
  created.otherSubmissions = platform.submissions.map((s) => {
    const item = s.item as SubmittedItem;
    item.submission = makeSubmission(s.kind as SubmissionKind, s.tenant_id, s.author_role as SubmissionAuthorRole, s.status as SubmissionStatus, {
      response: (s as { response?: string }).response,
      patient_name: (s as { patient_name?: string }).patient_name,
      created_at: s.created_at,
      responded_at: (s as { responded_at?: string }).responded_at,
    });
    return { kind: s.kind as SubmissionKind, author_id: s.author_id, item };
  });
  return created;
}

function toAccount(user: ApiUser, createdAt: string | null | undefined): Account {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    active: true,
    roles: user.roles.map((r) => r.name),
    patient_id: user.patient_id,
    doctor_id: user.doctor_id,
    created_at: createdAt ?? inDays(-300),
  };
}

/** Les résultats et factures du patient démo sont les données reçues du Centre de démonstration. */
function patientRecords(patient: PatientData): Omit<RecordRow, 'id' | 'created_at' | 'updated_at'>[] {
  const base = { tenant_id: 1, local_ref: 'PAT-DEMO-0001', source: 'api' };
  return [
    ...patient.laboratoire.map((e) => ({
      ...base,
      kind: 'laboratoire' as const,
      code: e.name,
      title: e.test,
      validated_at: e.validation_date,
      details_count: patient.laboratoire_details[e.name]?.length ?? 0,
    })),
    ...patient.imagerie.map((e) => ({
      ...base,
      kind: 'imagerie' as const,
      code: e.number,
      title: e.requested_test,
      validated_at: e.validation_date,
      details_count: patient.imagerie_details[e.number]?.length ?? 0,
    })),
    ...patient.exploration.map((e) => ({
      ...base,
      kind: 'exploration' as const,
      code: e.name,
      title: e.test,
      validated_at: e.validation_date,
      details_count: patient.exploration_details[e.name]?.length ?? 0,
    })),
    ...patient.factures.map((f) => ({
      ...base,
      kind: 'facture' as const,
      code: f.reference,
      title: f.invoice_number,
      validated_at: f.date,
      details_count: patient.facture_products[f.reference]?.length ?? 0,
    })),
  ];
}

// =====================================================================
// Identifiants, comptes, établissements
// =====================================================================

export function newId(): number {
  return 990_000_000 + db().nextId++;
}

export function account(id: number | null | undefined): Account | undefined {
  return id === null || id === undefined ? undefined : db().accounts.find((a) => a.id === id);
}

export function fullName(a: Account | undefined): string {
  return a ? `${a.first_name} ${a.last_name}`.trim() : '';
}

export function isSuperAdmin(userId: number): boolean {
  return !!account(userId)?.roles.some((r) => SUPER_ADMIN_ROLE_NAMES.includes(r.toLowerCase()));
}

export function tenant(id: number): TenantRow | undefined {
  return db().tenants.find((t) => t.id === id);
}

export function displayName(t: TenantRow): string {
  return t.settings.display_name || t.name;
}

/** Établissements actifs proposés comme destinataires dans les formulaires (route publique). */
export function establishments(): Establishment[] {
  return db()
    .tenants.filter((t) => t.is_active)
    .map((t) => ({ id: t.id, name: displayName(t) }));
}

/** Établissements administrés : tous pour le super-administrateur, sinon ceux dont il est membre. */
export function adminTenants(userId: number): TenantRow[] {
  const list = isSuperAdmin(userId) ? db().tenants : db().tenants.filter((t) => db().members.some((m) => m.tenant_id === t.id && m.user_id === userId));
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

/** Utilisateur connecté par le bouton « Démo ». */
export function demoUser(space: DemoSpace): CurrentUser {
  const a = account(SPACE_ACCOUNTS[space]);
  if (!a) throw new Error(`Compte de démonstration introuvable : ${space}`);
  return {
    id: a.id,
    nom: a.last_name,
    prenom: a.first_name,
    doctor_id: a.doctor_id,
    patient_id: a.patient_id,
    email: a.email,
    token: `${DEMO_TOKEN_PREFIX}${space}`,
    matricule: a.username,
    roles: [...a.roles],
  };
}

// =====================================================================
// Vues au format de l'API
// =====================================================================

export function tenantView(t: TenantRow, withSettings = true): Tenant {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    display_name: displayName(t),
    source_type: t.source_type,
    is_active: t.is_active,
    has_api_key: t.source_type !== 'gnuhealth',
    api_key_hint: t.api_key_hint,
    created_at: t.created_at,
    updated_at: t.updated_at,
    ...(withSettings ? { settings: { ...t.settings } } : {}),
  };
}

/** Patient d'un compte : le patient démo a son profil complet, les autres un compte simple. */
function patientIdentity(patientId: number | null): { name: string; email: string | null; federation: string | null } | null {
  if (patientId === null) return null;
  const profile = db().patient.profile;
  if (profile.id === patientId) {
    return { name: `${profile.PatientName} ${profile.PatientLastname}`.trim(), email: profile.PatientEmail, federation: profile.PatientFederationID };
  }
  const a = db().accounts.find((acc) => acc.patient_id === patientId);
  return a ? { name: fullName(a), email: a.email, federation: a.username } : null;
}

export function linkView(link: LinkRow): PatientLinkView {
  const t = tenant(link.tenant_id);
  const patient = patientIdentity(link.patient_id);
  return {
    ...link,
    establishment: t ? displayName(t) : null,
    patient_name: patient?.name ?? null,
    patient_email: patient?.email ?? null,
    patient_federation_id: patient?.federation ?? null,
  };
}

export function tokenStatus(t: TokenRow): LinkTokenView['status'] {
  if (t.used_at) return 'used';
  if (t.revoked_at) return 'revoked';
  return new Date(t.expires_at) < new Date() ? 'expired' : 'active';
}

export function tokenView(t: TokenRow): LinkTokenView {
  return {
    id: t.id,
    tenant_id: t.tenant_id,
    local_ref: t.local_ref,
    email_hint: t.email_hint,
    expires_at: t.expires_at,
    used_at: t.used_at,
    revoked_at: t.revoked_at,
    created_at: t.created_at,
    status: tokenStatus(t),
  };
}

export function formatShortCode(code: string): string {
  return code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

export function auditView(entry: AuditRow): AuditEntry {
  const t = entry.tenant_id === null ? undefined : tenant(entry.tenant_id);
  const user = account(entry.user_id);
  return {
    ...entry,
    establishment: t ? displayName(t) : ((entry.details?.['etablissement_supprime'] as string | undefined) ?? null),
    user_name: user ? fullName(user) : null,
    user_email: user?.email ?? null,
  };
}

// =====================================================================
// Journal, notifications, demandes
// =====================================================================

export function audit(action: string, entry: { tenant_id?: number | null; user_id?: number | null; target?: string | null; details?: Record<string, unknown> | null } = {}): void {
  db().audit.push({
    id: newId(),
    tenant_id: entry.tenant_id ?? null,
    user_id: entry.user_id ?? null,
    action,
    target: entry.target ?? null,
    details: entry.details ?? null,
    created_at: now(),
  });
}

/** Notification dans la cloche d'un utilisateur (seuls les espaces patient et médecin en affichent). */
export function notify(userId: number, title: string, message: string): void {
  db().notifications.unshift({
    id: newId(),
    user_id: userId,
    title,
    message,
    is_read: false,
    created_at: now(),
    updated_at: null,
    read_at: null,
    all_users: false,
    types: 1,
  });
}

export function makeSubmission(
  kind: SubmissionKind,
  tenantId: number,
  role: SubmissionAuthorRole,
  status: SubmissionStatus = 'recue',
  answer: { response?: string; quote_amount?: number; patient_name?: string; created_at?: string; responded_at?: string } = {}
): SubmissionInfo {
  const answered = status !== 'recue';
  const t = tenant(tenantId);
  return {
    id: newId(),
    kind,
    tenant_id: tenantId,
    establishment: t ? displayName(t) : null,
    author_role: role,
    patient_name: answer.patient_name ?? null,
    status,
    status_label: SUBMISSION_STATUS_LABELS[status],
    response: answer.response ?? null,
    quote_amount: answer.quote_amount ?? null,
    responded_at: answered ? (answer.responded_at ?? now()) : null,
    created_at: answer.created_at ?? now(),
  };
}

/** Données d'exemple : la première demande a reçu une réponse, les autres sont en attente. */
function attachSubmissions(s: DemoStore): void {
  s.patient.prescriptions.forEach((p, i) => {
    p.submission ??= i === 0
      ? makeSubmission('prescription', 1, 'patient', 'traitee', {
          response: 'Votre devis est prêt. Présentez cette ordonnance à l’accueil pour le prélèvement.',
          quote_amount: p.demande_devis ? 18500 : undefined,
          created_at: p.Create_date,
        })
      : makeSubmission('prescription', 1, 'patient', 'recue', { created_at: p.Create_date });
  });
  s.patient.saves.forEach((save, i) => {
    save.submission ??= save.validated || i === 0
      ? makeSubmission('pre_enregistrement', 1, 'patient', 'traitee', {
          response: 'Pré-enregistrement validé : votre dossier vous attend à l’accueil.',
          created_at: save.Create_date,
        })
      : makeSubmission('pre_enregistrement', 2, 'patient', 'recue', { created_at: save.Create_date });
  });
  s.requests.forEach((r, i) => {
    const role: SubmissionAuthorRole = Number(r.CreatedBy) === DOCTOR_USER_ID ? 'doctor' : 'patient';
    r.submission ??= r.valide || i === 0
      ? makeSubmission('requete', 1, role, 'traitee', {
          response: 'Merci pour votre message : notre équipe a pris en compte votre demande.',
          created_at: r.CreatedAt ?? undefined,
        })
      : makeSubmission('requete', 1, role, 'en_cours', { created_at: r.CreatedAt ?? undefined });
  });
}

/** Toutes les demandes de la démo, avec leur auteur. */
export function allSubmissions(): { kind: SubmissionKind; author_id: number | null; item: SubmittedItem }[] {
  const s = db();
  return [
    ...s.patient.prescriptions.map((item) => ({ kind: 'prescription' as const, author_id: PATIENT_USER_ID, item })),
    ...s.patient.saves.map((item) => ({ kind: 'pre_enregistrement' as const, author_id: PATIENT_USER_ID, item })),
    ...s.doctorPrescriptions.map((item) => ({ kind: 'prescription' as const, author_id: DOCTOR_USER_ID, item })),
    ...s.doctorSaves.map((item) => ({ kind: 'pre_enregistrement' as const, author_id: DOCTOR_USER_ID, item })),
    ...s.requests.map((item) => ({ kind: 'requete' as const, author_id: item.CreatedBy ? Number(item.CreatedBy) : null, item })),
    ...s.otherSubmissions,
  ].filter((entry) => !!entry.item.submission);
}

// =====================================================================
// Outils communs aux routes
// =====================================================================

export class DemoHttpError {
  constructor(
    readonly status: number,
    readonly message: string
  ) {}
}

export interface Ctx {
  req: HttpRequest<unknown>;
  user: CurrentUser;
  params: string[];
}

export type Handler = (ctx: Ctx) => unknown;

export function fail(status: number, message: string): never {
  throw new DemoHttpError(status, message);
}

export function find<T extends { id?: number }>(list: T[], id: number): T {
  return list.find((item) => item.id === id) ?? fail(404, 'Élément introuvable.');
}

export function remove<T extends { id?: number }>(list: T[], id: number): void {
  const index = list.findIndex((item) => item.id === id);
  if (index >= 0) list.splice(index, 1);
}

export function body<T>(req: HttpRequest<unknown>): Partial<T> {
  return (req.body && typeof req.body === 'object' && !(req.body instanceof FormData) ? req.body : {}) as Partial<T>;
}

/** Pagination des listes de l'API (page, page_size). */
export function paged<T>(req: HttpRequest<unknown>, items: T[]): { items: T[]; total: number; page: number; page_size: number } {
  const page = Math.max(1, Number(req.params.get('page')) || 1);
  const size = Math.min(100, Math.max(1, Number(req.params.get('page_size')) || 25));
  return { items: items.slice((page - 1) * size, page * size), total: items.length, page, page_size: size };
}

/** Recherche insensible à la casse et aux accents. */
export function normalize(text: string | null | undefined): string {
  return (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function matches(query: string, ...values: (string | null | undefined)[]): boolean {
  const q = normalize(query.trim());
  return !q || values.some((v) => normalize(v).includes(q));
}
