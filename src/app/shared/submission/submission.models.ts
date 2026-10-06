/**
 * Adressage d'une prescription, d'un pré-enregistrement ou d'une requête à un établissement
 * (clé `submission` renvoyée par l'API ; `null` pour un élément antérieur non adressé).
 */
export type SubmissionKind = 'prescription' | 'pre_enregistrement' | 'requete';
export type SubmissionStatus = 'recue' | 'en_cours' | 'traitee' | 'refusee';
export type SubmissionAuthorRole = 'patient' | 'doctor' | 'anonyme';
/** Espace d'où l'on envoie : les champs du formulaire diffèrent pour un médecin. */
export type SubmissionAudience = 'patient' | 'doctor';

export interface SubmissionInfo {
  id: number;
  kind: SubmissionKind;
  tenant_id: number;
  establishment: string | null;
  author_role: SubmissionAuthorRole;
  patient_name: string | null;
  status: SubmissionStatus;
  status_label: string;
  response: string | null;
  quote_amount: number | null;
  responded_at: string | null;
  created_at: string | null;
}

/** Établissement actif proposé comme destinataire (GET saas/public/establishments). */
export interface Establishment {
  id: number;
  name: string;
}

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  recue: 'Reçue',
  en_cours: 'En cours',
  traitee: 'Traitée',
  refusee: 'Refusée',
};

export const SUBMISSION_STATUS_SEVERITY: Record<SubmissionStatus, 'info' | 'warn' | 'success' | 'danger'> = {
  recue: 'info',
  en_cours: 'warn',
  traitee: 'success',
  refusee: 'danger',
};

export const SUBMISSION_KIND_LABELS: Record<SubmissionKind, string> = {
  prescription: 'Prescription',
  pre_enregistrement: 'Pré-enregistrement',
  requete: 'Requête',
};

/** Montant en francs CFA, sans décimales : « 15 000 FCFA ». */
export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} FCFA`;
}
