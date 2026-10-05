/** GET /doctors/informations/{id} */
export interface DoctorProfile {
  id: number;
  DoctorNO: string | null;
  DoctorName: string | null;
  DoctorLastname: string | null;
  DoctorFederationID: string | null;
  user: number;
  DoctorPhone: string | null;
  DoctorPhone2: string | null;
  DoctorEmail: string | null;
  DoctorNat: string | null;
  DoctorCNI: string | null;
  DoctorPOB: string | null;
  CreatedAt: string | null;
  ModifiedAt: string | null;
  DoctorDOB: string | null;
  Speciality: string | null;
  doctor_is_confirmed: boolean;
  CodeIdentification: string | null;
  DoctorGender: string | null;
}

/** PUT /doctors/update/{id} */
export interface DoctorUpdatePayload {
  DoctorName: string;
  DoctorLastname: string;
  DoctorDOB: string;
  DoctorPOB: string;
  DoctorCNI: string;
  DoctorPhone: string;
  DoctorPhone2: string;
  DoctorEmail: string;
}
