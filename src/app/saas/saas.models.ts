import type { SubmissionAuthorRole, SubmissionInfo, SubmissionKind, SubmissionStatus } from '../shared/submission/submission.models';

/** Modèles des endpoints SaaS de l'API (/saas, /ingest, /fhir). */

export type SourceType = 'gnuhealth' | 'api' | 'fhir' | 'pdf';
export type LinkStatus = 'pending' | 'active' | 'revoked';
export type RecordKind = 'laboratoire' | 'imagerie' | 'exploration' | 'facture';

export interface TenantSettings {
  display_name: string;
  result_access_days: number;
  block_unpaid_results: boolean;
  commissions_enabled: boolean;
  link_token_days: number;
  primary_color: string;
  contact_email: string;
  contact_phone: string;
  pdf_ai_enabled: boolean;
  /** Quota d'imports PDF : `pdf_quota_files` fichiers par période de `pdf_quota_days` jours (super-administrateur). */
  pdf_quota_files: number;
  pdf_quota_days: number;
}

export interface Tenant {
  id: number;
  slug: string;
  name: string;
  display_name: string;
  source_type: SourceType;
  is_active: boolean;
  has_api_key: boolean;
  api_key_hint: string | null;
  created_at: string | null;
  updated_at: string | null;
  settings?: TenantSettings;
  /** Couleur de la console (fournie dans /saas/me pour les établissements administrés). */
  primary_color?: string;
}

export interface TenantStats {
  patients_known: number;
  links_active: number;
  links_pending: number;
  links_revoked: number;
  tokens_active: number;
  records: Record<RecordKind, number>;
  records_total: number;
  last_record_at: string | null;
  doctors: number;
  admins: number;
}

export interface TenantWithStats extends Tenant {
  stats: TenantStats;
  api_key?: string | null;
}

export interface AuditEntry {
  id: number;
  tenant_id: number | null;
  establishment: string | null;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface TenantDashboard extends TenantStats {
  tenant: Tenant;
  recent_activity: AuditEntry[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface PatientLinkView {
  id: number | null;
  patient_id: number | null;
  tenant_id: number;
  establishment: string | null;
  local_ref: string;
  status: LinkStatus;
  method: string | null;
  verified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  patient_name?: string | null;
  patient_email?: string | null;
  patient_federation_id?: string | null;
}

export interface TenantPatientRow {
  local_ref: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  birth_date: string | null;
  gender: string | null;
  link_status: LinkStatus | 'none';
  link_id: number | null;
  account: { patient_email?: string | null; method?: string | null } | null;
  records: number | null;
  phone?: string | null;
  source?: string | null;
}

export interface RecordSummary {
  id: number;
  tenant_id: number;
  local_ref: string;
  kind: RecordKind;
  code: string;
  title: string;
  validated_at: string | null;
  source: string | null;
  created_at: string | null;
  updated_at: string | null;
  details_count: number;
}

export interface LinkTokenView {
  id: number;
  tenant_id: number;
  local_ref: string;
  email_hint: string | null;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  status: 'active' | 'used' | 'expired' | 'revoked';
}

export interface PatientDetail {
  patient: TenantPatientRow;
  records: RecordSummary[];
  tokens: LinkTokenView[];
}

export interface IssuedLinkToken {
  already_linked: boolean;
  local_ref: string;
  token_id?: number;
  url?: string;
  short_code?: string;
  expires_at?: string;
  qr_png?: string;
  establishment?: string;
}

export interface DoctorLinkView {
  id: number;
  doctor_id: number;
  tenant_id: number;
  local_ref: string | null;
  created_at: string;
  name: string | null;
  email: string | null;
  matricule: string | null;
  speciality: string | null;
  is_confirmed: boolean;
}

export type PdfImportStatus = 'pret' | 'a_relire' | 'publie' | 'rejete' | 'erreur';

/** Une valeur lue dans un compte rendu PDF (format des « details » d'un résultat ROHAFYA). */
export interface PdfValue {
  code: string | null;
  name: string;
  result: number | null;
  result_text?: string;
  units: string;
  lower_limit: number | null;
  upper_limit: number | null;
  normal_range?: string;
  remarks?: string;
  warning: boolean;
  ligne_source?: string;
}

export interface PdfAnomaly {
  code: string | null;
  name: string | null;
  result: number | null;
  probleme: string;
}

export interface PdfExtraction {
  methode: 'regles' | 'ia';
  texte_present: boolean;
  entete: { local_ref: string | null; validation_date: string | null };
  details: PdfValue[];
  a_relire: string[];
  anomalies: PdfAnomaly[];
  erreur_ia?: string | null;
}

export interface PdfImport {
  id: number;
  tenant_id: number;
  filename: string | null;
  file_size: number | null;
  status: PdfImportStatus;
  method: 'regles' | 'ia' | null;
  local_ref: string | null;
  exam_code: string | null;
  title: string | null;
  validation_date: string | null;
  source: 'admin' | 'api' | null;
  created_at: string;
  updated_at: string | null;
  published_at: string | null;
  values_count: number;
  issues_count: number;
  extraction?: PdfExtraction;
  ai_available?: boolean;
}

/** Consommation du quota d'imports PDF sur la période en cours. */
export interface PdfQuota {
  limit: number;
  days: number;
  used: number;
  remaining: number;
  /** Date à partir de laquelle un import redevient possible (quota épuisé), sinon null. */
  next_available_at: string | null;
}

export interface PdfImportList extends Paged<PdfImport> {
  counts: Record<PdfImportStatus, number>;
  ai_available: boolean;
  quota: PdfQuota;
  /** Faux pour l'établissement GNU Health (résultats lus directement dans GNU Health). */
  available: boolean;
}

/** « 10 fichiers par jour », « 30 fichiers tous les 7 jours ». */
export function quotaLabel(files: number, days: number): string {
  const fichiers = `${files} fichier${files > 1 ? 's' : ''}`;
  return days === 1 ? `${fichiers} par jour` : `${fichiers} tous les ${days} jours`;
}

export const PDF_STATUS_LABELS: Record<PdfImportStatus, string> = {
  pret: 'Prêt à publier',
  a_relire: 'À relire',
  publie: 'Publié',
  rejete: 'Rejeté',
  erreur: 'Erreur',
};

/** Droit d'imprimer les comptes rendus (sans configuration : toujours disponible). */
export interface PrintRight {
  configured: boolean;
  allowed: boolean;
  mode?: 'window' | 'blocked';
  from: string | null;
  until: string | null;
  /** Raison affichée sous le bouton, ou échéance de l'accès. */
  message: string | null;
}

/** Droit de partager des résultats (sans configuration : partages illimités). */
export interface ShareRight {
  configured: boolean;
  allowed: boolean;
  limit: number | null;
  used: number | null;
  remaining: number | null;
  message: string | null;
}

export interface AccountRights {
  print: PrintRight;
  share: ShareRight;
}

export interface SaasMe {
  is_super_admin: boolean;
  admin_tenants: Tenant[];
  links: PatientLinkView[];
  features: { commissions: boolean };
  patient_federation_id: string | null;
  /** Absent (API plus ancienne, démo) : tout est disponible. */
  rights?: AccountRights;
}

/** Configuration des droits d'un compte (console du super-administrateur). */
export interface AdminAccountRights {
  user_id: number;
  configured: boolean;
  print_mode: 'window' | 'blocked' | null;
  print_from: string | null;
  print_until: string | null;
  share_limit: number | null;
  share_since: string | null;
  updated_at: string | null;
  effective: AccountRights;
}

export interface AccountRightsUpdate {
  print_mode?: 'window' | 'blocked' | null;
  print_from?: string | null;
  print_until?: string | null;
  share_limit?: number | null;
  reset_share_count?: boolean;
}

export interface SuperStats {
  tenants: number;
  tenants_active: number;
  users: number;
  patients: number;
  doctors: number;
  admins: number;
  links_active: number;
  links_pending: number;
  records: Record<RecordKind, number>;
  records_total: number;
  recent_activity: AuditEntry[];
}

export interface TenantAdminView {
  user_id: number;
  tenant_id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  active: boolean;
  created_at: string;
  email_sent?: boolean;
}

export interface AccountView {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  roles: string[];
  is_super_admin: boolean;
  admin_of: string[];
  patient_id: number | null;
  doctor_id: number | null;
  /** Résumé des droits configurés (« Impression bloquée », « Partages 2/5 »), vide sans configuration. */
  rights?: string[];
}

export const SOURCE_LABELS: Record<SourceType, string> = {
  gnuhealth: 'GNU Health (lecture directe)',
  api: 'API ROHAFYA (format ROHAFYA)',
  fhir: 'HL7 FHIR R4',
  pdf: 'Scan / PDF de résultats',
};

export const RECORD_KIND_LABELS: Record<RecordKind, string> = {
  laboratoire: 'Laboratoire',
  imagerie: 'Imagerie',
  exploration: 'Exploration',
  facture: 'Facture',
};

export const LINK_STATUS_LABELS: Record<LinkStatus | 'none', string> = {
  active: 'Rattaché',
  pending: 'En attente',
  revoked: 'Retiré',
  none: 'Non rattaché',
};

/** Libellés lisibles des actions du journal d'audit. */
export const AUDIT_LABELS: Record<string, string> = {
  'account.created': 'Compte créé',
  'link_token.issued': 'QR code généré',
  'link_token.revoked': 'QR code annulé',
  'link.active': 'Dossier rattaché',
  'link.pending': 'Rattachement en attente',
  'link.revoked': 'Rattachement retiré',
  'link.revoked_by_patient': 'Retiré par le patient',
  'link.conflict': 'Tentative sur un dossier déjà rattaché',
  'tenant.created': 'Établissement créé',
  'tenant.updated': 'Établissement modifié',
  'tenant.settings_updated': 'Réglages modifiés',
  'tenant.api_key_rotated': "Nouvelle clé d'API",
  'tenant.admin_added': 'Administrateur ajouté',
  'tenant.admin_removed': 'Administrateur retiré',
  'patient.saved': 'Dossier patient enregistré',
  'doctor.linked': 'Médecin rattaché',
  'doctor.unlinked': 'Médecin retiré',
  'ingest.api': 'Données reçues (API ROHAFYA)',
  'ingest.fhir': 'Données reçues (FHIR)',
  'ingest.deleted': 'Donnée retirée par l’établissement',
  'result.viewed': 'Résultat consulté par un médecin',
  'pdf.imported': 'Compte rendu PDF déposé',
  'pdf.corrected': 'Compte rendu PDF corrigé',
  'pdf.reanalysed': 'Compte rendu PDF réanalysé',
  'pdf.published': 'Compte rendu PDF publié',
  'pdf.rejected': 'Compte rendu PDF rejeté',
  'pdf.deleted': 'Compte rendu PDF supprimé',
  'tenant.deleted': 'Établissement supprimé',
  'user.activated': 'Compte réactivé',
  'user.deactivated': 'Compte désactivé',
  'user.super_admin_granted': 'Droits super-administrateur accordés',
  'user.super_admin_revoked': 'Droits super-administrateur retirés',
};

/** Demandes : « submission.<type>.<created|statut> » (ex. submission.requete.traitee). */
const SUBMISSION_AUDIT_KINDS: Record<string, { label: string; feminine: boolean }> = {
  prescription: { label: 'Prescription', feminine: true },
  pre_enregistrement: { label: 'Pré-enregistrement', feminine: false },
  requete: { label: 'Requête', feminine: true },
};
const SUBMISSION_AUDIT_STATES: Record<string, [string, string]> = {
  created: ['reçu', 'reçue'],
  recue: ['remis en attente', 'remise en attente'],
  en_cours: ['en cours de traitement', 'en cours de traitement'],
  traitee: ['traité', 'traitée'],
  refusee: ['refusé', 'refusée'],
};

export function auditLabel(action: string): string {
  const submission = /^submission\.(\w+)\.(\w+)$/.exec(action);
  if (submission) {
    const kind = SUBMISSION_AUDIT_KINDS[submission[1]];
    const state = SUBMISSION_AUDIT_STATES[submission[2]];
    if (kind && state) return `${kind.label} ${state[kind.feminine ? 1 : 0]}`;
  }
  return AUDIT_LABELS[action] ?? action;
}

// =====================================================================
// Demandes reçues (prescriptions, pré-enregistrements, requêtes)
// =====================================================================

export type { SubmissionAuthorRole, SubmissionInfo, SubmissionKind, SubmissionStatus } from '../shared/submission/submission.models';

/** Demande vue par l'établissement : adressage + auteur + contenu d'origine. */
export interface SubmissionAdminItem extends SubmissionInfo {
  author: { id: number | null; name: string; email: string | null; role: SubmissionAuthorRole };
  /** Prescription, pré-enregistrement ou requête, tels qu'enregistrés. */
  item: Record<string, unknown> | null;
  has_image: boolean;
}

export interface SubmissionList extends Paged<SubmissionAdminItem> {
  /** Nombre de demandes par type puis par statut, pour tout l'établissement. */
  counts: Partial<Record<SubmissionKind, Partial<Record<SubmissionStatus, number>>>>;
}

export interface SubmissionAnswer {
  status?: SubmissionStatus;
  response?: string;
  /** Montant du devis en FCFA ; chaîne vide pour l'effacer. */
  quote_amount?: number | '';
}

/** Destinataires d'une notification envoyée depuis une console. */
export type NotificationAudience = 'admins' | 'patients' | 'doctors';

export const AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  admins: 'Administrateurs',
  patients: 'Patients',
  doctors: 'Médecins',
};

/** Compte proposé à la sélection des destinataires. */
export interface NotificationRecipient {
  user_id: number;
  name: string;
  email: string | null;
  /** Matricule ou identifiant local, s'il est connu. */
  ref: string | null;
}

export interface NotificationPayload {
  audience: NotificationAudience;
  /** Vide : tout le groupe de l'établissement. */
  user_ids?: number[];
  title: string;
  message: string;
}

/** Envoi (historique) : une notification et un e-mail par destinataire. */
export interface NotificationCampaign {
  id: number;
  tenant_id: number;
  establishment: string | null;
  sender_role: 'super_admin' | 'tenant_admin';
  sender_name: string | null;
  audience: NotificationAudience;
  selection: 'all' | 'selected';
  title: string;
  message: string;
  recipients_count: number;
  emails_count: number;
  /** null tant que les e-mails partent (envoi en tâche de fond). */
  emails_sent: number | null;
  created_at: string;
}
