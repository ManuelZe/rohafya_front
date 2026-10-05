export interface PatientProfile {
  id: number;
  PatientFederationID: string | null;
  PatientNO: string | null;
  PatientName: string | null;
  PatientLastname: string | null;
  PatientPhone: string | null;
  PatientPhone2: string | null;
  PatientEmail: string | null;
  PatientNat: string | null;
  PatientCNI: string | null;
  PatientPOB: string | null;
  CreatedAt: string | null;
  ModifiedAt: string | null;
  PatientDOB: string | null;
  PatientGender: string | null;
  user_id: number;
  patient_is_confirmed: boolean;
}

export interface PatientUpdatePayload {
  PatientName: string;
  PatientLastname: string;
  PatientDOB: string;
  PatientPOB: string;
  PatientNat: string;
  PatientCNI: string;
  PatientGender: string;
  PatientPhone: string;
  PatientPhone2: string;
  PatientEmail: string;
}
