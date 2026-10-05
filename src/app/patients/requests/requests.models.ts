export interface UserRequest {
  id?: number;
  CreatedAt?: string;
  CreatedBy?: string | null;
  UpdatedAt?: string | null;
  UpdatedBy?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  message?: string;
  administration?: boolean;
  commission?: boolean;
  connection?: boolean;
  error?: boolean;
  etat_patient?: boolean;
  patient_request_connexion?: boolean;
  patient_request_examen_out?: boolean;
  patient_request_other_administration?: boolean;
  patient_request_prix_examen?: boolean;
  revendication_examen?: boolean;
  suggestion?: boolean;
  valide?: boolean;
}