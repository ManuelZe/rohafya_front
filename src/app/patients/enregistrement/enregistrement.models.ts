import { SafeUrl } from '@angular/platform-browser';

export interface SavePatient {
  id: number;
  nom: string;
  prenom: string;
  description: string;
  patient_id: number;
  Create_date: string;
  validated: boolean;
  validated_by: number | null;
  validated_at: string | null;
}

export interface SavePatientCreatePayload {
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
