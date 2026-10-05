export interface CurrentUser {
    id: number;
    nom: string;
    prenom: string;
    doctor_id: number | null;
    patient_id: number | null;
    email: string;
    token: string;
    matricule: string;
    roles: Array<string>;

}