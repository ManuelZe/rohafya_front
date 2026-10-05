export interface DoctorInfo {
  id: number;
  DoctorNO: string | null;
  DoctorName: string | null;
  DoctorLastname: string | null;
  DoctorFederationID: string | null;
  DoctorEmail: string | null;
  Speciality: string | null;
  doctor_is_confirmed: boolean;
}
