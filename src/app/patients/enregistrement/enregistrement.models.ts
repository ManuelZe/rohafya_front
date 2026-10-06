import { SafeUrl } from '@angular/platform-browser';
import { SubmissionAudience, SubmissionInfo } from '../../shared/submission/submission.models';

export interface SavePatient {
  id: number;
  nom: string;
  prenom: string;
  description: string;
  /** Vide pour un pré-enregistrement fait par un médecin. */
  patient_id: number | null;
  Create_date: string;
  validated: boolean;
  validated_by: number | null;
  validated_at: string | null;
  /** Établissement destinataire, statut et réponse (null : pré-enregistrement antérieur). */
  submission: SubmissionInfo | null;
}

export interface SavePatientCreatePayload {
  tenant_id: number;
  audience: SubmissionAudience;
  nom: string;
  prenom: string;
  description?: string;
  file?: File | null;
}

export interface SavePatientWithImage extends SavePatient {
  imageUrl?: SafeUrl | string | null;
  imageLoading?: boolean;
  imageError?: boolean;
}
