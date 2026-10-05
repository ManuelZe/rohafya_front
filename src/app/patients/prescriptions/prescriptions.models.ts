import { SafeUrl } from '@angular/platform-browser';

export interface Prescription {
  id: number;
  NameDoctor: string;
  OrdreDoctor: string;
  Sequence: string;
  Create_date: string;
  demande_devis: boolean;
  Description: string;
  patient_id: number;
}

export interface PrescriptionCreatePayload {
  NameDoctor: string;
  OrdreDoctor: string;
  Description?: string;
  patient_id: number;
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