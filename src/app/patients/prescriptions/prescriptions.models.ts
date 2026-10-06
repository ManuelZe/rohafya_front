import { SafeUrl } from '@angular/platform-browser';
import { SubmissionAudience, SubmissionInfo } from '../../shared/submission/submission.models';

export interface Prescription {
  id: number;
  NameDoctor: string;
  OrdreDoctor: string;
  Sequence: string;
  Create_date: string;
  demande_devis: boolean;
  Description: string;
  /** Vide pour une prescription envoyée par un médecin. */
  patient_id: number | null;
  /** Établissement destinataire, statut et réponse (null : prescription antérieure). */
  submission: SubmissionInfo | null;
}

export interface PrescriptionCreatePayload {
  tenant_id: number;
  audience: SubmissionAudience;
  /** Médecin prescripteur (espace patient ; repris du profil pour un médecin). */
  NameDoctor?: string;
  OrdreDoctor?: string;
  /** Patient concerné (espace médecin). */
  patient_name?: string;
  Description?: string;
  demande_devis?: boolean;
  file?: File | null;
}

export interface PrescriptionWithImage extends Prescription {
  imageUrl?: SafeUrl | string | null;
  imageLoading?: boolean;
  imageError?: boolean;
}

export interface PrescriptionDevis {
  prescription_id: number;
  montant?: number;
  details?: string;
  [key: string]: unknown;
}